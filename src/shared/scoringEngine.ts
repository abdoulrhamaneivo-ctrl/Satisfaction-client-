// src/shared/scoringEngine.ts
// ============================================================================
// MOTEUR DE SCORING DÉTERMINISTE — vague 1, Phase C.
//
// Pur et testable : zéro Prisma, zéro I/O, zéro LLM. Le serveur (Phase D)
// l'appelle avec des OptionCritere lus en base ; le client ne l'utilise que
// pour l'affichage (jamais pour décider d'une note officielle).
//
// INVARIANTS VERROUILLÉS (règles d'application, voir tests) :
//  1. INDEX D'AFFICHAGE = UX uniquement — jamais utilisé pour scorer.
//     Entrées = optionId (identité stable), JAMAIS index/position/score client.
//  2. OPTION ID = identité de la réponse (QCM = 1 id, CASES = N ids).
//  3. SCORE OFFICIEL = calcul déterministe serveur (ce module).
//  4. IA = interprète et contextualise — ne modifie JAMAIS le score.
//  5. Ambiguïté → statut AMBIGU (jamais de faux score inventé).
//  6. Non notable (TEXTE, CASES catégoriel) → NULL, jamais de 3 fantôme.
//  7. Échelle canonique : score_normalise TOUJOURS /100.
//
// Couches (ne jamais mélanger) :
//   score_officiel (brut métier) → score_normalise (/100) → agrégats
//   (ScoreEngine) → IA (Insight/Global) → indicateurs → conclusions.
// ============================================================================

export type ScoringMode =
  | 'ORDINAL'
  | 'BINARY'
  | 'NUMERIC'
  | 'SMILEY'
  | 'NPS'
  | 'CASES_CATEGORICAL'
  | 'CASES_WEIGHTED'
  | 'FREE_TEXT';

export type Orientation = 'HIGHER_BETTER' | 'LOWER_BETTER';

/** Provenance d'un score — PAS de source IA : l'IA ne note jamais. */
export type ScoreSource =
  | 'EXPLICIT'
  | 'INFERRED'
  | 'LEGACY_POSITIONAL'
  | 'MIGRATED';

export type CategorieNPS = 'DETRACTEUR' | 'PASSIF' | 'PROMOTEUR';

export type StatutResolution = 'OK' | 'NON_NOTABLE' | 'AMBIGU';

/** Provenance d'un score d'option (fournie par la couche appelante, Phase D). */
export type ProvenanceScore = 'EXPLICIT' | 'INFERRED';

/** Forme minimale d'une OptionCritere pour le moteur (pas de Prisma ici). */
export interface OptionMoteur {
  id: string;
  libelle: string;
  score: number | null;
  poids: number | null;
  est_scorable: boolean;
  actif: boolean;
  code_metier?: string | null;
}

/** Configuration d'un critère pour le moteur. */
export interface CritereMoteur {
  scoring_mode: ScoringMode | string | null;
  type_reponse: string;
  orientation?: Orientation | string | null;
  echelle_min?: number | null;
  echelle_max?: number | null;
  options: OptionMoteur[];
}

export interface ResolutionScoring {
  statut: StatutResolution;
  /** Note métier brute (1..5, valeur d'échelle, 0..10 NPS, 1..5 CASES pondéré). */
  score_officiel: number | null;
  /** Note canonique /100. NULL si non notable ou ambigu. */
  score_normalise: number | null;
  source: ScoreSource | null;
  categorie_nps?: CategorieNPS;
  /** Ids d'options retenues (stats CASES : répartition sur identifiants). */
  options_retenues: string[];
  /** Code raison (AMBIGU / NON_NOTABLE) — jamais de texte libre inventé. */
  raison?: string;
}

// Convention « exclusif » (ex. « Aucun problème ») : code_metier EXCLUSIF,
// ou libellé normalisé appartenant à cette liste (comparaison exacte,
// jamais par sous-chaîne — voir tests anti-faux-positifs).
const LIBELLES_EXCLUSIFS = new Set([
  'aucun',
  'aucune',
  'aucun probleme',
  'aucune probleme',
  'aucun souci',
  'aucune gene',
  'rien',
  'ras',
  'rien a signaler',
  'tout va bien',
]);

function estExclusif(o: OptionMoteur, normaliser: (s: string) => string): boolean {
  if ((o.code_metier || '').trim().toUpperCase() === 'EXCLUSIF') return true;
  return LIBELLES_EXCLUSIFS.has(normaliser(o.libelle));
}

/** 1..5 → /100. */
export function note5Vers100(score: number): number {
  return ((score - 1) / 4) * 100;
}

