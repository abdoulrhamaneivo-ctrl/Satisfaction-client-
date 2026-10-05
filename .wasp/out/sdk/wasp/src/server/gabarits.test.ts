// src/server/gabarits.test.ts
// ============================================================================
// Task 2 — Gabarits Express-30s / Qualité-45s + option Autre à saisie libre.
// DB-free : specs de seed (verbatim du brief), guard de scoring,
// normalisation + résolution du flow `{optionId, autreTexte}`.
// TDD : ces tests sont écrits AVANT l'implémentation (doivent échouer).
// ============================================================================
import { expect, test, describe } from 'vitest';
import { HttpError } from 'wasp/server';
import {
  estAutreLibre,
  resoudreCases,
  type CritereMoteur,
  type OptionMoteur,
} from '../shared/scoringEngine';
import {
  normaliserEntree,
  resoudreEntree,
  messageAmbigu,
  formaterReponseAutre,
} from './resolutionSoumission';
import { GABARIT_EXPRESS, GABARIT_QUALITE } from './gabarits';

function opt(
  id: string,
  libelle: string,
  extra: Partial<OptionMoteur> = {},
): OptionMoteur {
  return {
    id, libelle, score: null, poids: null,
    est_scorable: false, actif: true, ...extra,
  };
}

// Qualité Q4 : CASES catégoriel avec EXCLUSIF + AUTRE_LIBRE (verbatim brief).
function casProblemes(): CritereMoteur {
  return {
    scoring_mode: 'CASES_CATEGORICAL',
    type_reponse: 'CASES',
    orientation: 'HIGHER_BETTER',
    options: [
      opt('panne', 'Panne réseau / Système indisponible'),
      opt('monnaie', 'Absence monnaie / liquidités'),
      opt('file', 'File mal organisée'),
      opt('aucun', 'Aucun problème', { poids: 0, code_metier: 'EXCLUSIF' }),
      opt('autre', 'Autre (précisez)', { poids: 0, code_metier: 'AUTRE_LIBRE' }),
    ],
  };
}

function casPondere(): CritereMoteur {
  return {
    scoring_mode: 'CASES_WEIGHTED',
    type_reponse: 'CASES',
    orientation: 'HIGHER_BETTER',
    options: [
      opt('att', 'Attente longue', { poids: -20 }),
      opt('info', 'Information insuffisante', { poids: -15 }),
      opt('autre', 'Autre (précisez)', { poids: 0, code_metier: 'AUTRE_LIBRE' }),
    ],
  };
}

function ligneQcmMotif(): any {
  return {
    id: 21,
    type_reponse: 'QCM',
    scoring_mode: null,
    orientation: 'HIGHER_BETTER',
    version: 1,
    options: [
      { id: 'm1', libelle: 'Envoi / Retrait colis ou courrier', score: null, poids: null, est_scorable: false, actif: true, code_metier: null, score_provenance: null },
      { id: 'm9', libelle: 'Autre (précisez)', score: null, poids: 0, est_scorable: false, actif: true, code_metier: 'AUTRE_LIBRE', score_provenance: null },
    ],
  };
}

function ligneCasesProblemes(): any {
  const c = casProblemes();
  return {
    id: 31,
    type_reponse: 'CASES',
    scoring_mode: 'CASES_CATEGORICAL',
    orientation: 'HIGHER_BETTER',
    version: 1,
    options: c.options.map((o) => ({ ...o, score_provenance: null })),
  };
}

describe('estAutreLibre : guard code_metier, jamais EXCLUSIF', () => {
  test('AUTRE_LIBRE détecté (casse/espaces tolérées)', () => {
    expect(estAutreLibre({ id: 'a', libelle: 'Autre (précisez)', score: null, poids: 0, est_scorable: false, actif: true, code_metier: 'AUTRE_LIBRE' })).toBe(true);
    expect(estAutreLibre({ id: 'a', libelle: 'Autre (précisez)', score: null, poids: 0, est_scorable: false, actif: true, code_metier: ' autre_libre ' })).toBe(true);
  });

  test('EXCLUSIF et options normales ne sont jamais Autre', () => {
    const base = { id: 'x', libelle: 'Aucun problème', score: null, poids: 0, est_scorable: false, actif: true };
    expect(estAutreLibre({ ...base, code_metier: 'EXCLUSIF' })).toBe(false);
    expect(estAutreLibre({ ...base, code_metier: null })).toBe(false);
    expect(estAutreLibre({ ...base })).toBe(false);
  });
});

