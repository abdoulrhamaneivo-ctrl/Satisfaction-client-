// src/shared/indicateurs.test.ts — Phase H : catalogue, bandes, N/A, qualité.
import { expect, test, describe } from 'vitest';
import {
  distributionBandends,
  mediane,
  tauxReponse,
  scoreQualiteDonnees,
  definitionIndicateur,
  indiceGlobalExperience,
  CATALOGUE_INDICATEURS,
} from './indicateurs';

describe('bandes CSAT et médiane', () => {
  test('bandes /100 exactes', () => {
    expect(distributionBandends([100, 80, 79, 60, 59, 40, 39, 20, 19, 0])).toEqual({
      tres_satisfaits: 2,
      satisfaits: 2,
      neutres: 2,
      insatisfaits: 2,
      tres_insatisfaits: 2,
    });
  });

  test('médiane paire/impaire/vide', () => {
    expect(mediane([10, 30, 20])).toBe(20);
    expect(mediane([10, 20, 30, 40])).toBe(25);
    expect(mediane([])).toBeNull();
  });
});

describe('taux de réponse : jamais de dénominateur inventé', () => {
  test('OK quand le dénominateur existe', () => {
    expect(tauxReponse({ visiteursEstimes: 200, questionnairesTermines: 50 })).toEqual({
      taux: 25,
      statut: 'OK',
    });
  });

  test.each([[undefined], [null], [0], [-5]])('N/A si dénominateur %s', (v) => {
    expect(tauxReponse({ visiteursEstimes: v as any, questionnairesTermines: 50 })).toEqual({
      taux: null,
      statut: 'N/A',
    });
  });
});

describe('DATA_QUALITY_SCORE décomposé', () => {
  test('jeu parfait → 100, détails à 100', () => {
    const r = scoreQualiteDonnees({
      totalReponses: 100, notables: 100, avecCommentaire: 100,
      incoherentes: 0, legacy: 0, inferees: 0,
    });
    expect(r.score).toBe(100);
    expect(r.details).toEqual({
      notables: 100, commentaires: 100, coherence: 100, fraicheur_legacy: 100, volume: 100,
    });
  });

  test('vide → 0 partout (pas de division par zéro)', () => {
    expect(scoreQualiteDonnees({
      totalReponses: 0, notables: 0, avecCommentaire: 0,
      incoherentes: 0, legacy: 0, inferees: 0,
    }).score).toBe(0);
  });

  test('legacy pénalisé à moitié pour inféré, plein pour positionnel', () => {
    const plein = scoreQualiteDonnees({
      totalReponses: 100, notables: 100, avecCommentaire: 100,
      incoherentes: 0, legacy: 100, inferees: 0,
    });
    const moitie = scoreQualiteDonnees({
      totalReponses: 100, notables: 100, avecCommentaire: 100,
      incoherentes: 0, legacy: 0, inferees: 100,
    });
    expect(moitie.details.fraicheur_legacy).toBe(50);
    expect(plein.details.fraicheur_legacy).toBe(0);
    expect(moitie.score).toBeGreaterThan(plein.score);
  });
});

describe('indice global : formule documentée, jamais cachée', () => {
  test('CSAT seul par défaut', () => {
    expect(indiceGlobalExperience({ csat: 78.5 })).toEqual({
      indice: 79,
      formule: 'CSAT seul (NPS/CES indisponibles)',
    });
  });

  test('60/40 avec NPS normalisé', () => {
    // 0.6×80 + 0.4×((34+100)/2=67) = 48 + 26.8 = 74.8 → 75
    expect(indiceGlobalExperience({ csat: 80, nps: 34 })).toEqual({
      indice: 75,
      formule: '60 % CSAT + 40 % NPS normalisé ((nps+100)/2)',
    });
  });

  test('CES partiel : repondération sur le disponible', () => {
    const r = indiceGlobalExperience({ csat: 80, ces: 70 });
    expect(r.indice).toBe(Math.round((0.5 * 80 + 0.2 * 70) / 0.7));
    expect(r.formule).toContain('CSAT');
    expect(r.formule).toContain('CES');
  });
});

describe('catalogue : chaque KPI est défini', () => {
  test('ids uniques, NPS/CSAT/qualité présents, formule non vide', () => {
    const ids = CATALOGUE_INDICATEURS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['CSAT', 'NPS', 'DATA_QUALITY_SCORE', 'TAUX_REPONSE', 'COHERENCE_PCT']) {
      const d = definitionIndicateur(id);
      expect(d).not.toBeNull();
      expect(d?.formule.trim().length).toBeGreaterThan(0);
    }
    expect(definitionIndicateur('INCONNU')).toBeNull();
  });
});
