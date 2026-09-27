// src/client/utils/decorations.ts
// ============================================================================
// BLOBS DÉCORATIFS ET PAGES DE SAISIE (fix « clics/saisie lents » mobile).
//
// Constat (déjà diagnostiqué sur /q/* dans App.tsx) : même STATIQUES, les
// blobs `blur-3xl` plein écran coûtent une recomposition GPU à chaque
// re-render — donc à chaque frappe dans un champ contrôlé, et à chaque
// resize du viewport quand le clavier mobile s'ouvre. Sur un téléphone
// d'entrée de gamme, la frappe et les taps prennent des secondes.
// La page /login cumulait 8 couches floutées (4 globales App + 4 du layout).
//
// Règle : AUCUN blob sur les pages de saisie (auth + QR). Le reste de
// l'app les garde (décoration desktop, pas de frappe au caractère près).
// ============================================================================
/** Routes de saisie : auth (standalone) + collecte QR publique. */
const ROUTES_SAISIE = [
    '/login',
    '/apres-connexion',
    '/request-password-reset',
    '/password-reset',
    '/email-verification',
];
/** Vrai si la page DOIT afficher les blobs décoratifs globaux. */
export function afficherBlobsGlobaux(pathname) {
    if (!pathname)
        return true;
    if (pathname.startsWith('/q/'))
        return false;
    return !ROUTES_SAISIE.includes(pathname);
}
