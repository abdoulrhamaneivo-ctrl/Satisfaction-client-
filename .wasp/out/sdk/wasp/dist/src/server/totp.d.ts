/** Encode un Buffer en Base32 (RFC 4648, sans padding) */
export declare function base32Encode(buf: Buffer): string;
/** Décode une chaîne Base32 (tolérante aux espaces et minuscules) */
export declare function base32Decode(entree: string): Buffer;
/** Génère un secret TOTP (20 octets = 160 bits, standard) encodé Base32 */
export declare function genererSecretTotp(): string;
/** URL otpauth:// à encoder en QR pour l'app authenticator */
export declare function urlOtpauth(secretBase32: string, email: string, issuer?: string): string;
/**
 * Vérifie un code saisi par l'utilisateur avec tolérance ±1 fenêtre (30 s
 * avant/après) pour compenser la dérive d'horloge du téléphone.
 * C5 (J+30) : lockout exponentiel + refus replay code déjà consommé.
 */
export declare function verifierCodeTotp(codeSaisi: string, secretBase32: string, instantMs?: number, user?: {
    totp_failed_attempts?: number | null;
    totp_locked_until?: Date | null;
    totp_last_used_step?: bigint | null;
}, incrementFailed?: () => Promise<void>): boolean;
/**
 * C5 (J+30) : Calcule le lockout exponentiel basé sur le nombre d'échecs.
 * 5 échecs → 15 min, 10 → 1h, 15 → 24h, 20+ → 7 jours
 */
export declare function calculerLockoutJusqua(tentatives: number): Date | null;
/**
 * C5 (J+30) : Vérification constante-temps (timingSafeEqual) pour code TOTP.
 * Évite les attaques temporelles sur la comparaison.
 */
export declare function verifierCodeTotpConstantTime(codeSaisi: string, secretBase32: string, instantMs?: number): boolean;
/** Chiffre un secret TOTP avant stockage en base (toujours clé primaire) */
export declare function chiffrerSecretTotp(secretBase32: string): string;
export interface StatutDechiffrementTotp {
    secret: string;
    /** Nom de la variable d'env dont la clé a servi au déchiffrement. */
    cleUtilisee: string;
    /** true si une clé non-primaire a servi → rechiffrer avec la primaire. */
    doitRechiffrer: boolean;
}
/**
 * Déchiffre en essayant la clé primaire puis les clés previous/héritage.
 * Lève si aucune clé configurée ne convient (clé perdue ou données altérées).
 */
export declare function dechiffrerSecretTotpAvecStatut(stocke: string): StatutDechiffrementTotp;
/** Déchiffre le secret stocké (lève si aucune clé configurée ne convient) */
export declare function dechiffrerSecretTotp(stocke: string): string;
//# sourceMappingURL=totp.d.ts.map