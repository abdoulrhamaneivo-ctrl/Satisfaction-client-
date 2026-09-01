// src/server/rateLimit.ts
// ============================================================================
// Rate limiting mémoire pour les endpoints publics (collecte QR).
// Token bucket par clé (IP + guichet). Process-local : suffisant pour une
// instance Node ; si scaling horizontal, passer à Redis (même interface).
// Principe : ne JAMAIS bloquer les réseaux mobiles/NAT légitimes — les
// limites sont généreuses par IP, strictes par (IP, guichet).
// ============================================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Nettoyage périodique des buckets inactifs (anti-fuite mémoire)
const BUCKET_TTL_MS = 30 * 60 * 1000; // 30 min d'inactivité → supprimé
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.lastRefill > BUCKET_TTL_MS) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

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
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: opts.capacity, lastRefill: now };
    buckets.set(key, bucket);
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
    return { allowed: false, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Extrait l'IP réelle du contexte Wasp ( Railway met l'IP client dans
 * x-forwarded-for, première entrée de la liste).
 */
export function extraireIp(context: any): string {
  const req = context?.req ?? context?.request;
  const fwd = req?.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress ?? 'inconnue';
}
