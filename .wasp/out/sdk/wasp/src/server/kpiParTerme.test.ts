// src/server/kpiParTerme.test.ts
// ============================================================================
// Task 3 — KPI par terme + UI dashboard. TDD : ces tests sont écrits AVANT
// l'implémentation (doivent échouer : `src/server/kpiParTerme.ts` n'existe
// pas encore).
//
// Règles verrouillées (plan global) :
// - `score_normalise` seul pour les moyennes, jamais `score_brut` ;
// - satisfaction seule (SMILEY + scorés valencés) : TEXTE/QCM/CASES/NPS/CES
//   exclus via `estCritereSatisfaction` ;
// - NPS = %promoteurs − %détracteurs via `agregerNPS`, jamais une moyenne ;
// - seuil d'affichage n>=5 → métriques à null (jamais de % sur 2 avis).
// ============================================================================
// C2/C6a : variables d'environnement requises pour les actions/queries.
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.TOTP_ENCRYPTION_KEY = 'b'.repeat(32);
process.env.ANTI_REPLAY_SALT = 'c'.repeat(32);
process.env.TELEPHONE_HASH_SALT = 'd'.repeat(32);

import { describe, expect, test } from 'vitest';
import { agregerNPS } from '../shared/scoringEngine';
import {
  SEUIL_KPI_N,
  NB_JOURS_DEFAUT,
  NB_MOIS_DEFAUT,
  normaliserNbJours,
  normaliserNbMois,
  classifierCritere,
  noteDepuisNormalise,
  agregerLignesCritere,
  repartirOptionsParAvis,
  reconnaitreEchelleCES,
  agregerLignesCES,
  cleMois,
  libelleMois,
  moisGlissants,
  construireTendance,
} from './kpiParTerme';

// ── Fabriques ───────────────────────────────────────────────────────────────

const SMILEY = { type_reponse: 'SMILEY', scoring_mode: null };
const TEXTE = { type_reponse: 'TEXTE', scoring_mode: 'FREE_TEXT' };
const NPS = { type_reponse: 'NPS', scoring_mode: 'NPS' };
const QCM_CAT = { type_reponse: 'QCM', scoring_mode: null };
const CASES_CAT = { type_reponse: 'CASES', scoring_mode: 'CASES_CATEGORICAL' };
const CES = { type_reponse: 'CES', scoring_mode: 'CES', options_reponse: '1,5' };

function ligne(id: number, soumission: string, normalise: number | null, critere: any = SMILEY, extra: any = {}) {
  return { id, id_soumission: soumission, score_normalise: normalise, score_brut: null, critere, ...extra };
}

// ── Step 1a : moyenne par critère, satisfaction seule ───────────────────────

describe('agregerLignesCritere : moyenne par critère (satisfaction seule)', () => {
  test('5 notes SMILEY /100 → moyenne /5 + satisfaction + distribution', () => {
    const lignes = [100, 80, 60, 40, 20].map((n, i) => ligne(i + 1, `s${i + 1}`, n));
    const a = agregerLignesCritere(lignes);
    expect(a.nb_avis).toBe(5);
    expect(a.nb_notables).toBe(5);
    // notes /5 : 5, 4, 3, 2, 1 → moyenne 3.0, >=4 : 2/5 = 40 %.
    expect(a.moyenne_sur5).toBe(3.0);
    expect(a.satisfaction_pct).toBe(40.0);
    expect(a.distribution).toEqual({ '1': 1, '2': 1, '3': 1, '4': 1, '5': 1 });
  });

  test('TEXTE et NPS exclus même avec un score_normalise renseigné', () => {
    const lignes = [
      ligne(1, 's1', 100, SMILEY),
      ligne(2, 's2', 80, SMILEY),
      ligne(3, 's3', 60, SMILEY),
      ligne(4, 's4', 40, SMILEY),
      ligne(5, 's5', 20, SMILEY),
      // Lignes intruses : ne doivent peser ni dans nb_notables ni dans la moyenne.
      ligne(6, 's6', 100, TEXTE),
      { ...ligne(7, 's7', 100, NPS), score_officiel: 10 },
    ];
    const a = agregerLignesCritere(lignes);
    expect(a.nb_avis).toBe(7);
    expect(a.nb_notables).toBe(5);
    expect(a.moyenne_sur5).toBe(3.0);
    expect(a.satisfaction_pct).toBe(40.0);
  });

  test('QCM / CASES catégoriels et CES exclus de la moyenne', () => {
    const lignes = [
      ligne(1, 's1', 100, SMILEY),
      ligne(2, 's2', 0, QCM_CAT),
      ligne(3, 's3', 0, CASES_CAT),
      { ...ligne(4, 's4', 0, CES), score_officiel: 1 },
    ];
    const a = agregerLignesCritere(lignes);
    expect(a.nb_notables).toBe(1);
    // n < 5 → null (seuil), pas une moyenne sur 1 avis.
    expect(a.moyenne_sur5).toBeNull();
    expect(a.satisfaction_pct).toBeNull();
  });
});

