// src/server/kpiParTerme.ts
// ============================================================================
// Task 3 — KPI par terme : logique pure d'agrégation (zéro Prisma, zéro I/O).
//
// Règles verrouillées (plan global, jamais négociables ici) :
// - `score_normalise` SEUL pour les moyennes, jamais `score_brut` (pas de
//   repli : une ligne sans normalisé est exclue, pas réestimée) ;
// - satisfaction SEULE (`estCritereSatisfaction`) : TEXTE/QCM/CASES/NPS/CES
//   exclus des moyennes — NPS et CES ont leurs propres indicateurs ;
// - NPS = %promoteurs − %détracteurs via `agregerNPS`, jamais une moyenne ;
// - seuil d'affichage n>=5 : en dessous, les métriques valent null (jamais
//   un % calculé sur 2 avis), les effectifs restant affichés.
//
// Les 3 queries de `queries.ts` (getMoyennesParCritere,
// getRepartitionOptions, getTendanceParCritere) ne font que scoper
// (buildAgenceFilter/resolveAgenceScope), charger, puis appeler ces helpers.
// ============================================================================

import { estCritereSatisfaction } from '../shared/noteSur5';
import { agregerNPS, type AgregationNPS } from '../shared/scoringEngine';
import { agregerCES, reconnaitreCES, type AgregationCES, type EchelleCES } from '../shared/ces';

/** Seuil de significativité : en dessous, les métriques valent null. */
export const SEUIL_KPI_N = 5;

/** Fenêtre glissante en jours : défaut 30, bornée [1,90]. */
export const NB_JOURS_DEFAUT = 30;
export const NB_JOURS_MIN = 1;
export const NB_JOURS_MAX = 90;

/** Fenêtre de tendance en mois : défaut 12, bornée [1,24]. */
export const NB_MOIS_DEFAUT = 12;
export const NB_MOIS_MIN = 1;
export const NB_MOIS_MAX = 24;

export function normaliserNbJours(valeur: unknown, defaut: number = NB_JOURS_DEFAUT): number {
  if (!Number.isFinite(valeur as number)) return defaut;
  return Math.min(NB_JOURS_MAX, Math.max(NB_JOURS_MIN, Math.round(valeur as number)));
}

export function normaliserNbMois(valeur: unknown, defaut: number = NB_MOIS_DEFAUT): number {
  if (!Number.isFinite(valeur as number)) return defaut;
  return Math.min(NB_MOIS_MAX, Math.max(NB_MOIS_MIN, Math.round(valeur as number)));
}

// NOTE Wasp : `type` et non `interface` — les formes retournées par les
// queries doivent satisfaire la contrainte Payload (SuperJSONObject).
export type ConfigCritereLue = {
  type_reponse?: string | null;
  scoring_mode?: string | null;
  options_reponse?: string | null;
};

export type LigneKpi = {
  id: number | string | bigint;
  id_soumission?: string | null;
  score_normalise?: number | null;
  score_brut?: number | null;
  score_officiel?: number | null;
  date_reponse?: Date | string | null;
  critere?: ConfigCritereLue | null;
};

export type KindCritere = 'SATISFACTION' | 'NPS' | 'CES' | 'CATEGORIEL' | 'TEXTE';

/**
 * Famille d'indicateur d'un critère : NPS et CES ont leurs métriques
 * dédiées (jamais moyennés avec la satisfaction), TEXTE et choix
 * catégoriels (QCM/CASES non valencés) ne portent que des répartitions.
 */
export function classifierCritere(critere: ConfigCritereLue | null | undefined): KindCritere {
  const type = String(critere?.type_reponse || '').toUpperCase();
  if (type === 'NPS') return 'NPS';
  if (reconnaitreEchelleCES(critere) !== null) return 'CES';
  if (estCritereSatisfaction(critere as any)) return 'SATISFACTION';
  if (type === 'TEXTE' || String(critere?.scoring_mode || '').toUpperCase() === 'FREE_TEXT') return 'TEXTE';
  return 'CATEGORIEL';
}

/**
 * Note /5 depuis le SEUL `score_normalise` (/100 → /5, bornée [1,5]).
 * `score_brut` n'est JAMAIS lu (pas de repli) ; les critères hors
 * satisfaction (TEXTE, QCM/CASES, NPS, CES) rendent null.
 */
export function noteDepuisNormalise(ligne: Pick<LigneKpi, 'score_normalise' | 'critere'>): number | null {
  if (!estCritereSatisfaction((ligne.critere ?? null) as any)) return null;
  const s = ligne.score_normalise;
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  return Math.max(1, Math.min(5, s / 20));
}

