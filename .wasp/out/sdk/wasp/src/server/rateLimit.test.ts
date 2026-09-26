// src/server/rateLimit.test.ts
// ============================================================================
// VAGUE 5, P11-e — l'IP cliente ne doit pas être dictée par l'appelant.
//
// Constat : `x-forwarded-for` était lu « à la main » (première entrée),
// sans que la confiance soit déclarée à Express. Or cet en-tête est
// fourni par le client : un appelant direct pouvait forger son IP, ce qui
// rendait le rate limit contournable ET l'IP journalisée fausse.
//
// Ces tests vérifient la règle unique de résolution, pas la configuration
// Express elle-même (qui vit dans staticServing) : ils s'assurent que
// `extraireIp` ne lit plus l'en-tête, qu'elle normalise les IPv4 mappées,
// et que le nombre de proxys de confiance est piloté par l'environnement.
// ============================================================================
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { extraireIp, extraireIpDeRequete, nombreDeProxysDeConfiance } from './rateLimit';

const requete = (overrides: Record<string, any> = {}) => ({
  ip: '203.0.113.9',
  headers: {},
  socket: { remoteAddress: '10.0.0.1' },
  ...overrides,
});

describe('P11-e — résolution de l\'IP cliente', () => {
  test('utilise l\'IP calculée par Express (déjà pliée de confiance)', () => {
    // `req.ip` est la sortie de `app.set('trust proxy', n)`.
    expect(extraireIp({ req: requete() })).toBe('203.0.113.9');
  });

  test('NE LIT PLUS x-forwarded-for : un en-tête forgé est ignoré', () => {
    // C'est le cœur du correctif. Avant, cette valeur était utilisée
    // directement : un appelant sans proxy pouvait choisir son IP et
    // repartir d'un budget neuf à chaque requête.
    const req = requete({
      ip: '203.0.113.9',
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(extraireIp({ req })).toBe('203.0.113.9');
    expect(extraireIp({ req })).not.toBe('1.2.3.4');
  });

  test('repli sur le socket quand Express n\'a rien résolu', () => {
    const req = requete({ ip: undefined, headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect(extraireIp({ req })).toBe('10.0.0.1');
  });

  test('normalise une IPv4 mappée en IPv4', () => {
    // `::ffff:1.2.3.4` et `1.2.3.4` sont la même machine : sans
    // normalisation, la même personne obtient deux budgets distincts.
    expect(extraireIp({ req: requete({ ip: '::ffff:198.51.100.7' }) })).toBe('198.51.100.7');
    expect(extraireIp({ req: requete({ ip: undefined, socket: { remoteAddress: '::ffff:198.51.100.8' } }) }))
      .toBe('198.51.100.8');
  });

  test('une IP inconnue ne jette pas : elle est nommée', () => {
    expect(extraireIp({})).toBe('inconnue');
    expect(extraireIp({ req: requete({ ip: undefined, socket: {} }) })).toBe('inconnue');
  });

  test('la même règle sert une requête Express nue (middleware)', () => {
    // Une seule source de vérité : l'audit et le rate limit ne peuvent
    // plus diverger sur la façon de lire une IP.
    expect(extraireIpDeRequete(requete())).toBe(extraireIp({ req: requete() }));
  });
});

describe('P11-e — nombre de proxys de confiance', () => {
  const envInitial = process.env.TRUST_PROXY_HOPS;

  beforeEach(() => {
    delete process.env.TRUST_PROXY_HOPS;
  });
  afterEach(() => {
    if (envInitial === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = envInitial;
  });

  test('1 par défaut (Render / Railway : un seul saut)', () => {
    expect(nombreDeProxysDeConfiance()).toBe(1);
  });

  test('2 quand un CDN est intercalé', () => {
    process.env.TRUST_PROXY_HOPS = '2';
    expect(nombreDeProxysDeConfiance()).toBe(2);
  });

  test('0 est accepté (application nue, aucun proxy)', () => {
    process.env.TRUST_PROXY_HOPS = '0';
    expect(nombreDeProxysDeConfiance()).toBe(0);
  });

  test('une valeur invalide retombe sur 1 plutot que de faire confiance à tout', () => {
    // `true` ferait confiance à toute la chaîne x-forwarded-for : c'est
    // précisément la configuration à ne jamais obtenir par accident.
    for (const valeur of ['true', 'beaucoup', '-1', '1.5', '']) {
      process.env.TRUST_PROXY_HOPS = valeur === '' ? '' : valeur;
      expect(nombreDeProxysDeConfiance()).toBe(1);
    }
  });
});
