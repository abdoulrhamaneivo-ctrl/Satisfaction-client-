export interface RateLimitStore {
    /** Récupère le bucket ou le crée. Clé arbitraire, valeur opaque. */
    get(key: string): Promise<{
        tokens: number;
        lastRefill: number;
    } | undefined>;
    set(key: string, bucket: {
        tokens: number;
        lastRefill: number;
    }): Promise<void>;
    /** Supprime les clés inactives (anti-fuite mémoire). */
    purge(inactifDepuisMs: number): Promise<void>;
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
export declare function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult>;
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
export declare function nombreDeProxysDeConfiance(): number | boolean;
/**
 * IP réelle du client, lue via Express (donc en tenant compte de
 * `trust proxy`). Repli sur le socket si Express n'a rien résolu.
 *
 * Ne JAMAIS lire `x-forwarded-for` en dehors d'ici : c'est la seule
 * fonction qui sait combien de proxys sont déclarés de confiance.
 */
export declare function extraireIp(context: any): string;
/**
 * Même résolution, pour une requête Express nue (middleware).
 * Évite d'avoir une deuxième lecture de `x-forwarded-for` qui diverge.
 */
export declare function extraireIpDeRequete(req: any): string;
//# sourceMappingURL=rateLimit.d.ts.map