/** Avis distincts : même `id_soumission` = 1 avis ; orphelines = 1 chacune. */
export function clesAvis<T extends Pick<LigneKpi, 'id' | 'id_soumission'>>(lignes: T[]): Set<string> {
  const cles = new Set<string>();
  for (const l of lignes) {
    cles.add(l.id_soumission ? `s:${l.id_soumission}` : `r:${String(l.id)}`);
  }
  return cles;
}

export function compterAvis<T extends Pick<LigneKpi, 'id' | 'id_soumission'>>(lignes: T[]): number {
  return clesAvis(lignes).size;
}

function arrondi1(n: number): number {
  return Math.round(n * 10) / 10;
}

function arrondi2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type Distribution5 = { '1': number; '2': number; '3': number; '4': number; '5': number };

export function distributionVide(): Distribution5 {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
}

export type AgregatCritere = {
  /** Avis distincts ayant répondu à ce critère (toutes lignes). */
  nb_avis: number;
  /** Lignes notables (satisfaction + score_normalise fini). */
  nb_notables: number;
  /** Moyenne /5 (2 décimales), null si non-satisfaction ou n<5. */
  moyenne_sur5: number | null;
  /** % d'avis >= 4/5 (1 décimale), null si non-satisfaction ou n<5. */
  satisfaction_pct: number | null;
  /** Effectifs par bande (toujours renseignés, même sous le seuil). */
  distribution: Distribution5;
};

/**
 * Agrège les lignes d'UN critère : seules les notes de satisfaction
 * (noteDepuisNormalise non-null) entrent dans la moyenne. Le seuil porte
 * sur `nb_notables` (la base réelle de la moyenne, pas le volume brut).
 */
export function agregerLignesCritere(lignes: LigneKpi[]): AgregatCritere {
  const distribution = distributionVide();
  const notes: number[] = [];
  for (const l of lignes) {
    const note = noteDepuisNormalise(l);
    if (note === null) continue;
    notes.push(note);
    const bande = String(Math.max(1, Math.min(5, Math.round(note)))) as keyof Distribution5;
    distribution[bande] += 1;
  }
  const nb_notables = notes.length;
  if (nb_notables < SEUIL_KPI_N) {
    return { nb_avis: compterAvis(lignes), nb_notables, moyenne_sur5: null, satisfaction_pct: null, distribution };
  }
  return {
    nb_avis: compterAvis(lignes),
    nb_notables,
    moyenne_sur5: arrondi2(notes.reduce((s, n) => s + n, 0) / nb_notables),
    satisfaction_pct: arrondi1((notes.filter((n) => n >= 4).length / nb_notables) * 100),
    distribution,
  };
}

// ── Répartition par option (QCM / CASES : motifs, problèmes) ─────────────────

export type SelectionOptions = {
  id: number | string | bigint;
  id_soumission?: string | null;
  /** Ids d'options cochées par cet avis pour le critère. */
  options: string[];
};

export type LigneRepartition = {
  option_id: string;
  libelle: string;
  /** Avis distincts ayant coché cette option. */
  nb: number;
  /** % des avis ayant coché (1 décimale), null si nb_avis < 5. */
  pct: number | null;
};

export type RepartitionOptions = {
  /** Avis distincts ayant répondu au critère (dénominateur unique). */
  nb_avis: number;
  options: LigneRepartition[];
};

/**
 * Répartition des choix : le dénominateur est le nombre d'AVIS distincts
 * (pas le nombre de coches — un avis CASES multi-choix compte 1). Les
 * pourcentages peuvent donc dépasser 100 au total en CASES : c'est la
 * part d'avis cochant chaque option, documentée comme telle.
 */
export function repartirOptionsParAvis(
  selections: SelectionOptions[],
  optionsRef: { id: string; libelle: string }[],
): RepartitionOptions {
  const nb_avis = clesAvis(selections.map((s) => ({ id: s.id, id_soumission: s.id_soumission }))).size;
  const cochesParOption = new Map<string, Set<string>>();
  for (const s of selections) {
    const cle = s.id_soumission ? `s:${s.id_soumission}` : `r:${String(s.id)}`;
    for (const opt of new Set(s.options)) {
      let set = cochesParOption.get(opt);
      if (!set) {
        set = new Set<string>();
        cochesParOption.set(opt, set);
      }
      set.add(cle);
    }
  }
  const options = optionsRef.map((o) => {
    const nb = cochesParOption.get(o.id)?.size ?? 0;
    return {
      option_id: o.id,
      libelle: o.libelle,
      nb,
      pct: nb_avis < SEUIL_KPI_N ? null : arrondi1((nb / nb_avis) * 100),
    };
  });
  return { nb_avis, options };
}