// ── Step 1b : score_normalise seul (jamais score_brut) ──────────────────────

describe('noteDepuisNormalise : score_normalise seul', () => {
  test('sans score_normalise → null même si score_brut = 5 (pas de repli)', () => {
    expect(noteDepuisNormalise({ score_normalise: null, score_brut: 5, critere: SMILEY } as any)).toBeNull();
    expect(noteDepuisNormalise({ score_normalise: undefined, score_brut: 3, critere: SMILEY } as any)).toBeNull();
  });

  test('0/100 → 1/5 (borne basse, jamais 0 étoile)', () => {
    expect(noteDepuisNormalise({ score_normalise: 0, score_brut: 1, critere: SMILEY } as any)).toBe(1);
  });

  test('non-satisfaction → null quel que soit le score', () => {
    expect(noteDepuisNormalise({ score_normalise: 100, critere: NPS } as any)).toBeNull();
    expect(noteDepuisNormalise({ score_normalise: 100, critere: TEXTE } as any)).toBeNull();
    expect(noteDepuisNormalise({ score_normalise: 100, critere: QCM_CAT } as any)).toBeNull();
    expect(noteDepuisNormalise({ score_normalise: 100, critere: CES } as any)).toBeNull();
  });
});

// ── Step 1c : seuil n>=5 → null ─────────────────────────────────────────────

describe('seuil de significativité n>=5', () => {
  test('SEUIL_KPI_N vaut 5', () => {
    expect(SEUIL_KPI_N).toBe(5);
  });

  test('4 avis → moyenne et satisfaction à null, distribution conservée', () => {
    const lignes = [100, 100, 100, 100].map((n, i) => ligne(i + 1, `s${i + 1}`, n));
    const a = agregerLignesCritere(lignes);
    expect(a.nb_notables).toBe(4);
    expect(a.moyenne_sur5).toBeNull();
    expect(a.satisfaction_pct).toBeNull();
    expect(a.distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 4 });
  });

  test('répartition : pct à null sous le seuil, effectifs conservés', () => {
    const selections = [
      { id: 1, id_soumission: 'a', options: ['x'] },
      { id: 2, id_soumission: 'b', options: ['x'] },
      { id: 3, id_soumission: 'c', options: ['y'] },
    ];
    const r = repartirOptionsParAvis(selections, [
      { id: 'x', libelle: 'X' },
      { id: 'y', libelle: 'Y' },
    ]);
    expect(r.nb_avis).toBe(3);
    expect(r.options.find((o) => o.option_id === 'x')!.nb).toBe(2);
    expect(r.options.every((o) => o.pct === null)).toBe(true);
  });
});

// ── Step 1d : % par option, bon dénominateur ─────────────────────────────────

