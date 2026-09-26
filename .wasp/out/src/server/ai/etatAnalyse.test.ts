// src/server/ai/etatAnalyse.test.ts — machine à états pure (P3 de l'audit).
import { expect, test, describe } from 'vitest';
import {
  estRejouable,
  estObsolete,
  aRejouer,
  estRelancableManuellement,
  MAX_ATTEMPTS_ANALYSE,
} from './etatAnalyse';

const ligne = (status: string, attempts = 0, minutesEcoulees = 0) => ({
  status,
  attempts,
  updatedAt: new Date(Date.now() - minutesEcoulees * 60_000),
});

describe('estRejouable', () => {
  test('PENDING toujours rejouable', () => {
    expect(estRejouable(ligne('PENDING'))).toBe(true);
  });

  test('FAILED rejouable tant que le quota de tentatives reste', () => {
    expect(estRejouable(ligne('FAILED', 0))).toBe(true);
    expect(estRejouable(ligne('FAILED', MAX_ATTEMPTS_ANALYSE - 1))).toBe(true);
    expect(estRejouable(ligne('FAILED', MAX_ATTEMPTS_ANALYSE))).toBe(false);
    expect(estRejouable(ligne('FAILED', MAX_ATTEMPTS_ANALYSE + 5))).toBe(false);
  });

  test('DONE et PROCESSING ne sont jamais rejouables par la sélection', () => {
    expect(estRejouable(ligne('DONE'))).toBe(false);
    expect(estRejouable(ligne('PROCESSING', 0))).toBe(false);
  });
});

describe('estObsolete : le trou noir PROCESSING est fermé', () => {
  test('PROCESSING ancien → périmé', () => {
    expect(estObsolete(ligne('PROCESSING', 1, 11))).toBe(true);
    expect(estObsolete(ligne('PROCESSING', 1, 9))).toBe(false);
  });

  test('un horodatage illisible ou absent est considéré périmé', () => {
    expect(estObsolete({ status: 'PROCESSING', attempts: 1, updatedAt: null })).toBe(true);
    expect(estObsolete({ status: 'PROCESSING', attempts: 1, updatedAt: 'pas une date' })).toBe(true);
  });

  test('les autres statuts ne sont jamais périmés', () => {
    expect(estObsolete(ligne('DONE', 1, 999))).toBe(false);
    expect(estObsolete(ligne('PENDING', 0, 999))).toBe(false);
    expect(estObsolete(ligne('FAILED', 3, 999))).toBe(false);
  });

  test('délai configurable', () => {
    expect(estObsolete(ligne('PROCESSING', 1, 3), new Date(), 1)).toBe(true);
    expect(estObsolete(ligne('PROCESSING', 1, 3), new Date(), 60)).toBe(false);
  });
});

describe('aRejouer : sélection du job', () => {
  test('inclut rejouables ET périmés, exclut DONE, FAILED épuisé et PROCESSING frais', () => {
    const lignes = [
      ligne('PENDING', 0),                              // rejouable
      ligne('FAILED', 1),                               // rejouable
      ligne('FAILED', MAX_ATTEMPTS_ANALYSE),            // quota épuisé → exclu
      ligne('PROCESSING', 1, 30),                       // périmé → inclus
      ligne('PROCESSING', 1, 1),                        // frais → exclu
      ligne('DONE', 1),                                 // exclu
    ];
    const r = aRejouer(lignes);
    expect(r).toHaveLength(3);
    expect(r.filter((l) => l.status === 'PROCESSING')).toHaveLength(1);
    expect(r.some((l) => l.status === 'DONE')).toBe(false);
  });
});

describe('estRelancableManuellement : le bouton « Analyser » ne ment plus', () => {
  test('PENDING, FAILED (quota atteint inclus) et périmé sont relançables', () => {
    expect(estRelancableManuellement(ligne('PENDING'))).toBe(true);
    expect(estRelancableManuellement(ligne('FAILED', MAX_ATTEMPTS_ANALYSE))).toBe(true);
    expect(estRelancableManuellement(ligne('PROCESSING', 1, 30))).toBe(true);
  });

  test('DONE et un traitement encore frais ne le sont pas', () => {
    expect(estRelancableManuellement(ligne('DONE'))).toBe(false);
    expect(estRelancableManuellement(ligne('PROCESSING', 1, 1))).toBe(false);
  });
});