describe('CASES : EXCLUSIF cohabite avec Autre (jamais EXCLUSIVITE_VIOLEE)', () => {
  test('« Aucun problème » + Autre → pas de rejet (NON_NOTABLE catégoriel)', () => {
    const r = resoudreCases(casProblemes(), ['aucun', 'autre']);
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.options_retenues).toEqual(['aucun', 'autre']);
  });

  test('« Aucun problème » + choix normal → toujours rejeté', () => {
    const r = resoudreCases(casProblemes(), ['aucun', 'panne']);
    expect(r.statut).toBe('AMBIGU');
    expect(r.raison).toBe('EXCLUSIVITE_VIOLEE');
  });

  test('« Aucun » + normal + Autre → toujours rejeté (Autre n’excuse pas)', () => {
    const r = resoudreCases(casProblemes(), ['aucun', 'panne', 'autre']);
    expect(r.statut).toBe('AMBIGU');
    expect(r.raison).toBe('EXCLUSIVITE_VIOLEE');
  });
});

describe('CASES WEIGHTED : Autre exclu du score, ids conservés pour stats', () => {
  test('problème (-20) + Autre → 80 (Autre ignoré, pas POIDS_MANQUANTS)', () => {
    const r = resoudreCases(casPondere(), ['att', 'autre']);
    expect(r.statut).toBe('OK');
    expect(r.score_normalise).toBe(80);
    expect(r.score_officiel).toBe(80);
    expect(r.options_retenues).toEqual(['att', 'autre']);
  });

  test('Autre seul en WEIGHTED → NON_NOTABLE (texte libre, pas un 100)', () => {
    const r = resoudreCases(casPondere(), ['autre']);
    expect(r.statut).toBe('NON_NOTABLE');
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
    expect(r.options_retenues).toEqual(['autre']);
  });
});

describe('normaliserEntree : garde optionId(s) + autreTexte nettoyé', () => {
  test('QCM {optionId, autreTexte} conservés, trim + sans séparateurs', () => {
    const e = normaliserEntree({ critereId: 21, optionId: 'm9', autreTexte: '  colis•fragile;urgent|merci ' });
    expect(e.optionId).toBe('m9');
    expect(e.autreTexte).toBe('colis fragile urgent merci');
  });

  test('CASES {optionIds, autreTexte} conservés, plafond 1000', () => {
    const e = normaliserEntree({ critereId: 31, optionIds: ['panne', 'autre'], autreTexte: ` ${'x'.repeat(1500)} ` });
    expect(e.optionIds).toEqual(['panne', 'autre']);
    expect(e.autreTexte).toHaveLength(1000);
  });

  test('sans autreTexte → champ absent (flux existants inchangés)', () => {
    expect(normaliserEntree({ critereId: 21, optionId: 'm1' })).toEqual({ critereId: 21, optionId: 'm1' });
    expect(normaliserEntree({ critereId: 21, optionId: 'm1', autreTexte: '   ' })).toEqual({ critereId: 21, optionId: 'm1' });
  });
});

