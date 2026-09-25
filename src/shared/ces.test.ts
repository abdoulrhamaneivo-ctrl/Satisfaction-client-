// src/shared/ces.test.ts — bands, top box, canonicalisation, agrégation.
import { expect, test, describe } from 'vitest';
import {
  bandeCES,
  topBoxCES,
  scoreEffort100,
  agregerCES,
  reconnaitreCES,
  estEchelleCES,
  BANDES_CES,
} from './ces';

describe('bandesCES : convention figée', () => {
  test('échelle 1-5 : 1-2 faible, 3 moyen, 4-5 élevé', () => {
    expect(bandeCES(1, 5)).toBe('FAIBLE_EFFORT');
    expect(bandeCES(2, 5)).toBe('FAIBLE_EFFORT');
    expect(bandeCES(3, 5)).toBe('EFFORT_MOYEN');
    expect(bandeCES(4, 5)).toBe('EFFORT_ELEVE');
    expect(bandeCES(5, 5)).toBe('EFFORT_ELEVE');
  });

  test('échelle 1-7 : 1-3 faible, 4-5 moyen, 6-7 élevé', () => {
    expect(bandeCES(3, 7)).toBe('FAIBLE_EFFORT');
    expect(bandeCES(4, 7)).toBe('EFFORT_MOYEN');
    expect(bandeCES(7, 7)).toBe('EFFORT_ELEVE');
  });

  test('les bandes couvrent toute l\'échelle, sans trou ni recouvrement', () => {
    for (const echelle of [5, 7] as const) {
      const couvert = new Set<number>();
      for (const b of BANDES_CES[echelle]) {
        for (let n = b.min; n <= b.max; n += 1) {
          expect(couvert.has(n)).toBe(false);
          couvert.add(n);
        }
      }
      expect(couvert.size).toBe(echelle);
    }
  });

  test('note hors bornes / non entière → null (jamais de bande inventée)', () => {
    expect(bandeCES(0, 5)).toBeNull();
    expect(bandeCES(6, 5)).toBeNull();
    expect(bandeCES(3.5, 5)).toBeNull();
  });
});

describe('topBoxCES', () => {
  test('meilleur tiers bas seulement', () => {
    expect(topBoxCES(2, 5)).toBe(true);
    expect(topBoxCES(3, 5)).toBe(false);
    expect(topBoxCES(3, 7)).toBe(true);
    expect(topBoxCES(4, 7)).toBe(false);
    expect(topBoxCES(9, 7)).toBe(false);
  });
});

describe('scoreEffort100 : effort bas = score haut', () => {
  test('bornes', () => {
    expect(scoreEffort100(1, 5)).toBe(100);
    expect(scoreEffort100(5, 5)).toBe(0);
    expect(scoreEffort100(1, 7)).toBe(100);
    expect(scoreEffort100(7, 7)).toBe(0);
  });

  test('linéaire et monotone décroissant', () => {
    expect(scoreEffort100(3, 5)).toBe(50);
    const facile = scoreEffort100(1, 5) as number;
    const moyen = scoreEffort100(3, 5) as number;
    const difficile = scoreEffort100(5, 5) as number;
    expect(facile).toBeGreaterThan(moyen);
    expect(moyen).toBeGreaterThan(difficile);
  });

  test('invalide → null', () => {
    expect(scoreEffort100(0, 5)).toBeNull();
    expect(scoreEffort100(6, 5)).toBeNull();
  });
});

describe('agregerCES', () => {
  test('volume vide → 0 et métriques à null (jamais un 0 % affiché)', () => {
    const r = agregerCES([], 7);
    expect(r.volume).toBe(0);
    expect(r.score_qualite_100).toBeNull();
    expect(r.note_effort_moyenne).toBeNull();
    expect(r.taux_faible_effort).toBe(0);
  });

  test('répartition par bande sur le volume CES', () => {
    // 5 réponses sur 1-7 : 3 faible (1,2,3), 1 moyen (5), 1 élevé (7)
    const r = agregerCES([1, 2, 3, 5, 7], 7);
    expect(r.volume).toBe(5);
    expect(r.faible_effort).toBe(3);
    expect(r.effort_moyen).toBe(1);
    expect(r.effort_eleve).toBe(1);
    expect(r.taux_faible_effort).toBe(60);
    expect(r.taux_effort_eleve).toBe(20);
    expect(r.top_box).toBe(60);
    expect(r.note_effort_moyenne).toBe(3.6);
    expect(r.repartition['1']).toBe(1);
    expect(r.repartition['2']).toBe(1);
    expect(r.repartition['3']).toBe(1);
  });

  test('les réponses hors échelle sont ignorées, jamais comptées au dénominateur', () => {
    const r = agregerCES([1, 2, 3, 8, -1, 2.5], 5);
    expect(r.volume).toBe(3);
    expect(r.faible_effort).toBe(2);
    expect(r.effort_moyen).toBe(1);
  });

  test('score qualité moyen cohérent avec la moyenne d\'effort', () => {
    const facile = agregerCES([1, 1, 1], 5);
    expect(facile.score_qualite_100).toBe(100);
    const difficile = agregerCES([5, 5], 5);
    expect(difficile.score_qualite_100).toBe(0);
  });
});

describe('reconnaitreCES', () => {
  test('mode CES + échelle 1-5 ou 1-7 → échelle', () => {
    expect(reconnaitreCES({ scoring_mode: 'CES', echelle_min: 1, echelle_max: 5 })).toBe(5);
    expect(reconnaitreCES({ scoring_mode: 'ces', echelle_min: 1, echelle_max: 7 })).toBe(7);
  });

  test('type CES sans mode explicite → reconnu', () => {
    expect(reconnaitreCES({ type_reponse: 'CES', echelle_min: 1, echelle_max: 7 })).toBe(7);
  });

  test('autre mode, autre type ou échelle non supportée → null', () => {
    expect(reconnaitreCES({ scoring_mode: 'NUMERIC', echelle_min: 1, echelle_max: 5 })).toBeNull();
    expect(reconnaitreCES({ scoring_mode: 'CES', echelle_min: 0, echelle_max: 5 })).toBeNull();
    expect(reconnaitreCES({ scoring_mode: 'CES', echelle_min: 1, echelle_max: 10 })).toBeNull();
    expect(reconnaitreCES({ scoring_mode: 'CES', echelle_min: 1, echelle_max: null })).toBeNull();
  });

  test('estEchelleCES', () => {
    expect(estEchelleCES(5)).toBe(true);
    expect(estEchelleCES(7)).toBe(true);
    expect(estEchelleCES(6)).toBe(false);
  });
});
