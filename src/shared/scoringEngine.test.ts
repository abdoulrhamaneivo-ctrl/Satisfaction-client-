// src/shared/scoringEngine.test.ts
// Tests du moteur déterministe (§60-64 du cahier + critères d'arrêt vague 1).
// Règle d'or : AUCUN test ne dépend de l'ordre d'affichage — chaque cas
// rejoue les ordres normal / inversé / aléatoire avec les mêmes attentes.
import { expect, test, describe } from 'vitest';
import {
  resoudreReponse,
  resoudreChoixUnique,
  resoudreBinaire,
  resoudreNumerique,
  resoudreCES,
  resoudreNPS,
  resoudreCases,
  resoudreCasesMoyenne,
  resoudreTexte,
  agregerNPS,
  note5Vers100,
  echelleVers100,
  type CritereMoteur,
  type OptionMoteur,
} from './scoringEngine';
import { infererScoresOptions, normaliserLibelle } from './scoringQCM';
// NOTE : en production (Phase D), le moteur reçoit normaliserLibelle pour
// la détection d'exclusivité — les tests passent donc la vraie fonction
// (le normaliseur par défaut ne retire pas les accents).

function opt(
  id: string,
  libelle: string,
  score: number | null,
  extra: Partial<OptionMoteur> = {},
): OptionMoteur {
  return {
    id, libelle, score, poids: null,
    est_scorable: score != null, actif: true, ...extra,
  };
}

// §61 : 5 niveaux, trois ordres → mêmes scores. Jamais index+1.
const LIBELLES_5 = ['Très satisfait', 'Neutre', 'Très insatisfait', 'Satisfait', 'Insatisfait'];
const SCORES_5 = [5, 3, 1, 4, 2];

function critere5(ordre: string[]): CritereMoteur {
  return {
    scoring_mode: 'ORDINAL',
    type_reponse: 'QCM',
    orientation: 'HIGHER_BETTER',
    options: ordre.map((libelle, i) => ({
      id: `opt-${libelle}`,
      libelle,
      score: SCORES_5[LIBELLES_5.indexOf(libelle)],
      poids: null,
      est_scorable: true,
      actif: true,
      // ordre_affichage = position visuelle : le moteur doit l'IGNORER.
      ...{ ordre_affichage: i },
    })),
  };
}

describe('§61 ordinal : ordre libre, scores stables', () => {
  const ordres = [
    [...LIBELLES_5],
    [...LIBELLES_5].reverse(),
    ['Insatisfait', 'Très satisfait', 'Neutre', 'Très insatisfait', 'Satisfait'],
  ];
  const attenduParLibelle = new Map(LIBELLES_5.map((l, i) => [l, SCORES_5[i]]));

  for (const ordre of ordres) {
    test(`ordre [${ordre.join(' | ')}]`, () => {
      const c = critere5(ordre);
      for (const libelle of LIBELLES_5) {
        const r = resoudreReponse(c, { type: 'option', optionId: `opt-${libelle}` });
        expect(r.statut).toBe('OK');
        expect(r.score_officiel).toBe(attenduParLibelle.get(libelle));
        expect(r.score_normalise).toBeCloseTo(
          ((attenduParLibelle.get(libelle) as number) - 1) * 25, 9,
        );
      }
    });
  }

  test('cohérence avec inférence lexicale', () => {
    expect(infererScoresOptions(LIBELLES_5)).toEqual(SCORES_5);
  });
});