/** Valeur d'échelle [min,max] → /100 (avec orientation). */
export function echelleVers100(
  valeur: number,
  min: number,
  max: number,
  orientation: Orientation = 'HIGHER_BETTER',
): number {
  const ratio = (valeur - min) / (max - min);
  const direct = ratio * 100;
  return orientation === 'LOWER_BETTER' ? 100 - direct : direct;
}

/**
 * Normalisation d'un score ordinal sur une échelle arbitraire.
 * Convention : S = max(5, plus grand score des options scorables) — les
 * échelles 1..5 historiques gardent leur mapping exact ; les échelles
 * 1..7 / 1..10 se normalisent sur leur pleine étendue. Échelle dégénérée
 * (une seule valeur distincte) → 50 neutre documenté.
 */
export function ordinalVers100(score: number, scoresOptions: number[]): number {
  const plafond = Math.max(5, ...scoresOptions);
  if (plafond <= 1) return 50;
  return ((score - 1) / (plafond - 1)) * 100;
}

function orientationDe(c: CritereMoteur): Orientation {
  return c.orientation === 'LOWER_BETTER' ? 'LOWER_BETTER' : 'HIGHER_BETTER';
}

function optionActiveParId(
  c: CritereMoteur,
  optionId: string,
): { option?: OptionMoteur; inactive?: boolean } {
  const toutes = c.options.filter((o) => o.id === optionId);
  if (toutes.length === 0) return {};
  const active = toutes.find((o) => o.actif);
  if (!active) return { inactive: true };
  return { option: active };
}

function nonNotable(raison: string): ResolutionScoring {
  return {
    statut: 'NON_NOTABLE',
    score_officiel: null,
    score_normalise: null,
    source: null,
    options_retenues: [],
    raison,
  };
}

function ambigu(raison: string): ResolutionScoring {
  return {
    statut: 'AMBIGU',
    score_officiel: null,
    score_normalise: null,
    source: null,
    options_retenues: [],
    raison,
  };
}

// ── ORDINAL / SMILEY (choix unique parmi options scorées) ─────────────────

/**
 * Résout un choix unique (QCM ordinal, SMILEY) par optionId.
 * - option inconnue → AMBIGU (OPTION_INCONNUE), jamais deviné ;
 * - option inactive (retirée après collecte) → AMBIGU (OPTION_INACTIVE) ;
 * - option non scorable → NON_NOTABLE (choix catégoriel assumé par l'admin).
 */
export function resoudreChoixUnique(
  critere: CritereMoteur,
  optionId: string,
  provenance: ProvenanceScore = 'INFERRED',
): ResolutionScoring {
  const { option, inactive } = optionActiveParId(critere, optionId);
  if (inactive) return ambigu('OPTION_INACTIVE');
  if (!option) return ambigu('OPTION_INCONNUE');
  if (!option.est_scorable || option.score == null) {
    return {
      ...nonNotable('OPTION_NON_SCORABLE'),
      options_retenues: [option.id],
    };
  }
  const echelle = critere.options
    .filter((o) => o.actif && o.est_scorable && o.score != null)
    .map((o) => o.score as number);
  return {
    statut: 'OK',
    score_officiel: option.score,
    score_normalise: ordinalVers100(option.score, echelle),
    source: provenance === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED',
    options_retenues: [option.id],
  };
}

// ── BINARY (Oui/Non + orientation du critère) ─────────────────────────────

/**
 * Oui/Non : l'orientation appartient AU CRITÈRE, pas au texte.
 * « Satisfait ? » Oui=positif ; « Problème rencontré ? » Oui=négatif.
 */
export function resoudreBinaire(
  critere: Pick<CritereMoteur, 'orientation'>,
  valeurOui: boolean,
): ResolutionScoring {
  const orientation = orientationDe(critere as CritereMoteur);
  const positif = orientation === 'HIGHER_BETTER' ? valeurOui : !valeurOui;
  return {
    statut: 'OK',
    score_officiel: positif ? 5 : 1,
    score_normalise: positif ? 100 : 0,
    source: 'EXPLICIT',
    options_retenues: [],
  };
}

// ── NUMERIC / ECHELLE ─────────────────────────────────────────────────────

export function resoudreNumerique(
  critere: Pick<CritereMoteur, 'orientation' | 'echelle_min' | 'echelle_max'>,
  valeur: number,
): ResolutionScoring {
  const min = Number(critere.echelle_min);
  const max = Number(critere.echelle_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
    return ambigu('ECHELLE_MAL_CONFIGUREE');
  }
  if (!Number.isInteger(valeur)) return ambigu('VALEUR_NON_ENTIERE');
  if (valeur < min || valeur > max) return ambigu('ECHELLE_HORS_BORNES');
  const orientation = orientationDe(critere as CritereMoteur);
  return {
    statut: 'OK',
    score_officiel: valeur,
    score_normalise: echelleVers100(valeur, min, max, orientation),
    source: 'EXPLICIT',
    options_retenues: [],
  };
}