describe('repartirOptionsParAvis : % par option (dénominateur = avis)', () => {
  test('chaque avis compte 1 même en CASES multi-choix ; option sans vote à 0', () => {
    // 10 avis : A coché par v1..v6 (v6 coche aussi B), B par v6+v7, C par v8.
    const selections = [
      { id: 1, id_soumission: 'v1', options: ['a'] },
      { id: 2, id_soumission: 'v2', options: ['a'] },
      { id: 3, id_soumission: 'v3', options: ['a'] },
      { id: 4, id_soumission: 'v4', options: ['a'] },
      { id: 5, id_soumission: 'v5', options: ['a'] },
      { id: 6, id_soumission: 'v6', options: ['a', 'b'] },
      { id: 7, id_soumission: 'v7', options: ['b'] },
      { id: 8, id_soumission: 'v8', options: ['c'] },
      { id: 9, id_soumission: 'v9', options: [] },
      { id: 10, id_soumission: 'v10', options: [] },
    ];
    const r = repartirOptionsParAvis(selections, [
      { id: 'a', libelle: 'A' },
      { id: 'b', libelle: 'B' },
      { id: 'c', libelle: 'C' },
      { id: 'd', libelle: 'D' },
    ]);
    // Dénominateur = 10 avis (pas 11 coches).
    expect(r.nb_avis).toBe(10);
    const parId = new Map(r.options.map((o) => [o.option_id, o]));
    expect(parId.get('a')).toMatchObject({ nb: 6, pct: 60.0 });
    expect(parId.get('b')).toMatchObject({ nb: 2, pct: 20.0 });
    expect(parId.get('c')).toMatchObject({ nb: 1, pct: 10.0 });
    expect(parId.get('d')).toMatchObject({ nb: 0, pct: 0.0 });
  });
});

// ── Step 1e : NPS mensuel (jamais une moyenne) ───────────────────────────────

describe('NPS : agrégation mensuelle via agregerNPS', () => {
  test('agregerNPS : %promoteurs − %détracteurs, pas une moyenne', () => {
    const a = agregerNPS([10, 9, 8, 6, 5]);
    expect(a).toMatchObject({ volume: 5, promoteurs: 2, passifs: 1, detracteurs: 2, nps: 0 });
  });

  test('construireTendance : série NPS par mois + moyenne satisfaction', () => {
    const lignes = [
      { ...ligne(1, 'a1', 80, SMILEY), date_reponse: new Date('2026-08-03T10:00:00Z') },
      { ...ligne(2, 'a2', 100, SMILEY), date_reponse: new Date('2026-08-04T10:00:00Z') },
      { ...ligne(3, 'a3', 60, SMILEY), date_reponse: new Date('2026-08-05T10:00:00Z') },
      { ...ligne(4, 'a4', 40, SMILEY), date_reponse: new Date('2026-08-06T10:00:00Z') },
      { ...ligne(5, 'a5', 20, SMILEY), date_reponse: new Date('2026-08-07T10:00:00Z') },
      { ...ligne(6, 'n1', 90, NPS, { score_officiel: 9 }), date_reponse: new Date('2026-08-08T10:00:00Z') },
      { ...ligne(7, 'n2', 100, NPS, { score_officiel: 10 }), date_reponse: new Date('2026-08-09T10:00:00Z') },
      { ...ligne(8, 'n3', 50, NPS, { score_officiel: 5 }), date_reponse: new Date('2026-08-10T10:00:00Z') },
      { ...ligne(9, 'n4', 90, NPS, { score_officiel: 9 }), date_reponse: new Date('2026-08-11T10:00:00Z') },
      { ...ligne(10, 'n5', 100, NPS, { score_officiel: 10 }), date_reponse: new Date('2026-08-12T10:00:00Z') },
    ];
    const t = construireTendance(lignes as any, ['2026-08']);
    expect(t).toHaveLength(1);
    // Satisfaction : 5 notes → moyenne 3.0 (pas de pollution NPS).
    expect(t[0]!.moyenne_sur5).toBe(3.0);
    expect(t[0]!.nb_avis).toBe(5);
    // NPS : 4 promoteurs / 1 détracteur → 80 − 20 = 60 (volume 5 ≥ seuil).
    expect(t[0]!.nps).toBe(60);
    expect(t[0]!.nps_detail).toMatchObject({ volume: 5, promoteurs: 4, passifs: 0, detracteurs: 1 });
  });

  test('mois sous le seuil → moyenne et NPS à null', () => {
    const lignes = [
      { ...ligne(1, 'a1', 100, SMILEY), date_reponse: new Date('2026-09-01T10:00:00Z') },
      { ...ligne(2, 'n1', 100, NPS, { score_officiel: 10 }), date_reponse: new Date('2026-09-02T10:00:00Z') },
    ];
    const t = construireTendance(lignes as any, ['2026-09']);
    expect(t[0]!.moyenne_sur5).toBeNull();
    expect(t[0]!.nps).toBeNull();
    expect(t[0]!.nps_detail).toMatchObject({ volume: 1 });
  });
});

// ── Step 1f : CES (reconnaissance + agrégation) ─────────────────────────────

