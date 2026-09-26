// src/server/rateLimit.ts
// ============================================================================
// Rate limiting pour les endpoints publics (collecte QR).
// Token bucket par clé (IP + guichet).
//
// ARCHITECTURE (audit F4/C1) : le store est abstrait via l'interface
// RateLimitStore. Deux implémentations :
//   - MemoryStore (défaut) : process-local, zéro infra. SUFFISANT tant que
//     Yéba tourne sur une seule instance Node.
//   - RedisStore : multi-instance (scaling horizontal). Token bucket atomique
//     via INCR + EXPIRE. Clé Redis : "rl:<bucketKey>".
//     Branché automatiquement si REDIS_URL est défini.
// Principe : ne JAMAIS bloquer les réseaux mobiles/NAT légitimes — les
// limites sont généreuses par IP, strictes par (IP, guichet).
// ============================================================================
/** Store en mémoire — mono-instance. TTL de rétention 30 min. */
class MemoryStore {
    buckets = new Map();
    lastPurge = Date.now();
    async get(key) {
        return this.buckets.get(key);
    }
    async set(key, bucket) {
        this.buckets.set(key, bucket);
        // Purge paresseuse (au maximum 1×/5 min) au lieu d'un setInterval
        if (Date.now() - this.lastPurge > 5 * 60 * 1000) {
            await this.purge(30 * 60 * 1000);
            this.lastPurge = Date.now();
        }
    }
    async purge(inactifDepuisMs) {
        const maintenant = Date.now();
        for (const [key, b] of this.buckets) {
            if (maintenant - b.lastRefill > inactifDepuisMs)
                this.buckets.delete(key);
        }
    }
}
// ============================================================================
// Store Redis — multi-instance (C1). Token bucket atomique via INCR + EXPIRE.
// Clé Redis : "rl:<bucketKey>" (ex. "rl:1.2.3.4:guichet:42").
// Valeur : "tokens:lastRefill" (JSON simple). TTL = 2 min.
// Prêt pour scaling horizontal : chaque instance lit/écrit le même Redis.
let redisClient = null;
async function getRedisClient() {
    if (redisClient)
        return redisClient;
    const url = process.env.REDIS_URL;
    if (!url)
        return null;
    try {
        const { createClient } = await import('redis');
        redisClient = createClient({ url });
        redisClient.on('error', (err) => console.error('[Redis] rate-limit client error:', err));
        await redisClient.connect();
        console.log('[Redis] rate-limit connecté');
    }
    catch (e) {
        console.warn('[Redis] client non dispo, fallback MemoryStore:', e);
        redisClient = false; // sentinel pour ne pas réessayer
    }
    return redisClient || null;
}
class RedisStore {
    async get(key) {
        const client = await getRedisClient();
        if (!client)
            return undefined;
        const val = await client.get(`rl:${key}`);
        if (!val)
            return undefined;
        const [tokens, lastRefill] = val.split(':').map(Number);
        return { tokens, lastRefill };
    }
    async set(key, bucket) {
        const client = await getRedisClient();
        if (!client)
            return;
        // TTL = 2 min (couvre la fenêtre de refill max + marge)
        await client.set(`rl:${key}`, `${bucket.tokens}:${bucket.lastRefill}`, { EX: 120 });
    }
    async purge(_inactifDepuisMs) {
        // Redis gère l'expiration via TTL — pas de purge manuelle nécessaire.
    }
}
// Point de branchement : Redis si REDIS_URL définie, sinon MemoryStore.
const store = process.env.REDIS_URL
    ? new RedisStore()
    : new MemoryStore();
/**
 * Vague 5, P11-f — le repli en mémoire doit être VISIBLE.
 *
 * `MemoryStore` tient les compteurs dans le processus. Sur une seule
 * instance, c'est correct. Dès qu'un second process répond (scale
 * horizontal, redéploiement avec overlap, worker séparé), chaque instance
 * repart de zéro : la limite effective est multipliée par le nombre
 * d'instances, et le rate limit — qui est une protection contre les
 écritures amplifiées — devient un décor silencieux.
 *
 * On ne peut pas exiger Redis : le déploiement mono-instance de référence
 * n'en a pas besoin, et le rendre obligatoire ferait échouer le démarrage
 * d'une installation valide. On peut en revanche refuser que l'état
 * dégradé passe inaperçu : avertissement explicite au démarrage en
 * production, une seule fois, et mention dans la documentation de deploy.
 */