describe('resoudreEntree : Autre → NON_NOTABLE + AUTRE::verbatim', () => {
  test('QCM Motif Autre → NON_NOTABLE, texte AUTRE::verbatim, id retenu', () => {
    const r = resoudreEntree(
      ligneQcmMotif(),
      normaliserEntree({ critereId: 21, optionId: 'm9', autreTexte: 'colis fragile' }),
    );
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
    expect(r.score_source).toBeNull();
    expect(r.texte).toBe('AUTRE::colis fragile');
    expect(r.optionsRetnues).toEqual(['m9']);
  });

  test('QCM choix normal : aucun préfixe AUTRE, comportement inchangé', () => {
    const r = resoudreEntree(ligneQcmMotif(), normaliserEntree({ critereId: 21, optionId: 'm1' }));
    expect(r.score_officiel).toBeNull();
    expect(r.texte).toBeUndefined();
    expect(r.optionsRetnues).toEqual(['m1']);
  });

  test('CASES [panne, Autre] + verbatim → NON_NOTABLE, libellé non-Autre + AUTRE::verbatim', () => {
    const r = resoudreEntree(
      ligneCasesProblemes(),
      normaliserEntree({ critereId: 31, optionIds: ['panne', 'autre'], autreTexte: 'clim en panne' }),
    );
    expect(r.score_officiel).toBeNull();
    expect(r.score_normalise).toBeNull();
    expect(r.texte).toBe('AUTRE::clim en panne');
    expect(r.libelleOption).toBe('Panne réseau / Système indisponible');
    expect(r.optionsRetnues).toEqual(['panne', 'autre']);
  });

  test('CASES Autre seul + verbatim → NON_NOTABLE + AUTRE::verbatim', () => {
    const r = resoudreEntree(
      ligneCasesProblemes(),
      normaliserEntree({ critereId: 31, optionIds: ['autre'], autreTexte: 'rideau fermé' }),
    );
    expect(r.score_officiel).toBeNull();
    expect(r.texte).toBe('AUTRE::rideau fermé');
    expect(r.optionsRetnues).toEqual(['autre']);
  });
});

describe('review r1 (F1, fail-closed) : Autre sans verbatim → 400 AUTRE_VERBATIM_MANQUANT', () => {
  test('QCM Autre via API directe sans verbatim → 400 (jamais de commentaire vide)', () => {
    expect(() =>
      resoudreEntree(ligneQcmMotif(), normaliserEntree({ critereId: 21, optionId: 'm9' })),
    ).toThrowError(HttpError);
    try {
      resoudreEntree(ligneQcmMotif(), normaliserEntree({ critereId: 21, optionId: 'm9' }));
      expect.unreachable('aurait dû lever 400');
    } catch (e: any) {
      expect(e?.statusCode ?? e?.status).toBe(400);
      expect(String(e?.message ?? '')).toMatch(/précisez/);
    }
  });

  test('QCM Autre avec verbatim espaces seuls → 400 (normalisé à vide)', () => {
    expect(() =>
      resoudreEntree(
        ligneQcmMotif(),
        normaliserEntree({ critereId: 21, optionId: 'm9', autreTexte: '   ' }),
      ),
    ).toThrowError(HttpError);
  });

  test('CASES [panne, Autre] sans verbatim → 400', () => {
    expect(() =>
      resoudreEntree(
        ligneCasesProblemes(),
        normaliserEntree({ critereId: 31, optionIds: ['panne', 'autre'] }),
      ),
    ).toThrowError(HttpError);
  });

  test('CASES Autre seul sans verbatim → 400', () => {
    expect(() =>
      resoudreEntree(
        ligneCasesProblemes(),
        normaliserEntree({ critereId: 31, optionIds: ['autre'] }),
      ),
    ).toThrowError(HttpError);
  });

  test('CASES legacy texte « Autre (précisez) » sans verbatim → 400', () => {
    expect(() =>
      resoudreEntree(
        ligneCasesProblemes(),
        normaliserEntree({ critereId: 31, texte: 'Autre (précisez)' }),
      ),
    ).toThrowError(HttpError);
  });

  test('CASES sans Autre et sans verbatim : comportement inchangé (pas de 400)', () => {
    const r = resoudreEntree(
      ligneCasesProblemes(),
      normaliserEntree({ critereId: 31, optionIds: ['panne'] }),
    );
    expect(r.score_officiel).toBeNull();
    expect(r.optionsRetnues).toEqual(['panne']);
  });

  test('messageAmbigu AUTRE_VERBATIM_MANQUANT : message actionnable', () => {
    expect(messageAmbigu('AUTRE_VERBATIM_MANQUANT', 'QCM')).toMatch(/précisez/);
  });
});

describe('review r1 (F5) : formaterReponseAutre centralisé', () => {
  test('marqueur + libellé → concaténés, jamais de AUTRE:: exposé', () => {
    expect(formaterReponseAutre('Panne réseau', 'AUTRE::clim HS')).toBe(
      'Panne réseau • Autre — "clim HS"',
    );
    expect(formaterReponseAutre('', 'AUTRE::rideau fermé')).toBe('Autre — "rideau fermé"');
    expect(formaterReponseAutre(undefined, 'AUTRE::x')).toBe('Autre — "x"');
  });

  test('sans marqueur → null (flux existants inchangés)', () => {
    expect(formaterReponseAutre('Panne réseau', 'verbatim brut')).toBeNull();
    expect(formaterReponseAutre('Panne réseau', undefined)).toBeNull();
    expect(formaterReponseAutre(null, null)).toBeNull();
  });
});