describe('CES : reconnaissance d’échelle + agrégation', () => {
  test('1-5 et 1-7 reconnues, 1-10 rejetée, non-CES rejeté', () => {
    expect(reconnaitreEchelleCES({ scoring_mode: 'CES', type_reponse: 'CES', options_reponse: '1,5' })).toBe(5);
    expect(reconnaitreEchelleCES({ scoring_mode: 'CES', type_reponse: 'CES', options_reponse: '1,7' })).toBe(7);
    expect(reconnaitreEchelleCES({ scoring_mode: 'CES', type_reponse: 'CES', options_reponse: '1,10' })).toBeNull();
    expect(reconnaitreEchelleCES({ scoring_mode: null, type_reponse: 'SMILEY', options_reponse: null })).toBeNull();
  });

  test('agregerLignesCES : top box + volume, null sous le seuil', () => {
    const lignes = [1, 2, 2, 4, 5].map((n, i) => ({
      ...ligne(i + 1, `c${i + 1}`, 100 - n * 10, CES),
      score_officiel: n,
    }));
    const a = agregerLignesCES(lignes as any, 5);
    expect(a).not.toBeNull();
    expect(a!.volume).toBe(5);
    // Faible effort : 1, 2, 2 → 3/5 = 60 %.
    expect(Math.round(a!.top_box)).toBe(60);
    const petit = agregerLignesCES(lignes.slice(0, 2) as any, 5);
    expect(petit).toBeNull();
  });
});

// ── Step 1g : fenêtres (nbJours [1,90], nbMois) + mois ───────────────────────

describe('fenêtres et mois', () => {
  test('normaliserNbJours : défaut 30, borné [1,90], arrondi', () => {
    expect(NB_JOURS_DEFAUT).toBe(30);
    expect(normaliserNbJours(undefined)).toBe(30);
    expect(normaliserNbJours(NaN)).toBe(30);
    expect(normaliserNbJours(0)).toBe(1);
    expect(normaliserNbJours(-5)).toBe(1);
    expect(normaliserNbJours(200)).toBe(90);
    expect(normaliserNbJours(7.6)).toBe(8);
    expect(normaliserNbJours(7)).toBe(7);
  });

  test('normaliserNbMois : défaut 12, borné [1,24]', () => {
    expect(NB_MOIS_DEFAUT).toBe(12);
    expect(normaliserNbMois(undefined)).toBe(12);
    expect(normaliserNbMois(0)).toBe(1);
    expect(normaliserNbMois(99)).toBe(24);
    expect(normaliserNbMois(6)).toBe(6);
  });

  test('cleMois / libelleMois / moisGlissants', () => {
    expect(cleMois(new Date('2026-08-15T12:00:00Z'))).toBe('2026-08');
    expect(libelleMois('2026-08')).toContain('26');
    const ref = new Date('2026-10-04T00:00:00Z');
    expect(moisGlissants(3, ref)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(moisGlissants(1, ref)).toEqual(['2026-10']);
  });
});

// ── Step 1h : classification des critères ───────────────────────────────────

describe('classifierCritere', () => {
  test('familles d’indicateurs distinguées', () => {
    expect(classifierCritere(SMILEY)).toBe('SATISFACTION');
    expect(classifierCritere(NPS)).toBe('NPS');
    expect(classifierCritere(CES)).toBe('CES');
    expect(classifierCritere(TEXTE)).toBe('TEXTE');
    expect(classifierCritere(QCM_CAT)).toBe('CATEGORIEL');
    expect(classifierCritere(CASES_CAT)).toBe('CATEGORIEL');
  });
});

// ── Step 2 : wrappers queries (scope + regroupement, entities mockées) ──────

import { getMoyennesParCritere, getRepartitionOptions, getTendanceParCritere } from './queries';

const CHEF = { id: 'chef-1', role: 'CHEF_AGENCE', id_agence: 1, id_entreprise: 7, actif: true, email: 'chef@yeba.ci' };

function ctxQuery(overrides: any = {}) {
  const whereVus: any[] = [];
  const entities = {
    Entreprise: { findUnique: async () => ({ status: 'ACTIVE' }) },
    Agence: { findMany: async () => [{ id: 1 }, { id: 2 }] },
    Reponse: {
      findMany: async ({ where }: any) => {
        whereVus.push(where);
        return overrides.reponses ?? [];
      },
    },
    Critere: { findUnique: async () => overrides.critere ?? null },
    OptionCritere: { findMany: async () => overrides.options ?? [] },
    ...overrides.entities,
  };
  return { ctx: { user: CHEF, entities } as any, whereVus };
}

async function erreurHttp(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e: any) {
    return { statusCode: e?.statusCode, message: String(e?.message ?? e) };
  }
  throw new Error('AUCUNE_ERREUR_LEVEE');
}

