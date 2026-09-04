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
import express from 'express';
import { checkRateLimit } from './rateLimit';
// Le build Vite est copié dans l'image Docker à ce chemin (Dockerfile.render).
// process.cwd() = .wasp/out/server → ../web-app/build = .wasp/out/web-app/build
const CLIENT_BUILD_DIR = path.resolve(process.cwd(), '../web-app/build');
const SPA_ENTRY = path.join(CLIENT_BUILD_DIR, '200.html');
// Préfixes réservés à l'API — jamais interceptés par le fallback SPA.
const API_PREFIXES = ['/operations', '/auth', '/api', '/webhooks'];
// Limites anti brute-force / anti spam sur les routes d'authentification
// Wasp (le login, le reset et l'inscription sont des routes framework, pas
// des actions métier — on ne peut donc pas y brancher checkRateLimit comme
// pour soumettreAvis : c'est ce middleware Express qui les protège).
// Limites généreuses par IP pour ne jamais bloquer un usage légitime
// (réseaux NAT partagés), strictes face à un robot.
const AUTH_RATE_LIMITS = [
    { prefixe: '/auth/email/login', capacity: 10, refillPerMinute: 1 },
    { prefixe: '/auth/email/request-password-reset', capacity: 5, refillPerMinute: 0.5 },
    { prefixe: '/auth/email/reset-password', capacity: 10, refillPerMinute: 2 },
    { prefixe: '/auth/email/signup', capacity: 10, refillPerMinute: 2 },
];
/** IP réelle derrière Render + Cloudflare (x-forwarded-for écrasé par le proxy). */
function ipClient(req) {
    const fwd = req?.headers?.['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0)
        return fwd.split(',')[0].trim();
    return req?.socket?.remoteAddress ?? 'inconnue';
}
export async function serveStaticClient({ app }) {
    // ── DURCISSEMENT HTTP (audit ZAP, bloc A) ──────────────────────────────
    // Ces headers s'appliquent à TOUTES les réponses (API + statiques) :
    //  - CSP complète en header HTTP (frame-ancestors n'est PAS supporté via
    //    <meta> — c'était l'alerte ZAP « Meta Policy Invalid Directive ») ;
    //  - X-Frame-Options: DENY en défense en profondeur (clickjacking) ;
    //  - HSTS (HTTPS uniquement pendant 1 an) ;
    //  - nosniff (anti MIME-sniffing) ;
    //  - Referrer-Policy stricte ;
    //  - Les réponses API sont no-store (données sensibles non cachées) ;
    //  - X-Powered-By supprimé (divulgation de technologie inutile).
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        // ANTI BRUTE-FORCE (audit) : les routes d'auth Wasp sont limitées par IP
        // avant tout traitement — un robot qui mitraille le login ou le reset
        // reçoit 429 avec Retry-After au lieu de frapper la base et SendGrid.
        if (req.method === 'POST') {
            const regle = AUTH_RATE_LIMITS.find((r) => req.path.startsWith(r.prefixe));
            if (regle) {
                const verdict = checkRateLimit(`auth:${ipClient(req)}:${regle.prefixe}`, {
                    capacity: regle.capacity,
                    refillPerMinute: regle.refillPerMinute,
                });
                if (!verdict.allowed) {
                    res.setHeader('Retry-After', String(verdict.retryAfterSeconds));
                    res.status(429).json({
                        message: `Trop de tentatives. Réessayez dans ${verdict.retryAfterSeconds} secondes.`,
                    });
                    return;
                }
            }
        }
        res.setHeader('Content-Security-Policy', "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob: https:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'none'");
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Les réponses API authentifiées contiennent des données sensibles :
        // interdiction de les stocker dans tout cache intermédiaire ou navigateur.
        if (API_PREFIXES.some((p) => req.path.startsWith(p))) {
            res.setHeader('Cache-Control', 'no-store');
        }
        next();
    });
    // Uniquement si le build client est présent (déploiement mono-service).
    // En déploiement client séparé (Railway), ce dossier est absent → no-op.
    if (!fs.existsSync(SPA_ENTRY)) {
        console.log('[static] pas de build client dans', CLIENT_BUILD_DIR, '— client non servi par ce serveur');
        return;
    }
    // 1. Fichiers statiques Vite (noms hashés → cache immuable 1 an).
    //    index:false : la racine / est gérée par le fallback ci-dessous.
    app.use(express.static(CLIENT_BUILD_DIR, {
        index: false,
        maxAge: '1y',
        setHeaders(res, filePath) {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    }));
    // 2. Fallback SPA : toute requête GET non-API non résolue renvoie l'app
    //    (le routing des pages est géré côté client par react-router).
    //    NB : Express 5 (path-to-regexp v8) interdit le motif '*' — on utilise
    //    un middleware sans chemin, monté en dernier.
    app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD')
            return next();
        if (API_PREFIXES.some((p) => req.path.startsWith(p)))
            return next();
        if (res.headersSent)
            return next();
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
    // toujours pour la racine. On déplace donc nos trois couches (headers +
    // static + fallback) juste AVANT le router Wasp dans le stack Express.
    // Sinon le middleware headers (ajouté en dernier) ne s'exécute jamais
    // pour les routes API déjà traitées en amont.
    // Express 5 : le stack vit sur app.router (fonction bound), pas _router.
    const anyApp = app;
    const stack = anyApp.router?.stack ?? anyApp._router?.stack;
    if (Array.isArray(stack) && stack.length >= 3) {
        const ourLayers = stack.splice(-3); // nos 3 dernières couches
        // Insérer juste avant la 1re couche 'router' (le indexRouter Wasp)
        const routerIdx = stack.findIndex((l) => l.name === 'router');
        stack.splice(routerIdx >= 0 ? routerIdx : 0, 0, ...ourLayers);
        console.log('[static] couches déplacées avant le router Wasp');
    }
    console.log('[static] client servi depuis', CLIENT_BUILD_DIR);
}
//# sourceMappingURL=staticServing.js.map