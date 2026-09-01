// src/server/rateLimit.ts
// ============================================================================
// Rate limiting pour les endpoints publics (collecte QR).
// Token bucket par clé (IP + guichet).
//
// ARCHITECTURE (audit F4) : le store est abstrait via l'interface
// RateLimitStore. Deux implémentations :
//   - MemoryStore (défaut) : process-local, zéro infra. SUFFISANT tant que
//     Yéba tourne sur une seule instance Node.
//   - RedisStore : prêt à brancher le jour du scaling horizontal — il suffit
//     d'installer le client redis, de définir REDIS_URL et de fournir
//     l'implémentation (voir commentaire en bas). AUCUN code appelant à
//     modifier : checkRateLimit et extraireIp restent identiques.
//
// Principe : ne JAMAIS bloquer les réseaux mobiles/NAT légitimes — les
// limites sont généreuses par IP, strictes par (IP, guichet).
// ============================================================================

export interface RateLimitStore {
  /** Récupère le bucket ou le crée. Clé arbitraire, valeur opaque. */
  get(key: string): { tokens: number; lastRefill: number } | undefined;
  set(key: string, bucket: { tokens: number; lastRefill: number }): void;
  /** Supprime les clés inactives (anti-fuite mémoire). */
  purge(inactifDepuisMs: number): void;
}

/** Store en mémoire — mono-instance. TTL de rétention 30 min. */
class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private lastPurge = Date.now();

  get(key: string) {
    return this.buckets.get(key);
  }
  set(key: string, bucket: { tokens: number; lastRefill: number }) {
    this.buckets.set(key, bucket);
    // Purge paresseuse (au maximum 1×/5 min) au lieu d'un setInterval
    if (Date.now() - this.lastPurge > 5 * 60 * 1000) {
      this.purge(30 * 60 * 1000);
      this.lastPurge = Date.now();
    }
  }
  purge(inactifDepuisMs: number) {
    const maintenant = Date.now();
    for (const [key, b] of this.buckets) {
      if (maintenant - b.lastRefill > inactifDepuisMs) this.buckets.delete(key);
    }
  }
}

// Point de branchement Redis (F4) : quand le scaling l'imposera, créer
// RedisStore implémentant RateLimitStore avec les commandes atomiques
// INCR + EXPIRE (pattern « token bucket Redis »), puis :
//   const store: RateLimitStore = process.env.REDIS_URL ? new RedisStore() : new MemoryStore();
const store: RateLimitStore = new MemoryStore();

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
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);
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
    store.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  store.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Extrait l'IP réelle du contexte Wasp. Railway met l'IP client dans
 * x-forwarded-for (première entrée). PRÉCAUTION (audit §7) : cet en-tête n'est
 * fiable QUE derrière un reverse proxy de confiance qui ÉCRASE les en-têtes
 * client — c'est le cas de Railway. Si Yéba est un jour exposé directement,
 * passer au socket.remoteAddress.
 */
export function extraireIp(context: any): string {
  const req = context?.req ?? context?.request;
  const fwd = req?.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress ?? 'inconnue';
}
