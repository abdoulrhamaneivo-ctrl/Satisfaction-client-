// Tests C6a (J+7) : chiffrement TOTP à clé dédiée + rotation sans interruption.
// Couvrent : roundtrip, fail-fast sans fallback DEVJWTSECRET, rotation
// previous → rechiffrement opportuniste, héritage JWT_SECRET (lignes pré-C6a),
// rejet des mauvaises clés et des formats invalides.
import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  chiffrerSecretTotp,
  dechiffrerSecretTotp,
  dechiffrerSecretTotpAvecStatut,
  genererSecretTotp,
} from './totp';

const CLE_A = 'a'.repeat(64); // openssl rand -hex 32 → 64 car. hex
const CLE_B = 'b'.repeat(64);
const LEGACY_JWT = 'c'.repeat(64);

const VARS_TOTP = [
  'TOTP_ENCRYPTION_KEY',
  'TOTP_ENCRYPTION_KEY_CURRENT',
  'TOTP_ENCRYPTION_KEY_PREVIOUS',
  'JWT_SECRET',
  'JWT_SECRET_CURRENT',
  'JWT_SECRET_PREVIOUS',
] as const;

let sauvegarde: Record<string, string | undefined>;

beforeEach(() => {
  sauvegarde = {};
  for (const v of VARS_TOTP) {
    sauvegarde[v] = process.env[v];
    delete process.env[v];
  }
});

afterEach(() => {
  for (const v of VARS_TOTP) {
    if (sauvegarde[v] === undefined) delete process.env[v];
    else process.env[v] = sauvegarde[v];
  }
});

/** Chiffre au format iv:tag:données avec une matière de clé brute (simule une ligne pré-C6a chiffrée avec JWT_SECRET). */
function chiffrerFormatHistorique(secret: string, matiereCle: string): string {
  const cle = crypto.createHash('sha256').update(matiereCle, 'utf8').digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cle, iv);
  const chiffre = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${chiffre.toString('base64')}`;
}

describe('C6a : chiffrement TOTP', () => {
  test('roundtrip chiffrer → déchiffrer avec la clé dédiée', () => {
    process.env.TOTP_ENCRYPTION_KEY = CLE_A;
    process.env.JWT_SECRET = LEGACY_JWT;
    const secret = genererSecretTotp();
    const stocke = chiffrerSecretTotp(secret);
    expect(stocke.split(':')).toHaveLength(3);
    const statut = dechiffrerSecretTotpAvecStatut(stocke);
    expect(statut.secret).toBe(secret);
    expect(statut.cleUtilisee).toBe('TOTP_ENCRYPTION_KEY');
    expect(statut.doitRechiffrer).toBe(false);
  });

  test("échoue au lieu d'utiliser un fallback DEVJWTSECRET (clé absente)", () => {
    process.env.JWT_SECRET = LEGACY_JWT; // seule clé présente : ne doit PAS servir au chiffrement
    expect(() => chiffrerSecretTotp(genererSecretTotp())).toThrow(/TOTP_ENCRYPTION_KEY/);
    expect(() => dechiffrerSecretTotp('a:b:c')).toThrow(/TOTP_ENCRYPTION_KEY/);
  });

  test('refuse une clé trop courte (< 32 caractères)', () => {
    process.env.TOTP_ENCRYPTION_KEY = 'trop-court';
    expect(() => chiffrerSecretTotp(genererSecretTotp())).toThrow(/trop court/);
  });

  test('rotation : déchiffre avec PREVIOUS et signale le rechiffrement opportuniste', () => {
    // Ligne chiffrée avant rotation (clé A = primaire de l’époque).
    process.env.TOTP_ENCRYPTION_KEY = CLE_A;
    process.env.JWT_SECRET = LEGACY_JWT;
    const secret = genererSecretTotp();
    const stockeAvantRotation = chiffrerSecretTotp(secret);

    // Rotation : B devient primaire, A passe en PREVIOUS.
    process.env.TOTP_ENCRYPTION_KEY = CLE_B;
    process.env.TOTP_ENCRYPTION_KEY_PREVIOUS = CLE_A;

    const statut = dechiffrerSecretTotpAvecStatut(stockeAvantRotation);
    expect(statut.secret).toBe(secret);
    expect(statut.cleUtilisee).toBe('TOTP_ENCRYPTION_KEY_PREVIOUS');
    expect(statut.doitRechiffrer).toBe(true);

    // Rechiffrement opportuniste : la nouvelle valeur se déchiffre avec la primaire.
    const rechiffre = chiffrerSecretTotp(statut.secret);
    const statutApres = dechiffrerSecretTotpAvecStatut(rechiffre);
    expect(statutApres.secret).toBe(secret);
    expect(statutApres.doitRechiffrer).toBe(false);
  });

  test('héritage pré-C6a : ligne chiffrée avec JWT_SECRET reste lisible (doitRechiffrer=true)', () => {
    const secret = genererSecretTotp();
    const ligneHistorique = chiffrerFormatHistorique(secret, LEGACY_JWT);

    process.env.TOTP_ENCRYPTION_KEY = CLE_B; // nouvelle clé dédiée
    process.env.JWT_SECRET = LEGACY_JWT; // ancien JWT conservé le temps de la migration

    const statut = dechiffrerSecretTotpAvecStatut(ligneHistorique);
    expect(statut.secret).toBe(secret);
    expect(statut.cleUtilisee).toBe('JWT_SECRET');
    expect(statut.doitRechiffrer).toBe(true);
  });

  test('rejette une clé qui ne convient pas (échec auth GCM)', () => {
    process.env.TOTP_ENCRYPTION_KEY = CLE_A;
    process.env.JWT_SECRET = LEGACY_JWT;
    const stocke = chiffrerSecretTotp(genererSecretTotp());

    process.env.TOTP_ENCRYPTION_KEY = CLE_B;
    delete process.env.JWT_SECRET;
    expect(() => dechiffrerSecretTotp(stocke)).toThrow();
  });

  test('rejette un format stocké invalide', () => {
    process.env.TOTP_ENCRYPTION_KEY = CLE_A;
    for (const invalide of ['', 'sans-separateur', 'a:b', ':::']) {
      expect(() => dechiffrerSecretTotp(invalide)).toThrow();
    }
  });

  test('TOTP_ENCRYPTION_KEY_CURRENT est prioritaire pour le chiffrement', () => {
    process.env.TOTP_ENCRYPTION_KEY = CLE_A;
    process.env.TOTP_ENCRYPTION_KEY_CURRENT = CLE_B;
    process.env.JWT_SECRET = LEGACY_JWT;
    const stocke = chiffrerSecretTotp(genererSecretTotp());
    expect(dechiffrerSecretTotpAvecStatut(stocke).cleUtilisee).toBe(
      'TOTP_ENCRYPTION_KEY_CURRENT'
    );
  });
});
