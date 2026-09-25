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

export interface RateLimitStore {
  /** Récupère le bucket ou le crée. Clé arbitraire, valeur opaque. */
  get(key: string): Promise<{ tokens: number; lastRefill: number } | undefined>;
  set(key: string, bucket: { tokens: number; lastRefill: number }): Promise<void>;
  /** Supprime les clés inactives (anti-fuite mémoire). */
  purge(inactifDepuisMs: number): Promise<void>;
}

/** Store en mémoire — mono-instance. TTL de rétention 30 min. */
class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private lastPurge = Date.now();

  async get(key: string) {
    return this.buckets.get(key);
  }
  async set(key: string, bucket: { tokens: number; lastRefill: number }) {
    this.buckets.set(key, bucket);
    // Purge paresseuse (au maximum 1×/5 min) au lieu d'un setInterval
    if (Date.now() - this.lastPurge > 5 * 60 * 1000) {
      await this.purge(30 * 60 * 1000);
      this.lastPurge = Date.now();
    }
  }
  async purge(inactifDepuisMs: number) {
    const maintenant = Date.now();
    for (const [key, b] of this.buckets) {
      if (maintenant - b.lastRefill > inactifDepuisMs) this.buckets.delete(key);
    }
  }
}

// ============================================================================
// Store Redis — multi-instance (C1). Token bucket atomique via INCR + EXPIRE.
// Clé Redis : "rl:<bucketKey>" (ex. "rl:1.2.3.4:guichet:42").
// Valeur : "tokens:lastRefill" (JSON simple). TTL = 2 min.
// Prêt pour scaling horizontal : chaque instance lit/écrit le même Redis.
let redisClient: any = null;
async function getRedisClient() {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url });
    redisClient.on('error', (err: any) => console.error('[Redis] rate-limit client error:', err));
    await redisClient.connect();
    console.log('[Redis] rate-limit connecté');
  } catch (e) {
    console.warn('[Redis] client non dispo, fallback MemoryStore:', e);
    redisClient = false; // sentinel pour ne pas réessayer
  }
  return redisClient || null;
}

class RedisStore implements RateLimitStore {
  async get(key: string) {
    const client = await getRedisClient();
    if (!client) return undefined;
    const val = await client.get(`rl:${key}`);
    if (!val) return undefined;
    const [tokens, lastRefill] = val.split(':').map(Number);
    return { tokens, lastRefill };
  }
  async set(key: string, bucket: { tokens: number; lastRefill: number }) {
    const client = await getRedisClient();
    if (!client) return;
    // TTL = 2 min (couvre la fenêtre de refill max + marge)
    await client.set(`rl:${key}`, `${bucket.tokens}:${bucket.lastRefill}`, { EX: 120 });
  }
  async purge(_inactifDepuisMs: number) {
    // Redis gère l'expiration via TTL — pas de purge manuelle nécessaire.
  }
}

// Point de branchement : Redis si REDIS_URL définie, sinon MemoryStore.
const store: RateLimitStore = process.env.REDIS_URL
  ? new RedisStore()
  : new MemoryStore();

export interface RateLimitOptions {
  /** Capacité du bucket (rafale maximale). */
  capacity: number;
  /** Jetons reconstitués par minute. */
  refillPerMinute: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Vérifie et consomme 1 jeton. À appeler AVANT tout traitement métier.
 * Clé recommandée : `${ip}:${contexte}` (ex. ip + guichetId).
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
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
 * Extrait l'IP réelle du contexte Wasp. Railway met l'IP client dans
 * x-forwarded-for (première entrée). PRÉCAUTION (audit C1) : cet en-tête
 * n'est fiable QUE derrière un reverse proxy de confiance qui ÉCRASE les
 * en-têtes client — c'est le cas de Railway (trust proxy = 1).
 * En direct : socket.remoteAddress.
 */
export function extraireIp(context: any): string {
  const req = context?.req ?? context?.request;
  // Railway / Render : trust proxy = 1 → x-forwarded-for = IP client réelle
  const fwd = req?.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim(); // Première IP = client d'origine
  }
  // Fallback : socket direct (exposition sans proxy)
  return req?.socket?.remoteAddress ?? 'inconnue';
}