const CRIT_SMILEY = { id: 11, libelle_critere: 'Accueil', type_reponse: 'SMILEY', scoring_mode: null, options_reponse: null };
const CRIT_NPS = { id: 12, libelle_critere: 'Reco', type_reponse: 'NPS', scoring_mode: 'NPS', options_reponse: null };
const CRIT_TEXTE = { id: 13, libelle_critere: 'Verbatim', type_reponse: 'TEXTE', scoring_mode: 'FREE_TEXT', options_reponse: null };

describe('getMoyennesParCritere', () => {
  test('regroupe par critère, exclut NPS/TEXTE des moyennes, scope agence + fenêtre', async () => {
    const reponses = [
      ...[100, 80, 60, 40, 20].map((n, i) => ({
        id: i + 1, id_soumission: `s${i + 1}`, score_normalise: n, score_officiel: null,
        id_critere: 11, critere: CRIT_SMILEY,
      })),
      ...[9, 10, 8, 6, 5, 9].map((n, i) => ({
        id: 100 + i, id_soumission: `n${i + 1}`, score_normalise: n * 10, score_officiel: n,
        id_critere: 12, critere: CRIT_NPS,
      })),
      ...[1, 2, 3, 4, 5, 6].map((i) => ({
        id: 200 + i, id_soumission: `t${i}`, score_normalise: null, score_officiel: null,
        id_critere: 13, critere: CRIT_TEXTE,
      })),
    ];
    const { ctx, whereVus } = ctxQuery({ reponses });
    const res = await getMoyennesParCritere({ nbJours: 30 }, ctx);
    expect(res.nb_jours).toBe(30);
    expect(whereVus[0]?.id_agence).toBe(1);
    expect(whereVus[0]?.date_reponse?.gte).toBeInstanceOf(Date);
    expect(res.criteres).toHaveLength(3);
    const smiley = res.criteres.find((c) => c.id_critere === 11)!;
    expect(smiley.kind).toBe('SATISFACTION');
    expect(smiley.moyenne_sur5).toBe(3.0);
    expect(smiley.satisfaction_pct).toBe(40.0);
    const nps = res.criteres.find((c) => c.id_critere === 12)!;
    expect(nps.kind).toBe('NPS');
    expect(nps.moyenne_sur5).toBeNull();
    expect(nps.nps).toBe(17);
    expect(nps.nps_detail).toMatchObject({ volume: 6, promoteurs: 3, passifs: 1, detracteurs: 2 });
    const texte = res.criteres.find((c) => c.id_critere === 13)!;
    expect(texte.kind).toBe('TEXTE');
    expect(texte.moyenne_sur5).toBeNull();
    expect(texte.satisfaction_pct).toBeNull();
  });

  test('nbJours borné [1,90] (500 → 90)', async () => {
    const { ctx, whereVus } = ctxQuery({ reponses: [] });
    const res = await getMoyennesParCritere({ nbJours: 500 }, ctx);
    expect(res.nb_jours).toBe(90);
    expect(res.criteres).toEqual([]);
    const gte = whereVus[0]?.date_reponse?.gte as Date;
    const jours = (Date.now() - gte.getTime()) / (1000 * 60 * 60 * 24);
    expect(jours).toBeGreaterThan(89);
    expect(jours).toBeLessThan(91);
  });

  test('critère à 4 avis → métriques null (seuil)', async () => {
    const reponses = [100, 100, 80, 60].map((n, i) => ({
      id: i + 1, id_soumission: `s${i + 1}`, score_normalise: n, score_officiel: null,
      id_critere: 11, critere: CRIT_SMILEY,
    }));
    const { ctx } = ctxQuery({ reponses });
    const res = await getMoyennesParCritere({ nbJours: 30 }, ctx);
    expect(res.criteres[0]!.moyenne_sur5).toBeNull();
    expect(res.criteres[0]!.nb_avis).toBe(4);
  });
});