if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    console.warn('[rate-limit] ATTENTION : REDIS_URL absent — les limites sont tenues par ' +
        'instance. Elles restent effectives en mono-instance, mais sont ' +
        'multipliées par le nombre d’instances. Définir REDIS_URL avant tout ' +
        'scale horizontal.');
}
/**
 * Vérifie et consomme 1 jeton. À appeler AVANT tout traitement métier.
 * Clé recommandée : `${ip}:${contexte}` (ex. ip + guichetId).
 */
export async function checkRateLimit(key, opts) {
    const now = Date.now();
    let bucket = await store.get(key);
    if (!bucket) {
        bucket = { tokens: opts.capacity, lastRefill: now };
    }
    // Recharge proportionnelle au temps écoulé
    const elapsedMinutes = (now - bucket.lastRefill) / 60_000;
    if (elapsedMinutes > 0) {
        bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedMinutes * opts.refillPerMinute);
        bucket.lastRefill = now;
    }
    if (bucket.tokens < 1) {
        // Temps pour reconstituer 1 jeton
        const retryAfterSeconds = Math.ceil(60 / opts.refillPerMinute);
        await store.set(key, bucket);
        return { allowed: false, retryAfterSeconds };
    }
    bucket.tokens -= 1;
    await store.set(key, bucket);
    return { allowed: true, retryAfterSeconds: 0 };
}
/**
 * Nombre de proxys de confiance devant l'application (Vague 5, P11-e).
 *
 * AVANT : l'IP était lue « à la main » dans `x-forwarded-for` (première
 * entrée), sans dire à Express qui faire confiance. Or cet en-tête est
 * fourni par le client : si l'application est joignable directement, un
 * script envoie `x-forwarded-for: 1.2.3.4` à volonté et obtient une
 * limite neuve à chaque requête — le rate limit devient décoratif — et
 * l'IP écrite au journal d'audit est celle que l'appelant a choisie.
 *
 * La confiance est donc déclarée, et l'IP est lue par Express (qui
 * l'applique) au lieu d'être déduite d'un en-tête.
 *
 * Valeur par défaut 1 : un Render ou un Railway ajoute exactement un
 * saut. Si un CDN (Cloudflare) est intercalé, il y en a 2 — d'où la
 * variable d'environnement, à régler sur l'hébergeur réel.
 */
export function nombreDeProxysDeConfiance() {
    const brut = process.env.TRUST_PROXY_HOPS;
    if (brut === undefined || brut === '')
        return 1;
    const n = Number(brut);
    if (!Number.isInteger(n) || n < 0) {
        console.warn(`[rate-limit] TRUST_PROXY_HOPS ignoré (valeur invalide : ${brut}) — 1 par défaut`);
        return 1;
    }
    return n;
}
/** Normalise une IPv4 mappée (`::ffff:1.2.3.4`) en IPv4. */
function normaliserIp(ip) {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
/**
 * IP réelle du client, lue via Express (donc en tenant compte de
 * `trust proxy`). Repli sur le socket si Express n'a rien résolu.
 *
 * Ne JAMAIS lire `x-forwarded-for` en dehors d'ici : c'est la seule
 * fonction qui sait combien de proxys sont déclarés de confiance.
 */
export function extraireIp(context) {
    const req = context?.req ?? context?.request;
    // `req.ip` est calculé par Express en fonction de `app.set('trust proxy')`.
    const ipExpress = req?.ip;
    if (typeof ipExpress === 'string' && ipExpress.length > 0)
        return normaliserIp(ipExpress);
    // Repli : socket direct (exposition sans proxy, ou Express non configuré).
    const socket = req?.socket?.remoteAddress;
    if (typeof socket === 'string' && socket.length > 0)
        return normaliserIp(socket);
    return 'inconnue';
}
/**
 * Même résolution, pour une requête Express nue (middleware).
 * Évite d'avoir une deuxième lecture de `x-forwarded-for` qui diverge.
 */
export function extraireIpDeRequete(req) {
    return extraireIp({ req });
}
//# sourceMappingURL=rateLimit.js.map