describe('§60 scoring : cas limites', () => {
  test('3 niveaux', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Mal', 1), opt('b', 'Moyen', 2), opt('c', 'Bien', 3)],
    };
    expect(resoudreChoixUnique(c, 'c').score_officiel).toBe(3);
    expect(resoudreChoixUnique(c, 'a').score_normalise).toBeCloseTo(0, 9);
    expect(resoudreChoixUnique(c, 'c').score_normalise).toBeCloseTo(50, 9);
  });

  test('7 niveaux (échelle large, pas de 1..5 imposé)', () => {
    const options = [1, 2, 3, 4, 5, 6, 7].map((s) => opt(`n${s}`, `Niveau ${s}`, s));
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER', options,
    };
    const r = resoudreChoixUnique(c, 'n7');
    expect(r.score_officiel).toBe(7);
    expect(r.score_normalise).toBeCloseTo(100, 9);
    expect(resoudreChoixUnique(c, 'n1').score_normalise).toBeCloseTo(0, 9);
    expect(resoudreChoixUnique(c, 'n4').score_normalise).toBeCloseTo(50, 9);
  });

  test('10 niveaux', () => {
    const options = Array.from({ length: 10 }, (_, i) => opt(`x${i + 1}`, `Note ${i + 1}`, i + 1));
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER', options,
    };
    expect(resoudreChoixUnique(c, 'x10').score_normalise).toBeCloseTo(100, 9);
  });

  test('accents / casse / espaces : identité par id, pas par texte', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('id-stable-1', '  TRÈS   Satisfait ', 5)],
    };
    const r = resoudreChoixUnique(c, 'id-stable-1');
    expect(r.statut).toBe('OK');
    expect(r.score_officiel).toBe(5);
  });

  test('option inconnue → AMBIGU (jamais deviné)', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Oui', 5)],
    };
    const r = resoudreChoixUnique(c, 'opt-inexistante');
    expect(r.statut).toBe('AMBIGU');
    expect(r.raison).toBe('OPTION_INCONNUE');
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
  });

  test('option inactive (retirée après collecte) → AMBIGU', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Ancien choix', 4, { actif: false })],
    };
    const r = resoudreChoixUnique(c, 'a');
    expect(r.statut).toBe('AMBIGU');
    expect(r.raison).toBe('OPTION_INACTIVE');
  });

  test('option non scorable → NON_NOTABLE (pas une erreur)', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Autre (préciser)', null, { est_scorable: false })],
    };
    const r = resoudreChoixUnique(c, 'a');
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.score_officiel).toBeNull();
    expect(r.options_retenues).toEqual(['a']);
  });

  test('mode inconnu → AMBIGU', () => {
    const c: CritereMoteur = {
      scoring_mode: 'MAGIQUE', type_reponse: 'QCM', orientation: 'HIGHER_BETTER', options: [],
    };
    expect(resoudreReponse(c, { type: 'option', optionId: 'x' }).raison).toBe('MODE_INCONNU');
  });

  test('entrée incompatible → AMBIGU', () => {
    const c: CritereMoteur = {
      scoring_mode: 'ORDINAL', type_reponse: 'QCM', orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Oui', 5)],
    };
    expect(resoudreReponse(c, { type: 'valeur', valeur: 3 }).raison).toBe('ENTREE_INCOMPATIBLE');
  });
});

describe('§6 binaire : orientation du critère', () => {
  test('« Satisfait ? » Oui=5, Non=1', () => {
    expect(resoudreBinaire({ orientation: 'HIGHER_BETTER' }, true).score_officiel).toBe(5);
    expect(resoudreBinaire({ orientation: 'HIGHER_BETTER' }, false).score_officiel).toBe(1);
    expect(resoudreBinaire({ orientation: 'HIGHER_BETTER' }, true).score_normalise).toBe(100);
    expect(resoudreBinaire({ orientation: 'HIGHER_BETTER' }, false).score_normalise).toBe(0);
  });

  test('« Problème rencontré ? » Oui=1, Non=5 (LOWER_BETTER)', () => {
    expect(resoudreBinaire({ orientation: 'LOWER_BETTER' }, true).score_officiel).toBe(1);
    expect(resoudreBinaire({ orientation: 'LOWER_BETTER' }, false).score_officiel).toBe(5);
  });
});

