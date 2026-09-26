import * as z from 'zod';
/**
 * Valide rawArgs contre un schéma Zod, sinon HttpError 400.
 * Restauré (était supprimé par erreur) : utilisé par file-upload/operations
 * et user/accountsActions.
 */
export declare function ensureArgsSchemaOrThrowHttpError<Schema extends z.ZodType>(schema: Schema, rawArgs: unknown): z.infer<Schema>;
/** Normalise un téléphone vers E.164 CI (+225XXXXXXXXXX). Lève si invalide. */
export declare function normaliserTelephoneE164(tel: string): string;
/** Valide et normalise un commentaire : texte brut, max 1000 car., sans HTML/JS. */
export declare const MAX_LONGUEUR_COMMENTAIRE = 1000;
export declare function sanitiserCommentaire(txt: string): string;
/**
 * Erreur de saisie du client (Vague 5, P11).
 *
 * Se distingue d'une panne : elle mérite un 4xxactionnable, pas un 500.
 * Toute validation de contenu qui doit être rattrapée par le wrapper
 * d'action devrait lever ce type plutôt qu'un `Error` nu.
 */
export declare class ValiderEntreeErreur extends Error {
    readonly code = "ENTREE_INVALIDE";
    constructor(message: string);
}
/** Traduit une erreur de validation en `HttpError` 4xx, ou la laisse passer. */
export declare function versHttpSiEntreeInvalide(error: unknown): Error | null;
/** Échappe une cellule CSV (RFC 4180) : guillemets doublés, préfixe ' pour formules. */
export declare function escapeCSVCell(val: string): string;
/** Calcule HMAC-SHA256(sel, données). Sel = ANTI_REPLAY_SALT (32 octets min). */
export declare function hmacSHA256(sel: string, data: string): string;
/** Vérifie la force d'un secret d'environnement (min 32 chars hex). */
export declare function validerSecretEnv(nom: string, val: string | undefined): string;