// ── NPS (0-10 natif) ──────────────────────────────────────────────────────

export function categorieNPS(valeur: number): CategorieNPS {
  if (valeur <= 6) return 'DETRACTEUR';
  if (valeur <= 8) return 'PASSIF';
  return 'PROMOTEUR';
}

export function resoudreNPS(valeur: number): ResolutionScoring {
  if (!Number.isInteger(valeur) || valeur < 0 || valeur > 10) {
    return ambigu('NPS_HORS_BORNES');
  }
  return {
    statut: 'OK',
    score_officiel: valeur,
    score_normalise: valeur * 10,
    source: 'EXPLICIT',
    categorie_nps: categorieNPS(valeur),
    options_retenues: [],
  };
}

// NOTE Wasp : `type` (et non `interface`) — les interfaces nommées n'ont
// pas de signature d'index implicite et cassent la contrainte Payload
// (SuperJSONObject) des queries retournant ce type (build TS2344).
export type AgregationNPS = {
  volume: number;
  promoteurs: number;
  passifs: number;
  detracteurs: number;
  taux_promoteurs: number;
  taux_passifs: number;
  taux_detracteurs: number;
  /** % promoteurs − % détracteurs (entier, jamais une moyenne). */
  nps: number | null;
};

/** Agrégation NPS — jamais une moyenne de notes. */
export function agregerNPS(valeurs: number[]): AgregationNPS {
  const volume = valeurs.length;
  if (volume === 0) {
    return {
      volume: 0, promoteurs: 0, passifs: 0, detracteurs: 0,
      taux_promoteurs: 0, taux_passifs: 0, taux_detracteurs: 0, nps: null,
    };
  }
  let promoteurs = 0;
  let passifs = 0;
  let detracteurs = 0;
  for (const v of valeurs) {
    const c = categorieNPS(v);
    if (c === 'PROMOTEUR') promoteurs += 1;
    else if (c === 'PASSIF') passifs += 1;
    else detracteurs += 1;
  }
  const taux_promoteurs = (promoteurs / volume) * 100;
  const taux_detracteurs = (detracteurs / volume) * 100;
  return {
    volume,
    promoteurs,
    passifs,
    detracteurs,
    taux_promoteurs,
    taux_passifs: (passifs / volume) * 100,
    taux_detracteurs,
    nps: Math.round(taux_promoteurs - taux_detracteurs),
  };
}

// ── CASES / CHOIX MULTIPLES ───────────────────────────────────────────────

/**
 * Résout une sélection multiple par ids d'options.
 * - CATEGORICAL (ou sans scores/poids) → NON_NOTABLE + ids (stats %).
 * - WEIGHTED → base 100 + Σ(poids), clampé 0-100 ; officiel = /20 arrondi.
 * - Exclusif (« Aucun ») + autres choix → AMBIGU (EXCLUSIVITE_VIOLÉE).
 * - Sélection vide → AMBIGU (SELECTION_VIDE : rien à scorer, pas un 0).
 * - Option inconnue/inactive → AMBIGU (jamais ignorée silencieusement :
 *   ignorer un choix fausserait la moyenne ou la distribution).
 */
export function resoudreCases(
  critere: CritereMoteur,
  optionIds: string[],
  provenance: ProvenanceScore = 'INFERRED',
  normaliser: (s: string) => string = (s) => s.toLowerCase().trim(),
): ResolutionScoring {
  const uniques = [...new Set(optionIds)];
  if (uniques.length === 0) return ambigu('SELECTION_VIDE');

  const retenues: OptionMoteur[] = [];
  for (const id of uniques) {
    const { option, inactive } = optionActiveParId(critere, id);
    if (inactive) return ambigu('OPTION_INACTIVE');
    if (!option) return ambigu('OPTION_INCONNUE');
    retenues.push(option);
  }

  const exclusives = retenues.filter((o) => estExclusif(o, normaliser));
  if (exclusives.length > 0 && retenues.length > 1) {
    return ambigu('EXCLUSIVITE_VIOLEE');
  }

  const mode = (critere.scoring_mode || '').toUpperCase();

  if (mode === 'CASES_WEIGHTED') {
    const poids = retenues.map((o) => o.poids);
    if (poids.some((p) => p == null)) return ambigu('POIDS_MANQUANTS');
    const total = 100 + (poids as number[]).reduce((s, p) => s + p, 0);
    const normalise = Math.max(0, Math.min(100, total));
    return {
      statut: 'OK',
      score_officiel: Math.max(1, Math.min(5, Math.round(normalise / 20))),
      score_normalise: normalise,
      source: 'EXPLICIT',
      options_retenues: retenues.map((o) => o.id),
    };
  }

  // CATEGORICAL explicite, ou CASES legacy sans scores : jamais noté.
  // (Compat : si des scores existent SANS mode explicite, la moyenne
  // historique reste disponible via resoudreCasesMoyenne — Phase D.)
  return {
    ...nonNotable(
      mode === 'CASES_CATEGORICAL' ? 'CASES_CATEGORIEL' : 'CASES_NON_VALENCE',
    ),
    options_retenues: retenues.map((o) => o.id),
  };
}

