// src/server/validation.ts
// ============================================================================
// Validation & sanitisation centralisée (C2, C3).
// Point d'entrée UNIQUE pour toutes les entrées externes.
// ============================================================================
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';
import crypto from 'node:crypto';
import { HttpError } from 'wasp/server';
import * as z from 'zod';
/**
 * Valide rawArgs contre un schéma Zod, sinon HttpError 400.
 * Restauré (était supprimé par erreur) : utilisé par file-upload/operations
 * et user/accountsActions.
 */
export function ensureArgsSchemaOrThrowHttpError(schema, rawArgs) {
    const parseResult = schema.safeParse(rawArgs);
    if (!parseResult.success) {
        console.error(new Error('Operation arguments validation failed:\n' +
            z.prettifyError(parseResult.error), { cause: parseResult.error }));
        throw new HttpError(400, 'Operation arguments validation failed', {
            cause: parseResult.error,
        });
    }
    return parseResult.data;
}
/** Normalise un téléphone vers E.164 CI (+225XXXXXXXXXX). Lève si invalide. */
export function normaliserTelephoneE164(tel) {
    const brut = tel.trim();
    if (!brut)
        throw new Error('Téléphone vide');
    const parsed = parsePhoneNumberFromString(brut, 'CI');
    if (!parsed || !isValidPhoneNumber(parsed.number, 'CI')) {
        throw new Error('Numéro invalide pour la Côte d\'Ivoire');
    }
    return parsed.format('E.164'); // ex. +2250700000000
}
/** Valide et normalise un commentaire : texte brut, max 1000 car., sans HTML/JS. */
export const MAX_LONGUEUR_COMMENTAIRE = 1000;
export function sanitiserCommentaire(txt) {
    const brut = txt.trim();
    if (!brut)
        return '';
    if (brut.length > MAX_LONGUEUR_COMMENTAIRE) {
        // Vague 5, P11 : `Error` ordinaire levée depuis une fonction de
        // validation. Appelée HORS du try/catch qui traduit en HttpError, elle
        // remontait jusqu'au wrapper de `soumettreAvis`, qui répondait 500
        // « réessayez plus tard » pour une faute de frappe du client — le
        // message ne disait rien et la reprise automatique ne pouvait pas
        // distinguer une erreur réseau d'un commentaire trop long.
        // `ValiderEntreeErreur` porte un code 4xx : voir `verserErreurClient`.
        throw new ValiderEntreeErreur(`Commentaire trop long (max ${MAX_LONGUEUR_COMMENTAIRE} caractères)`);
    }
    // Strip tags & scripts basique (défense en profondeur, le front n'envoie que du texte)
    return brut
        .replace(/<[^>]*>/g, '') // strip HTML tags
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // strip control chars
}
/**
 * Erreur de saisie du client (Vague 5, P11).
 *
 * Se distingue d'une panne : elle mérite un 4xxactionnable, pas un 500.
 * Toute validation de contenu qui doit être rattrapée par le wrapper
 * d'action devrait lever ce type plutôt qu'un `Error` nu.
 */
export class ValiderEntreeErreur extends Error {
    code = 'ENTREE_INVALIDE';
    constructor(message) {
        super(message);
        this.name = 'ValiderEntreeErreur';
    }
}
/** Traduit une erreur de validation en `HttpError` 4xx, ou la laisse passer. */
export function versHttpSiEntreeInvalide(error) {
    return error instanceof ValiderEntreeErreur
        ? new HttpError(400, error.message)
        : null;
}
/** Échappe une cellule CSV (RFC 4180) : guillemets doublés, préfixe ' pour formules. */
export function escapeCSVCell(val) {
    let s = String(val ?? '');
    // Neutraliser = + - @ \t | au début (formule Excel)
    if (/^[\s]*[=+\-@]/.test(s))
        s = "'" + s;
    // Doubler les guillemets
    s = s.replace(/"/g, '""');
    // Encadrer si contient ; " \n
    if (/[;",\n]/.test(s))
        s = `"${s}"`;
    return s;
}
/** Calcule HMAC-SHA256(sel, données). Sel = ANTI_REPLAY_SALT (32 octets min). */
export function hmacSHA256(sel, data) {
    return crypto.createHmac('sha256', sel).update(data).digest('hex');
}
/** Vérifie la force d'un secret d'environnement (min 32 chars hex). */
export function validerSecretEnv(nom, val) {
    if (!val)
        throw new Error(`[C2/C6a] ${nom} manquant — définir avec openssl rand -hex 32`);
    if (val.length < 32)
        throw new Error(`[C2/C6a] ${nom} trop court (${val.length} < 32) — openssl rand -hex 32`);
    return val;
}