describe('§7 numérique / échelle', () => {
  const echelle10 = { orientation: 'HIGHER_BETTER' as const, echelle_min: 1, echelle_max: 10 };

  test('8/10 → 77.77…/100, officiel 8', () => {
    const r = resoudreNumerique(echelle10, 8);
    expect(r.statut).toBe('OK');
    expect(r.score_officiel).toBe(8);
    expect(r.score_normalise).toBeCloseTo(echelleVers100(8, 1, 10), 9);
    expect(r.score_normalise).toBeCloseTo(77.777, 2);
  });

  test('orientation inverse : 8/10 → 22.22/100', () => {
    const r = resoudreNumerique(
      { orientation: 'LOWER_BETTER', echelle_min: 1, echelle_max: 10 }, 8,
    );
    expect(r.score_normalise).toBeCloseTo(22.222, 2);
  });

  test('0-10 et 0-100 supportés', () => {
    expect(
      resoudreNumerique({ orientation: 'HIGHER_BETTER', echelle_min: 0, echelle_max: 10 }, 0)
        .score_normalise,
    ).toBe(0);
    expect(
      resoudreNumerique({ orientation: 'HIGHER_BETTER', echelle_min: 0, echelle_max: 100 }, 100)
        .score_normalise,
    ).toBe(100);
  });

  test('hors bornes / non entier / mal configurée → AMBIGU', () => {
    expect(resoudreNumerique(echelle10, 11).raison).toBe('ECHELLE_HORS_BORNES');
    expect(resoudreNumerique(echelle10, 7.5).raison).toBe('VALEUR_NON_ENTIERE');
    expect(
      resoudreNumerique({ orientation: 'HIGHER_BETTER', echelle_min: 5, echelle_max: 5 }, 5).raison,
    ).toBe('ECHELLE_MAL_CONFIGUREE');
  });

  test('note5Vers100 : 1→0, 3→50, 5→100', () => {
    expect(note5Vers100(1)).toBe(0);
    expect(note5Vers100(3)).toBe(50);
    expect(note5Vers100(5)).toBe(100);
  });
});

describe('§9 + §64 NPS natif', () => {
  test.each([
    [0, 'DETRACTEUR'],
    [6, 'DETRACTEUR'],
    [7, 'PASSIF'],
    [8, 'PASSIF'],
    [9, 'PROMOTEUR'],
    [10, 'PROMOTEUR'],
  ])('valeur %i → %s', (v, cat) => {
    const r = resoudreNPS(v);
    expect(r.statut).toBe('OK');
    expect(r.categorie_nps).toBe(cat);
    expect(r.score_officiel).toBe(v);
    expect(r.score_normalise).toBe(v * 10);
  });

  test('hors bornes → AMBIGU', () => {
    expect(resoudreNPS(-1).statut).toBe('AMBIGU');
    expect(resoudreNPS(11).raison).toBe('NPS_HORS_BORNES');
  });

  test('agrégation : %prom − %detr, jamais une moyenne', () => {
    // 4 prom (9,10,9,10), 2 passifs (7,8), 4 détracteurs (0..6) → 40 − 40 = 0
    const a = agregerNPS([9, 10, 9, 10, 7, 8, 6, 5, 2, 0]);
    expect(a.volume).toBe(10);
    expect(a.promoteurs).toBe(4);
    expect(a.passifs).toBe(2);
    expect(a.detracteurs).toBe(4);
    expect(a.nps).toBe(0);
    const b = agregerNPS([10, 10, 10, 0]);
    expect(b.nps).toBe(50); // 75 − 25
    expect(agregerNPS([]).nps).toBeNull();
  });
});

