// src/shared/noteSur5.test.ts — règle unique de satisfaction (P2 de l'audit).
import { expect, test, describe } from 'vitest';
import { noteSur5, notesSur5, moyenneSur5, estCritereSatisfaction } from './noteSur5';

describe('exclusion des constructs non-saturation (le bug du CES et du NPS)', () => {
  test('CES 1-7 : un effort élevé ne doit JAMAIS ressembler à une bonne note', () => {
    const ces = (note: number, normalise: number) => ({
      score_brut: note,
      score_normalise: normalise,
      critere: { type_reponse: 'ECHELLE', scoring_mode: 'CES', options_reponse: '1,7' },
    });
    // Avant le correctif : 7/7 → ratio (7-1)/6 = 1 → 5/5 étoiles.
    expect(noteSur5(ces(7, 0))).toBeNull();
    expect(noteSur5(ces(1, 100))).toBeNull();
    expect(estCritereSatisfaction(ces(1, 100).critere)).toBe(false);
  });

  test('NPS 3/10 n\'entre pas dans l\'histogramme de satisfaction', () => {
    expect(noteSur5({ score_brut: 3, score_normalise: 30, critere: { type_reponse: 'NPS' } })).toBeNull();
    expect(noteSur5({ score_brut: 9, score_normalise: 90, critere: { type_reponse: 'NPS' } })).toBeNull();
  });

  test('texte et choix catégoriel : jamais de note', () => {
    expect(noteSur5({ score_brut: null, critere: { type_reponse: 'TEXTE' } })).toBeNull();
    expect(noteSur5({ score_brut: null, critere: { type_reponse: 'QCM' } })).toBeNull();
    expect(noteSur5({ score_brut: null, critere: { type_reponse: 'CASES' } })).toBeNull();
    expect(noteSur5({ score_brut: null, critere: { type_reponse: 'TEXTE', scoring_mode: 'FREE_TEXT' } })).toBeNull();
  });
});

describe('valeur stockée prioritaire, repli legacy borné', () => {
  test('score_normalise fait foi', () => {
    expect(noteSur5({ score_brut: 4, score_normalise: 80, critere: { type_reponse: 'SMILEY' } })).toBe(4);
    expect(noteSur5({ score_brut: 1, score_normalise: 100, critere: { type_reponse: 'SMILEY' } })).toBe(5);
  });

  test('0/100 = une étoile (échelle 1-5), pas un zéro', () => {
    expect(noteSur5({ score_normalise: 0, critere: { type_reponse: 'SMILEY' } })).toBe(1);
  });

  test('bornes : rien au-delà de 100/100', () => {
    expect(noteSur5({ score_normalise: 140, critere: { type_reponse: 'SMILEY' } })).toBe(5);
    expect(noteSur5({ score_normalise: -20, critere: { type_reponse: 'SMILEY' } })).toBe(1);
  });

  test('repli legacy sur ECHELLE 1-10 (ligne sans normalisé)', () => {
    // Bornes stockées 1..10 : ratio (8−1)/(10−1) = 0,777 → 1 + 0,777×4 = 4,11
    expect(noteSur5({ score_brut: 8, critere: { type_reponse: 'ECHELLE', options_reponse: '1,10' } })).toBeCloseTo(4.1111, 3);
    expect(noteSur5({ score_brut: 10, critere: { type_reponse: 'ECHELLE', options_reponse: '1,10' } })).toBe(5);
    expect(noteSur5({ score_brut: 1, critere: { type_reponse: 'ECHELLE', options_reponse: '1,10' } })).toBe(1);
  });

  test('échelle illisible → null plutôt qu\'un nombre inventé', () => {
    expect(noteSur5({ score_brut: 3, critere: { type_reponse: 'ECHELLE', options_reponse: 'nawak' } })).toBeNull();
  });

  test('null / undefined tolérés', () => {
    expect(noteSur5(null)).toBeNull();
    expect(noteSur5(undefined)).toBeNull();
    expect(noteSur5({ score_brut: null, critere: null })).toBeNull();
  });
});

describe('agrégats', () => {
  test('moyenne n\'utilise que les réponses notables', () => {
    const reponses = [
      { score_normalise: 100, critere: { type_reponse: 'SMILEY' } },
      { score_normalise: 60, critere: { type_reponse: 'SMILEY' } },
      { score_normalise: 40, critere: { type_reponse: 'SMILEY' } },
      { score_normalise: 0, critere: { type_reponse: 'NPS' } },      // exclu
      { score_normalise: 0, critere: { type_reponse: 'ECHELLE', scoring_mode: 'CES' } }, // exclu
      { score_normalise: null, critere: { type_reponse: 'TEXTE' } }, // non notable
    ];
    expect(notesSur5(reponses)).toEqual([5, 3, 2]);
    expect(moyenneSur5(reponses)).toBeCloseTo(10 / 3, 9);
  });

  test('aucune réponse notable → null (jamais 0 affiché)', () => {
    expect(moyenneSur5([{ score_normalise: 0, critere: { type_reponse: 'NPS' } }])).toBeNull();
    expect(moyenneSur5([])).toBeNull();
  });
});
