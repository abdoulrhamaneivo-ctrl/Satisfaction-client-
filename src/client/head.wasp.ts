import { type App } from "@wasp.sh/spec";

// Polices 100% LOCALES (public/fonts/ + Main.css @font-face) :
// les liens fontshare/fonts.googleapis provoquaient un NS_ERROR_NET_TIMEOUT
// qui bloquait le premier rendu (écran blanc) sur connexions lentes.
export const head: App["head"] = [
  "<link rel='icon' href='/favicon.ico' />",
  "<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=5.0' />",
  "<meta http-equiv='Content-Security-Policy' content=\"script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: data:; object-src 'none';\" />",
  "<meta name='robots' content='noindex, nofollow' />",
  "<meta name='description' content='Yeba — outil interne de collecte et de pilotage de la satisfaction client.' />",
  "<meta name='author' content='Yeba' />",
];