describe('§10 + §63 CASES', () => {
  const motifs = (mode: string | null): CritereMoteur => ({
    scoring_mode: mode,
    type_reponse: 'CASES',
    orientation: 'HIGHER_BETTER',
    options: [
      opt('retrait', 'Retrait', null, { est_scorable: false }),
      opt('depot', 'Dépôt', null, { est_scorable: false }),
      opt('recla', 'Réclamation', null, { est_scorable: false }),
    ],
  });

  test('CASES_CATEGORICAL : jamais noté, ids retenus pour stats %', () => {
    const r = resoudreCases(motifs('CASES_CATEGORICAL'), ['retrait', 'depot']);
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
    expect(r.options_retenues).toEqual(['retrait', 'depot']);
  });

  test('CASES sans scores → NON_NOTABLE par défaut (pas de moyenne inventée)', () => {
    const r = resoudreCases(motifs(null), ['retrait']);
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.raison).toBe('CASES_NON_VALENCE');
  });

  test('CASES_WEIGHTED : 100 − 20 − 15 = 65/100, officiel 3', () => {
    const c: CritereMoteur = {
      scoring_mode: 'CASES_WEIGHTED',
      type_reponse: 'CASES',
      orientation: 'HIGHER_BETTER',
      options: [
        opt('att', 'Attente longue', null, { poids: -20 }),
        opt('pers', 'Personnel désagréable', null, { poids: -35 }),
        opt('info', 'Information insuffisante', null, { poids: -15 }),
        opt('aucun', 'Aucun problème', null, { poids: 0, code_metier: 'EXCLUSIF' }),
      ],
    };
    const r = resoudreCases(c, ['att', 'info']);
    expect(r.statut).toBe('OK');
    expect(r.score_normalise).toBe(65);
    expect(r.score_officiel).toBe(3);
    expect(r.source).toBe('EXPLICIT');
    // « Aucun » seul → 100/100
    const seul = resoudreCases(c, ['aucun']);
    expect(seul.score_normalise).toBe(100);
    expect(seul.score_officiel).toBe(5);
  });

  test('WEIGHTED clampé 0-100', () => {
    const c: CritereMoteur = {
      scoring_mode: 'CASES_WEIGHTED',
      type_reponse: 'CASES',
      orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Grave', null, { poids: -120 })],
    };
    const r = resoudreCases(c, ['a']);
    expect(r.score_normalise).toBe(0);
    expect(r.score_officiel).toBe(1);
  });

  test('WEIGHTED sans poids → AMBIGU (config incomplète, pas de devinette)', () => {
    const c: CritereMoteur = {
      scoring_mode: 'CASES_WEIGHTED',
      type_reponse: 'CASES',
      orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Flou', null)],
    };
    expect(resoudreCases(c, ['a']).raison).toBe('POIDS_MANQUANTS');
  });

  test('« Aucun » + autre choix → AMBIGU (exclusivité)', () => {
    const c: CritereMoteur = {
      scoring_mode: 'CASES_WEIGHTED',
      type_reponse: 'CASES',
      orientation: 'HIGHER_BETTER',
      options: [
        opt('att', 'Attente longue', null, { poids: -20 }),
        opt('aucun', 'Aucun problème', null, { poids: 0 }),
      ],
    };
    expect(resoudreCases(c, ['aucun', 'att'], 'INFERRED', normaliserLibelle).raison).toBe(
      'EXCLUSIVITE_VIOLEE',
    );
  });

  test('sélection vide / option inconnue → AMBIGU', () => {
    const c = motifs('CASES_CATEGORICAL');
    expect(resoudreCases(c, []).raison).toBe('SELECTION_VIDE');
    expect(resoudreCases(c, ['fantome']).raison).toBe('OPTION_INCONNUE');
  });

  test('compat legacy : moyenne arrondie des cochés scorés', () => {
    const c: CritereMoteur = {
      scoring_mode: null,
      type_reponse: 'CASES',
      orientation: 'HIGHER_BETTER',
      options: [opt('a', 'Bon', 4), opt('b', 'Excellent', 5), opt('x', 'Autre', null, { est_scorable: false })],
    };
    const r = resoudreCasesMoyenne(c, ['a', 'b']);
    expect(r.statut).toBe('OK');
    expect(r.score_officiel).toBe(5); // (4+5)/2 = 4.5 → 5
    const seul = resoudreCasesMoyenne(c, ['x']);
    expect(seul.statut).toBe('NON_NOTABLE');
  });
});

describe('§11 TEXTE : jamais une note', () => {
  test('TEXTE → NULL + NULL, même avec un long commentaire', () => {
    const r = resoudreTexte();
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
    expect(r.source).toBeNull();
  });

  test('dispatcher FREE_TEXT', () => {
    const c: CritereMoteur = {
      scoring_mode: null, type_reponse: 'TEXTE', orientation: 'HIGHER_BETTER', options: [],
    };
    const r = resoudreReponse(c, { type: 'texte', texte: 'Le personnel était très gentil mais 50 min.' });
    expect(r.statut).toBe('NON_NOTABLE');
  });
});

