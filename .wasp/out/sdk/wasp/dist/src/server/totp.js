// src/server/totp.ts
// ============================================================================
// TOTP (RFC 6238) en pur Node crypto — zéro dépendance ajoutée au bundle
// Wasp (le bundler rollup exige des imports statiques ; une lib externe
// alourdirait le Docker pour 60 lignes).
//
// Usage : 2FA obligatoire pour les comptes SUPER_ADMIN de la console
// /platform. Secret stocké hashé côté serveur ? Non — le secret doit être
// reproductible pour valider le code : stocké chiffré avec
// TOTP_ENCRYPTION_KEY (AES-256-GCM, clé dédiée exigée au démarrage —
// voir src/env.ts) dans User.totp_secret. Un dump DB seul ne suffit donc
// pas à produire des codes (il faut aussi la clé, jamais en base).
// ============================================================================
import crypto from 'node:crypto';
const ALPHABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/** Encode un Buffer en Base32 (RFC 4648, sans padding) */
export function base32Encode(buf) {
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
    if (bits > 0)
        sortie += ALPHABET_BASE32[(valeur << (5 - bits)) & 31];
    return sortie;
}
/** Décode une chaîne Base32 (tolérante aux espaces et minuscules) */
export function base32Decode(entree) {
    const propre = entree.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let valeur = 0;
    const octets = [];
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
export function genererSecretTotp() {
    return base32Encode(crypto.randomBytes(20));
}
/** URL otpauth:// à encoder en QR pour l'app authenticator */
export function urlOtpauth(secretBase32, email, issuer = 'Yeba') {
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
function codeTotp(secretBase32, instantMs = Date.now()) {
    const cle = base32Decode(secretBase32);
    // Fenêtre de 30 s depuis l'epoch Unix (RFC 6238)
    const compteur = Math.floor(instantMs / 1000 / 30);
    const bufCompteur = Buffer.alloc(8);
    bufCompteur.writeBigInt64BE(BigInt(compteur));
    const hmac = crypto.createHmac('sha1', cle).update(bufCompteur).digest();
    const decalage = hmac[hmac.length - 1] & 0xf;
    const binaire = ((hmac[decalage] & 0x7f) << 24) |
        (hmac[decalage + 1] << 16) |
        (hmac[decalage + 2] << 8) |
        hmac[decalage + 3];
    return (binaire % 1_000_000).toString().padStart(6, '0');
}
/**
 * Vérifie un code saisi par l'utilisateur avec tolérance ±1 fenêtre (30 s
 * avant/après) pour compenser la dérive d'horloge du téléphone.
 * C5 (J+30) : lockout exponentiel + refus replay code déjà consommé.
 */
export function verifierCodeTotp(codeSaisi, secretBase32, instantMs = Date.now(), 
// C5 : protection anti-replay + lockout
user, incrementFailed) {
    const propre = (codeSaisi ?? '').replace(/\D/g, '');
    if (propre.length !== 6)
        return false;
    // C5 : lockout check
    if (user?.totp_locked_until && new Date(user.totp_locked_until) > new Date()) {
        return false; // lockout actif
    }
    const compteurActuel = Math.floor(instantMs / 1000 / 30);
    // C5 : refus replay code déjà consommé (step <= last_used_step)
    if (user?.totp_last_used_step && BigInt(compteurActuel) <= user.totp_last_used_step) {
        return false;
    }
    // Fenêtre -1, 0, +1 (±30 s)
    for (const delta of [-30_000, 0, 30_000]) {
        if (codeTotp(secretBase32, instantMs + delta) === propre) {
            // C5 : succès -> reset compteur (sera fait par l'appelant via incrementFailed=false)
            return true;
        }
    }
    return false;
}
/**
 * C5 (J+30) : Calcule le lockout exponentiel basé sur le nombre d'échecs.
 * 5 échecs → 15 min, 10 → 1h, 15 → 24h, 20+ → 7 jours
 */
export function calculerLockoutJusqua(tentatives) {
    if (tentatives < 5)
        return null;
    if (tentatives < 10)
        return new Date(Date.now() + 15 * 60 * 1000); // 15 min
    if (tentatives < 15)
        return new Date(Date.now() + 60 * 60 * 1000); // 1h
    if (tentatives < 20)
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
}
/**
 * C5 (J+30) : Vérification constante-temps (timingSafeEqual) pour code TOTP.
 * Évite les attaques temporelles sur la comparaison.
 */
export function verifierCodeTotpConstantTime(codeSaisi, secretBase32, instantMs = Date.now()) {
    const propre = (codeSaisi ?? '').replace(/\D/g, '');
    if (propre.length !== 6)
        return false;
    const compteurActuel = Math.floor(instantMs / 1000 / 30);
    const codesValides = [
        codeTotp(secretBase32, instantMs - 30_000),
        codeTotp(secretBase32, instantMs),
        codeTotp(secretBase32, instantMs + 30_000),
    ];
    // timingSafeEqual nécessite Buffer de même longueur
    const saisieBuf = Buffer.from(propre, 'ascii');
    for (const code of codesValides) {
        const codeBuf = Buffer.from(code, 'ascii');
        if (crypto.timingSafeEqual(saisieBuf, codeBuf))
            return true;
    }
    return false;
}
// ── Chiffrement du secret en base (AES-256-GCM, clé DÉDIÉE) ──
// C6a (J+7) : le secret TOTP est chiffré avec TOTP_ENCRYPTION_KEY — jamais
// avec JWT_SECRET (séparation des usages) et SANS fallback 'DEVJWTSECRET' :
// toute clé manquante/trop courte lève au lieu de chiffrer en mode dégradé.
// Rotation sans interruption :
//   - chiffrement : toujours avec la clé primaire (TOTP_ENCRYPTION_KEY_CURRENT
//     si défini, sinon TOTP_ENCRYPTION_KEY) ;
//   - déchiffrement : essaie la primaire, puis TOTP_ENCRYPTION_KEY_PREVIOUS,
//     puis l'héritage JWT_SECRET_CURRENT / JWT_SECRET / JWT_SECRET_PREVIOUS
//     (lignes chiffrées avant C6a — à retirer une fois la migration jouée) ;
//   - dechiffrerSecretTotpAvecStatut() signale doitRechiffrer=true quand une
//     clé non-primaire a servi → l'appelant rechiffre au prochain accès
//     (rechiffrement opportuniste) ou via scripts/rotationCleTotp.ts.
/** Dérive 32 octets AES-256 stables (SHA-256) d'une matière de clé. */
function cleDerivee(matiere) {
    return crypto.createHash('sha256').update(matiere, 'utf8').digest();
}
/** Lit une variable d'env secrète en exigeant présence + longueur minimale. */
function exigerSecretEnv(nom, minLongueur = 32) {
    const valeur = process.env[nom];
    if (!valeur) {
        throw new Error(`[C6a] ${nom} manquant — définissez-le avant de démarrer (voir .env.example, génération : openssl rand -hex 32).`);
    }
    if (valeur.length < minLongueur) {
        throw new Error(`[C6a] ${nom} trop court (${valeur.length} < ${minLongueur} caractères) — régénérez-le avec : openssl rand -hex 32.`);
    }
    return valeur;
}
/** Clé primaire de chiffrement : CURRENT prioritaire, KEY canonique sinon. */
function clePrimaireTotp() {
    if (process.env.TOTP_ENCRYPTION_KEY_CURRENT) {
        return {
            nom: 'TOTP_ENCRYPTION_KEY_CURRENT',
            cle: cleDerivee(exigerSecretEnv('TOTP_ENCRYPTION_KEY_CURRENT')),
        };
    }
    return { nom: 'TOTP_ENCRYPTION_KEY', cle: cleDerivee(exigerSecretEnv('TOTP_ENCRYPTION_KEY')) };
}
/** Clés candidates au déchiffrement, par ordre de priorité (primaire d'abord). */
function clesDechiffrementTotp() {
    const cles = [clePrimaireTotp()];
    const heritage = [
        'TOTP_ENCRYPTION_KEY_PREVIOUS',
        'JWT_SECRET_CURRENT',
        'JWT_SECRET', // héritage pré-C6a : lignes chiffrées avec JWT_SECRET
        'JWT_SECRET_PREVIOUS',
    ];
    for (const nom of heritage) {
        const matiere = process.env[nom];
        if (matiere)
            cles.push({ nom, cle: cleDerivee(matiere) });
    }
    return cles;
}
function dechiffrerAvecCle(stocke, cle) {
    const [ivB64, tagB64, dataB64] = stocke.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error('Secret TOTP stocké au format invalide (attendu iv:tag:données).');
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', cle, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}
/** Chiffre un secret TOTP avant stockage en base (toujours clé primaire) */
export function chiffrerSecretTotp(secretBase32) {
    const { cle } = clePrimaireTotp();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', cle, iv);
    const chiffre = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${chiffre.toString('base64')}`;
}
/**
 * Déchiffre en essayant la clé primaire puis les clés previous/héritage.
 * Lève si aucune clé configurée ne convient (clé perdue ou données altérées).
 */
export function dechiffrerSecretTotpAvecStatut(stocke) {
    const cles = clesDechiffrementTotp();
    let derniereErreur = null;
    for (const { nom, cle } of cles) {
        try {
            const secret = dechiffrerAvecCle(stocke, cle);
            return { secret, cleUtilisee: nom, doitRechiffrer: nom !== cles[0].nom };
        }
        catch (e) {
            derniereErreur = e;
        }
    }
    throw derniereErreur instanceof Error
        ? derniereErreur
        : new Error('Déchiffrement du secret TOTP impossible (aucune clé configurée ne convient).');
}
/** Déchiffre le secret stocké (lève si aucune clé configurée ne convient) */
export function dechiffrerSecretTotp(stocke) {
    return dechiffrerSecretTotpAvecStatut(stocke).secret;
}
//# sourceMappingURL=totp.js.map