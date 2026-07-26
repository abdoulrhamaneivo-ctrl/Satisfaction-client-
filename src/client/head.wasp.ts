import { type App } from "@wasp.sh/spec";

export const head: App["head"] = [
  "<link rel='icon' href='/favicon.ico' />",
  "<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=5.0' />",
  "<meta http-equiv='Content-Security-Policy' content=\"script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: data:; object-src 'none';\" />",
  "<link rel='stylesheet' href='https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap' />",
  "<meta name='robots' content='noindex, nofollow' />",
  "<meta name='description' content='Yeba — outil interne de collecte et de pilotage de la satisfaction client.' />",
  "<meta name='author' content='Yeba' />",
];