// ── CES ─────────────────────────────────────────────────────────────────────

/**
 * Reconnaît un critère CES et son échelle depuis la configuration stockée
 * (`options_reponse` au format CSV "min,max", ex. "1,5"). Renvoie null si
 * le critère n'est pas un CES ou si l'échelle n'est pas supportée —
 * l'appelant ignore alors la ligne (jamais d'estimation).
 */
export function reconnaitreEchelleCES(c: ConfigCritereLue | null | undefined): EchelleCES | null {
  if (!c) return null;
  const [minStr, maxStr] = String(c.options_reponse || '').split(',').map((v) => String(v).trim());
  return reconnaitreCES({
    scoring_mode: c.scoring_mode,
    type_reponse: c.type_reponse,
    echelle_min: minStr ? Number(minStr) : null,
    echelle_max: maxStr ? Number(maxStr) : null,
  });
}

/**
 * Agrège les lignes CES d'un critère (notes brutes `score_officiel`,
 * échelle explicite). null si volume < 5 ou aucune note valide.
 */
export function agregerLignesCES(lignes: LigneKpi[], echelle: EchelleCES): AgregationCES | null {
  const notes = lignes
    .map((l) => l.score_officiel)
    .filter((n): n is number => Number.isInteger(n));
  const agreg = agregerCES(notes, echelle);
  if (agreg.volume < SEUIL_KPI_N) return null;
  return agreg;
}

// ── Tendance mensuelle ───────────────────────────────────────────────────────

export type PointTendance = {
  cle: string;
  libelle: string;
  /** Avis notables satisfaction du mois (base de la moyenne). */
  nb_avis: number;
  moyenne_sur5: number | null;
  /** NPS du mois (%promoteurs − %détracteurs), null si volume < 5. */
  nps: number | null;
  nps_detail: Pick<AgregationNPS, 'volume' | 'promoteurs' | 'passifs' | 'detracteurs'>;
};

/** Clé mensuelle calendaire 'YYYY-MM' (mois local du serveur). */
export function cleMois(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Libellé court FR ('août 26') — même convention que getTendanceMensuelle. */
export function libelleMois(cle: string): string {
  const [a, m] = cle.split('-');
  return new Date(Number(a), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

/** Clés des `nb` derniers mois calendaires, du plus ancien au courant inclus. */
export function moisGlissants(nb: number, ref: Date = new Date()): string[] {
  const cles: string[] = [];
  for (let i = nb - 1; i >= 0; i -= 1) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    cles.push(cleMois(d));
  }
  return cles;
}

/**
 * Tendance mensuelle sur des clés calendaires explicites : moyenne de
 * satisfaction par mois (seuil n>=5 par point) + série NPS mensuelle
 * (agregerNPS sur `score_officiel`, jamais une moyenne de notes).
 * `nb_avis` = avis notables satisfaction (base de la moyenne affichée).
 */
export function construireTendance(lignes: LigneKpi[], cles: string[]): PointTendance[] {
  const parMois = new Map<string, LigneKpi[]>();
  for (const c of cles) parMois.set(c, []);
  for (const l of lignes) {
    if (!l.date_reponse) continue;
    const cle = cleMois(new Date(l.date_reponse));
    const bucket = parMois.get(cle);
    if (bucket) bucket.push(l);
  }
  return cles.map((cle) => {
    const duMois = parMois.get(cle) ?? [];
    const agreg = agregerLignesCritere(duMois);
    const valeursNPS = duMois
      .filter((l) => String(l.critere?.type_reponse || '').toUpperCase() === 'NPS' && Number.isInteger(l.score_officiel))
      .map((l) => Number(l.score_officiel));
    const detailNPS = agregerNPS(valeursNPS);
    return {
      cle,
      libelle: libelleMois(cle),
      nb_avis: agreg.nb_notables,
      moyenne_sur5: agreg.moyenne_sur5,
      nps: detailNPS.volume < SEUIL_KPI_N ? null : detailNPS.nps,
      nps_detail: {
        volume: detailNPS.volume,
        promoteurs: detailNPS.promoteurs,
        passifs: detailNPS.passifs,
        detracteurs: detailNPS.detracteurs,
      },
    };
  });
}
