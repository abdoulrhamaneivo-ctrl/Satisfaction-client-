// src/server/totp.ts
// ============================================================================
// TOTP (RFC 6238) en pur Node crypto — zéro dépendance ajoutée au bundle
// Wasp (le bundler rollup exige des imports statiques ; une lib externe
// alourdirait le Docker pour 60 lignes).
//
// Usage : 2FA obligatoire pour les comptes SUPER_ADMIN de la console
// /platform. Secret stocké hashé côté serveur ? Non — le secret doit être
// reproductible pour valider le code : stocké chiffré avec JWT_SECRET
// (AES-256-GCM) dans User.totp_secret. Un dump DB seul ne suffit donc pas
// à produire des codes (il faut aussi JWT_SECRET, jamais en base).
// ============================================================================

import crypto from 'node:crypto';

const ALPHABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode un Buffer en Base32 (RFC 4648, sans padding) */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let valeur = 0;
  let sortie = '';
  for (const octet of buf) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      sortie += ALPHABET_BASE32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += ALPHABET_BASE32[(valeur << (5 - bits)) & 31];
  return sortie;
}

/** Décode une chaîne Base32 (tolérante aux espaces et minuscules) */
export function base32Decode(entree: string): Buffer {
  const propre = entree.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let valeur = 0;
  const octets: number[] = [];
  for (const c of propre) {
    valeur = (valeur << 5) | ALPHABET_BASE32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(octets);
}

/** Génère un secret TOTP (20 octets = 160 bits, standard) encodé Base32 */
export function genererSecretTotp(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** URL otpauth:// à encoder en QR pour l'app authenticator */
export function urlOtpauth(secretBase32: string, email: string, issuer = 'Yeba'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Code TOTP 6 chiffres pour un instant donné (défaut : maintenant) */
function codeTotp(secretBase32: string, instantMs: number = Date.now()): string {
  const cle = base32Decode(secretBase32);
  // Fenêtre de 30 s depuis l'epoch Unix (RFC 6238)
  const compteur = Math.floor(instantMs / 1000 / 30);
  const bufCompteur = Buffer.alloc(8);
  bufCompteur.writeBigInt64BE(BigInt(compteur));
  const hmac = crypto.createHmac('sha1', cle).update(bufCompteur).digest();
  const decalage = hmac[hmac.length - 1] & 0xf;
  const binaire =
    ((hmac[decalage] & 0x7f) << 24) |
    (hmac[decalage + 1] << 16) |
    (hmac[decalage + 2] << 8) |
    hmac[decalage + 3];
  return (binaire % 1_000_000).toString().padStart(6, '0');
}

/**
 * Vérifie un code saisi par l'utilisateur avec tolérance ±1 fenêtre (30 s
 * avant/après) pour compenser la dérive d'horloge du téléphone.
 */
export function verifierCodeTotp(
  codeSaisi: string,
  secretBase32: string,
  instantMs: number = Date.now()
): boolean {
  const propre = (codeSaisi ?? '').replace(/\D/g, '');
  if (propre.length !== 6) return false;
  // Fenêtre -1, 0, +1 (±30 s)
  for (const delta of [-30_000, 0, 30_000]) {
    if (codeTotp(secretBase32, instantMs + delta) === propre) return true;
  }
  return false;
}

// ── Chiffrement du secret en base (AES-256-GCM, clé dérivée de JWT_SECRET) ──

const cleChiffrement = (): Buffer =>
  crypto.createHash('sha256')
    .update(process.env.JWT_SECRET || 'DEVJWTSECRET')
    .digest();

/** Chiffre un secret TOTP avant stockage en base */
export function chiffrerSecretTotp(secretBase32: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cleChiffrement(), iv);
  const chiffre = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${chiffre.toString('base64')}`;
}

/** Déchiffre le secret stocké (lève si JWT_SECRET a changé) */
export function dechiffrerSecretTotp(stocke: string): string {
  const [ivB64, tagB64, dataB64] = stocke.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    cleChiffrement(),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
