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
 */
export declare function verifierCodeTotp(codeSaisi: string, secretBase32: string, instantMs?: number): boolean;
/** Chiffre un secret TOTP avant stockage en base */
export declare function chiffrerSecretTotp(secretBase32: string): string;
/** Déchiffre le secret stocké (lève si JWT_SECRET a changé) */
export declare function dechiffrerSecretTotp(stocke: string): string;
//# sourceMappingURL=totp.d.ts.map