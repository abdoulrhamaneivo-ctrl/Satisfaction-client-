import { type App } from "@wasp.sh/spec";

// Polices 100% LOCALES (public/fonts/ + Main.css @font-face) :
// les liens fontshare/fonts.googleapis provoquaient un NS_ERROR_NET_TIMEOUT
// qui bloquait le premier rendu (écran blanc) sur connexions lentes.
//
// CSP DURCIE (audit P4) : l'ancienne politique (script-src 'self'
// 'unsafe-inline' 'unsafe-eval' https:) rendait la CSP quasi inopérante —
// https: autorisait tout script externe et unsafe-inline/eval neutralisaient
// le reste. La nouvelle politique :
//   - script-src 'self' uniquement (bundle Vite haché, aucun inline nécessaire
//     car Vite extrait les scripts en fichiers) ;
//   - style-src 'self' 'unsafe-inline' : inline conservé UNIQUEMENT pour les
//     styles (thème BrandContext, pseudo-styles React inline) — le CSS
//     injecté vient de valeurs serveur validées (HEX, jamais de HTML libre) ;
//   - img-src inclut data:/blob: (aperçus QR générés, avatars) ;
//   - connect-src borne les appels réseau au domaine Yéba + OpenRouter
//     côté serveur uniquement (le navigateur ne parle qu'à l'API Yéba).
// Si une régression apparaît (script inline ajouté par une lib), la corriger
// en extrayant le script, PAS en relâchant la CSP.
export const head: App["head"] = [
  "<link rel='icon' href='/favicon.ico' />",
  "<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=5.0' />",
  "<meta http-equiv='Content-Security-Policy' content=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';\" />",
  "<meta name='robots' content='noindex, nofollow' />",
  "<meta name='description' content='Yeba — outil interne de collecte et de pilotage de la satisfaction client.' />",
  "<meta name='author' content='Yeba' />",
];
