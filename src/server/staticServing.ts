// src/server/staticServing.ts
// ============================================================================
// Servir le client Vite depuis le serveur Express (déploiement Render
// mono-service). En Wasp 0.24, le client est normalement déployé séparément
// (comme sur Railway). Sur Render, le même serveur Express sert donc l'API
// ET le front statique.
//
// MÉCANISME : server.setupFn reçoit { app, server } (ServerSetupFnContext).
// Elle est appelée APRÈS l'enregistrement des routes API Wasp — parfait :
// nos middlewares static + SPA fallback s'exécutent en DERNIER dans le
// stack Express, donc /operations et /auth sont traités avant, et tout le
// reste (assets, routes SPA) tombe dans le static/fallback.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import type { Server } from 'node:http';

// Le build Vite est copié dans l'image Docker à ce chemin (Dockerfile.render).
// process.cwd() = .wasp/out/server → ../web-app/build = .wasp/out/web-app/build
const CLIENT_BUILD_DIR = path.resolve(process.cwd(), '../web-app/build');
const SPA_ENTRY = path.join(CLIENT_BUILD_DIR, '200.html');

// Préfixes réservés à l'API — jamais interceptés par le fallback SPA.
const API_PREFIXES = ['/operations', '/auth', '/api', '/webhooks'];

interface ServerSetupContext {
  app: Express;
  server: Server;
}

export async function serveStaticClient({ app }: ServerSetupContext): Promise<void> {
  // Uniquement si le build client est présent (déploiement mono-service).
  // En déploiement client séparé (Railway), ce dossier est absent → no-op.
  if (!fs.existsSync(SPA_ENTRY)) {
    console.log(
      '[static] pas de build client dans',
      CLIENT_BUILD_DIR,
      '— client non servi par ce serveur'
    );
    return;
  }

  // 1. Fichiers statiques Vite (noms hashés → cache immuable 1 an).
  //    index:false : la racine / est gérée par le fallback ci-dessous.
  app.use(
    express.static(CLIENT_BUILD_DIR, {
      index: false,
      maxAge: '1y',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // 2. Fallback SPA : toute requête GET non-API non résolue renvoie l'app
  //    (le routing des pages est géré côté client par react-router).
  //    NB : Express 5 (path-to-regexp v8) interdit le motif '*' — on utilise
  //    un middleware sans chemin, monté en dernier.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (API_PREFIXES.some((p) => req.path.startsWith(p))) return next();
    if (res.headersSent) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // NB : res.sendFile d'Express 5 renvoie 404 sur ce chemin absolu (bug
    // path-to-regexp/serve-static interne) — fs.createReadStream marche.
    fs.createReadStream(SPA_ENTRY)
      .on('error', () => next())
      .pipe(res);
  });

  // CAS PARTICULIER '/' : le router Wasp déclare GET / (healthcheck qui
  // renvoie 200 vide) et il est enregistré AVANT setupFn — il gagnerait
  // toujours pour la racine. On déplace donc nos deux couches (static +
  // fallback) juste AVANT le router Wasp dans le stack Express.
  // Express 5 : le stack vit sur app.router (fonction bound), pas _router.
  const anyApp = app as any;
  const stack: any[] | undefined = anyApp.router?.stack ?? anyApp._router?.stack;
  if (Array.isArray(stack) && stack.length >= 2) {
    const ourLayers = stack.splice(-2); // nos 2 dernières couches
    // Insérer juste avant la 1re couche 'router' (le indexRouter Wasp)
    const routerIdx = stack.findIndex((l) => l.name === 'router');
    stack.splice(routerIdx >= 0 ? routerIdx : 0, 0, ...ourLayers);
    console.log('[static] couches déplacées avant le router Wasp');
  }

  console.log('[static] client servi depuis', CLIENT_BUILD_DIR);
}