describe('gabarits seedés : valeurs exactes verbatim (brief Task 2)', () => {
  test('Express-30s : 4 critères exacts, Attente non scorable, Motif + AUTRE_LIBRE', () => {
    expect(GABARIT_EXPRESS.libelle_service).toBe('Express-30s');
    expect(GABARIT_EXPRESS.criteres).toHaveLength(4);
    const [smiley, attente, motif, texte] = GABARIT_EXPRESS.criteres;
    expect(smiley.type_reponse).toBe('SMILEY');
    expect(smiley.libelle_critere).toBe("Passage aujourd'hui");
    expect(smiley.obligatoire).toBe(true);
    expect(attente.libelle_critere).toBe('Attente');
    expect(attente.type_reponse).toBe('QCM');
    expect(attente.options.map((o) => o.libelle)).toEqual([
      'Moins de 10 min', 'Entre 10 et 30 min', 'Plus de 30 min',
    ]);
    expect(attente.options.every((o) => o.est_scorable === false)).toBe(true);
    expect(motif.libelle_critere).toBe('Motif');
    expect(motif.type_reponse).toBe('QCM');
    expect(motif.options.map((o) => o.libelle)).toEqual([
      'Envoi / Retrait colis ou courrier',
      'Services financiers / Mandat / Paiement',
      'Boîte postale / Gestion de compte',
      'Autre (précisez)',
    ]);
    const autre = motif.options[3];
    expect(autre.code_metier).toBe('AUTRE_LIBRE');
    expect(autre.est_scorable).toBe(false);
    expect(autre.score).toBeNull();
    expect(autre.poids).toBe(0);
    expect(texte.type_reponse).toBe('TEXTE');
    expect(texte.libelle_critere).toBe('Commentaire ou suggestion');
    expect(texte.obligatoire).toBe(false);
  });

  test('Qualité-45s : 4 critères exacts, CASES catégoriel EXCLUSIF + AUTRE_LIBRE', () => {
    expect(GABARIT_QUALITE.libelle_service).toBe('Qualité-45s');
    expect(GABARIT_QUALITE.criteres).toHaveLength(4);
    const [efficace, politesse, nps, problemes] = GABARIT_QUALITE.criteres;
    expect(efficace.type_reponse).toBe('SMILEY');
    expect(efficace.libelle_critere).toBe("L'agent au guichet a-t-il répondu efficacement à votre demande ?");
    expect(politesse.libelle_critere).toBe('Politesse et clarté');
    expect(nps.type_reponse).toBe('NPS');
    expect(nps.libelle_critere).toBe('Recommanderiez-vous');
    expect(problemes.type_reponse).toBe('CASES');
    expect(problemes.scoring_mode).toBe('CASES_CATEGORICAL');
    expect(problemes.libelle_critere).toBe('Problème spécifique');
    expect(problemes.options.map((o) => o.libelle)).toEqual([
      'Panne réseau / Système indisponible',
      'Absence monnaie / liquidités',
      'File mal organisée',
      'Aucun problème',
      'Autre (précisez)',
    ]);
    expect(problemes.options[3].code_metier).toBe('EXCLUSIF');
    const autre = problemes.options[4];
    expect(autre.code_metier).toBe('AUTRE_LIBRE');
    expect(autre.est_scorable).toBe(false);
    expect(autre.score).toBeNull();
    expect(autre.poids).toBe(0);
    // 1 seul Autre par critère, jamais EXCLUSIF.
    for (const c of [...GABARIT_EXPRESS.criteres, ...GABARIT_QUALITE.criteres]) {
      const autres = c.options.filter((o) => o.code_metier === 'AUTRE_LIBRE');
      expect(autres.length).toBeLessThanOrEqual(1);
      for (const a of autres) expect(a.code_metier).not.toBe('EXCLUSIF');
    }
  });
});