describe('getRepartitionOptions', () => {
  const CRIT = { id: 21, libelle_critere: 'Motif', type_reponse: 'QCM', scoring_mode: null, id_entreprise: 7 };

  test('id_critere requis → 400 ; inconnu → 404 ; autre entreprise → 403', async () => {
    const { ctx } = ctxQuery({});
    expect((await erreurHttp(() => getRepartitionOptions({} as any, ctx))).statusCode).toBe(400);
    expect((await erreurHttp(() => getRepartitionOptions({ id_critere: 999 }, ctx))).statusCode).toBe(404);
    const autre = ctxQuery({ critere: { ...CRIT, id_entreprise: 666 } });
    expect((await erreurHttp(() => getRepartitionOptions({ id_critere: 21 }, autre.ctx))).statusCode).toBe(403);
  });

  test('répartition sur ids d’options, option à zéro conservée', async () => {
    const reponses = [
      { id: 1, id_soumission: 'a', optionsChoisies: [{ id_option: 'x' }] },
      { id: 2, id_soumission: 'b', optionsChoisies: [{ id_option: 'x' }] },
      { id: 3, id_soumission: 'c', optionsChoisies: [{ id_option: 'x' }] },
      { id: 4, id_soumission: 'd', optionsChoisies: [{ id_option: 'x' }] },
      { id: 5, id_soumission: 'e', optionsChoisies: [{ id_option: 'x' }] },
      { id: 6, id_soumission: 'f', optionsChoisies: [{ id_option: 'y' }] },
    ];
    const options = [
      { id: 'x', libelle: 'X' },
      { id: 'y', libelle: 'Y' },
      { id: 'z', libelle: 'Z' },
    ];
    const { ctx } = ctxQuery({ reponses, options, critere: CRIT });
    const res = await getRepartitionOptions({ id_critere: 21, nbJours: 30 }, ctx);
    expect(res.nb_avis).toBe(6);
    expect(res.options.find((o) => o.option_id === 'x')).toMatchObject({ nb: 5, pct: 83.3 });
    expect(res.options.find((o) => o.option_id === 'y')).toMatchObject({ nb: 1, pct: 16.7 });
    expect(res.options.find((o) => o.option_id === 'z')).toMatchObject({ nb: 0, pct: 0 });
  });
});

describe('getTendanceParCritere', () => {
  test('points mensuels + série NPS + courbes par terme', async () => {
    const now = new Date();
    // Date sûre dans le mois courant (jamais de bascule de mois en CI).
    const dansMois = new Date(now.getFullYear(), now.getMonth(), 2, 12, 0, 0, 0).toISOString();
    const reponses = [
      ...[100, 80, 60, 40, 20].map((n, i) => ({
        id: i + 1, id_soumission: `s${i + 1}`, score_normalise: n, score_officiel: null,
        date_reponse: dansMois, id_critere: 11, critere: CRIT_SMILEY,
      })),
      ...[9, 10, 5, 9, 10].map((n, i) => ({
        id: 100 + i, id_soumission: `n${i + 1}`, score_normalise: n * 10, score_officiel: n,
        date_reponse: dansMois, id_critere: 12, critere: CRIT_NPS,
      })),
    ];
    const { ctx } = ctxQuery({ reponses });
    const res = await getTendanceParCritere({ nbMois: 2 }, ctx);
    expect(res.nb_mois).toBe(2);
    expect(res.points).toHaveLength(2);
    const courant = res.points[res.points.length - 1]!;
    expect(courant.moyenne_sur5).toBe(3.0);
    expect(courant.nps).toBe(60);
    // Courbes par terme : seul le SMILEY (satisfaction) y figure.
    expect(res.series.map((s) => s.id_critere)).toEqual([11]);
  });

  test('nbMois borné [1,24] ; id_critere inconnu → 404', async () => {
    const { ctx } = ctxQuery({ reponses: [] });
    const res = await getTendanceParCritere({ nbMois: 99 }, ctx);
    expect(res.nb_mois).toBe(24);
    expect(res.points).toHaveLength(24);
    expect((await erreurHttp(() => getTendanceParCritere({ id_critere: 4242 }, ctx))).statusCode).toBe(404);
  });
});