describe('dispatcher : déduction du type', () => {
  const base: Omit<CritereMoteur, 'type_reponse'> = {
    scoring_mode: null, orientation: 'HIGHER_BETTER',
    options: [opt('o', 'Oui', 5)],
  };

  test('QCM→ORDINAL, OUI_NON→BINARY, ECHELLE→NUMERIC, SMILEY, NPS', () => {
    expect(resoudreReponse({ ...base, type_reponse: 'QCM' }, { type: 'option', optionId: 'o' }).statut).toBe('OK');
    expect(
      resoudreReponse({ ...base, type_reponse: 'OUI_NON' }, { type: 'binaire', valeurOui: true })
        .score_officiel,
    ).toBe(5);
    expect(
      resoudreReponse(
        { ...base, type_reponse: 'ECHELLE', echelle_min: 1, echelle_max: 5 },
        { type: 'valeur', valeur: 4 },
      ).score_normalise,
    ).toBeCloseTo(75, 9);
    expect(
      resoudreReponse({ ...base, type_reponse: 'SMILEY' }, { type: 'option', optionId: 'o' }).statut,
    ).toBe('OK');
    expect(
      resoudreReponse({ ...base, type_reponse: 'NPS' }, { type: 'valeur', valeur: 9 })
        .categorie_nps,
    ).toBe('PROMOTEUR');
  });
});

describe('CES : effort perçu, sens imposé', () => {
  const ces = (max: number, orientation: any = 'HIGHER_BETTER'): CritereMoteur => ({
    scoring_mode: 'CES',
    type_reponse: 'ECHELLE',
    orientation,
    echelle_min: 1,
    echelle_max: max,
    options: [],
  });

  test('effort 1 = 100, effort max = 0 (inversion de l\'échelle CSAT)', () => {
    expect(resoudreCES(ces(5), 1).score_normalise).toBe(100);
    expect(resoudreCES(ces(5), 5).score_normalise).toBe(0);
    expect(resoudreCES(ces(7), 1).score_normalise).toBe(100);
    expect(resoudreCES(ces(7), 7).score_normalise).toBe(0);
  });

  test('orientation HIGH...ISIBLE ignorée : le sens vient de la mesure', () => {
    const r = resoudreCES(ces(7, 'HIGHER_BETTER'), 2);
    expect(r.statut).toBe('OK');
    // (7-2)/6 = 83.33 — et non 16.67 : l'admin ne peut pas inverser le CES.
    expect(r.score_normalise).toBeCloseTo(83.3333, 3);
  });

  test('hors bornes / non entier → AMBIGU, jamais de score approché', () => {
    expect(resoudreCES(ces(5), 0).raison).toBe('ECHELLE_HORS_BORNES');
    expect(resoudreCES(ces(5), 6).raison).toBe('ECHELLE_HORS_BORNES');
    expect(resoudreCES(ces(5), 2.5).raison).toBe('VALEUR_NON_ENTIERE');
  });

  test('échelle non supportée (1-10, 0-5, min≠1) → AMBIGU de configuration', () => {
    const mauvaise = (min: number, max: number): CritereMoteur => ({
      scoring_mode: 'CES', type_reponse: 'ECHELLE', orientation: 'LOWER_BETTER',
      echelle_min: min, echelle_max: max, options: [],
    });
    for (const [min, max] of [[1, 10], [0, 5], [2, 7], [1, 6]] as const) {
      const r = resoudreCES(mauvaise(min as number, max as number), 3);
      expect(r.statut).toBe('AMBIGU');
      expect(r.raison).toBe('ECHELLE_CES_INVALIDE');
      expect(r.score_normalise).toBeNull();
    }
  });

  test('dispatcher : mode CES gagne sur le type ECHELLE', () => {
    const r = resoudreReponse(ces(5), { type: 'valeur', valeur: 1 });
    expect(r.statut).toBe('OK');
    expect(r.source).toBe('EXPLICIT');
    expect(r.score_normalise).toBe(100);
  });

  test('entrée incompatible (option au lieu d\'une valeur) → AMBIGU', () => {
    expect(resoudreReponse(ces(5), { type: 'option', optionId: 'o' }).raison).toBe('ENTREE_INCOMPATIBLE');
  });

  test('type CES sans mode explicite → traité en CES', () => {
    const c: CritereMoteur = {
      scoring_mode: null, type_reponse: 'CES', orientation: 'HIGHER_BETTER',
      echelle_min: 1, echelle_max: 5, options: [],
    };
    expect(resoudreReponse(c, { type: 'valeur', valeur: 1 }).score_normalise).toBe(100);
  });
});
