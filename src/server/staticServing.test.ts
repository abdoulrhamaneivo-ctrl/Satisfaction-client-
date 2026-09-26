import express from 'express';
import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import { serveStaticClient } from './staticServing';

test('denies public signup before an already mounted Wasp router', async () => {
  const app = express();
  const waspRouter = express.Router();
  waspRouter.post('/auth/email/signup', (_req, res) => res.status(201).end());
  app.use(waspRouter);
  const server = app.listen(0);
  await serveStaticClient({ app, server });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${(address as any).port}/auth/email/signup`, { method: 'POST' });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  expect(response.status).toBe(404);
});

describe('web cache deception (audit Hackaiz 2026-09-26)', () => {
  // CLIENT_BUILD_DIR est calculé à l'IMPORT du module (`process.cwd()` au
  // chargement), pas à l'appel. En test, le CWD est la racine du dépôt, donc
  // le build n'est pas trouvé et RIEN n'est monté — tous ces tests passeraient
  // pour la mauvaise raison. On se place dans `.wasp/out/server` (comme en
  // production : WORKDIR du Dockerfile) AVANT de (ré)importer le module.
  const cwdOrigine = process.cwd();
  let servir: typeof serveStaticClient;
  beforeAll(async () => {
    process.chdir('.wasp/out/server');
    vi.resetModules();
    servir = (await import('./staticServing')).serveStaticClient;
  });
  afterAll(() => process.chdir(cwdOrigine));

  async function demarrer() {
    const app = express();
    const server = app.listen(0);
    await servir({ app, server });
    return { server, port: (server.address() as any).port };
  }
  async function arreter(server: any) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  test('une adresse .css inexistante recoit 404, pas la coquille', async () => {
    const { server, port } = await demarrer();
    const response = await fetch(`http://127.0.0.1:${port}/hackaiz-304549a.css`);
    await arreter(server);
    // Avant le correctif : 200 + text/html (la coquille servie comme CSS).
    expect(response.status).toBe(404);
  });

  test('une route applicative sans extension recoit toujours la coquille', async () => {
    const { server, port } = await demarrer();
    const response = await fetch(`http://127.0.0.1:${port}/dashboard`);
    await arreter(server);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  test('la coquille est marquee no-store (jamais de cache partage)', async () => {
    const { server, port } = await demarrer();
    const response = await fetch(`http://127.0.0.1:${port}/dashboard`);
    await arreter(server);
    // Avant : `no-cache` — stockable avec revalidation, et Render servait
    // `public, max-age=14400`. `no-store` interdit tout stockage.
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  test('un vrai asset garde son cache long (on ne casse pas la perf)', async () => {
    const { server, port } = await demarrer();
    const response = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
    await arreter(server);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=31536000');
  });
});