/**
 * Compat historique : moyenne arrondie des options scorées cochées.
 * Réservé aux CASES legacy SANS scoring_mode explicite (Phase D).
 * Ne pas utiliser pour les nouveaux questionnaires.
 */
export function resoudreCasesMoyenne(
  critere: CritereMoteur,
  optionIds: string[],
  provenance: ProvenanceScore = 'INFERRED',
): ResolutionScoring {
  const base = resoudreCases(
    { ...critere, scoring_mode: 'CASES_CATEGORICAL' },
    optionIds,
    provenance,
  );
  if (base.statut === 'AMBIGU') return base;
  const ids = new Set(base.options_retenues);
  const scores = critere.options
    .filter((o) => ids.has(o.id) && o.actif && o.est_scorable && o.score != null)
    .map((o) => o.score as number);
  if (scores.length === 0) return base;
  const moyenne = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
  const echelle = critere.options
    .filter((o) => o.actif && o.est_scorable && o.score != null)
    .map((o) => o.score as number);
  return {
    statut: 'OK',
    score_officiel: moyenne,
    score_normalise: ordinalVers100(moyenne, echelle),
    source: provenance === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED',
    options_retenues: base.options_retenues,
  };
}

// ── TEXTE LIBRE ───────────────────────────────────────────────────────────

/** Un texte libre ne devient JAMAIS une note officielle (décision validée). */
export function resoudreTexte(): ResolutionScoring {
  return nonNotable('TEXTE_LIBRE');
}

// ── DISPATCHER ────────────────────────────────────────────────────────────

export type EntreeReponse =
  | { type: 'option'; optionId: string }
  | { type: 'options'; optionIds: string[] }
  | { type: 'valeur'; valeur: number }
  | { type: 'binaire'; valeurOui: boolean }
  | { type: 'texte'; texte: string };

/**
 * Point d'entrée unique : mode explicite > déduit du type_reponse.
 * Modes inconnus → AMBIGU (MODE_INCONNU), jamais de fallback silencieux.
 */
export function resoudreReponse(
  critere: CritereMoteur,
  entree: EntreeReponse,
  provenance: ProvenanceScore = 'INFERRED',
): ResolutionScoring {
  const mode = (critere.scoring_mode || '').toUpperCase() as ScoringMode | '';
  const type = (critere.type_reponse || '').toUpperCase();

  const effectif: string =
    mode ||
    (type === 'QCM'
      ? 'ORDINAL'
      : type === 'OUI_NON'
        ? 'BINARY'
        : type === 'ECHELLE'
          ? 'NUMERIC'
          : type === 'SMILEY'
            ? 'SMILEY'
            : type === 'NPS'
              ? 'NPS'
              : type === 'TEXTE'
                ? 'FREE_TEXT'
                : type === 'CASES'
                  ? 'CASES_CATEGORICAL'
                  : '');

  switch (effectif) {
    case 'ORDINAL':
    case 'SMILEY':
      if (entree.type !== 'option') return ambigu('ENTREE_INCOMPATIBLE');
      return resoudreChoixUnique(critere, entree.optionId, provenance);
    case 'BINARY':
      if (entree.type !== 'binaire') return ambigu('ENTREE_INCOMPATIBLE');
      return resoudreBinaire(critere, entree.valeurOui);
    case 'NUMERIC':
      if (entree.type !== 'valeur') return ambigu('ENTREE_INCOMPATIBLE');
      return resoudreNumerique(critere, entree.valeur);
    case 'NPS':
      if (entree.type !== 'valeur') return ambigu('ENTREE_INCOMPATIBLE');
      return resoudreNPS(entree.valeur);
    case 'CASES_CATEGORICAL':
    case 'CASES_WEIGHTED':
      if (entree.type !== 'options') return ambigu('ENTREE_INCOMPATIBLE');
      return resoudreCases(critere, entree.optionIds, provenance);
    case 'FREE_TEXT':
      return resoudreTexte();
    default:
      return ambigu('MODE_INCONNU');
  }
}
