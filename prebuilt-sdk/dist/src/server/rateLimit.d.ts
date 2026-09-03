export interface RateLimitStore {
    /** Récupère le bucket ou le crée. Clé arbitraire, valeur opaque. */
    get(key: string): {
        tokens: number;
        lastRefill: number;
    } | undefined;
    set(key: string, bucket: {
        tokens: number;
        lastRefill: number;
    }): void;
    /** Supprime les clés inactives (anti-fuite mémoire). */
    purge(inactifDepuisMs: number): void;
}
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
export declare function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult;
/**
 * Extrait l'IP réelle du contexte Wasp. Railway met l'IP client dans
 * x-forwarded-for (première entrée). PRÉCAUTION (audit §7) : cet en-tête n'est
 * fiable QUE derrière un reverse proxy de confiance qui ÉCRASE les en-têtes
 * client — c'est le cas de Railway. Si Yéba est un jour exposé directement,
 * passer au socket.remoteAddress.
 */
export declare function extraireIp(context: any): string;
//# sourceMappingURL=rateLimit.d.ts.map