// src/server/gex/moteurGlobal.ts
// ============================================================================
// MOTEUR D'ANALYSE GLOBALE — vague 1, Phase G. Trois couches strictes :
//   1. ScoreEngine (déterministe, ici) → « combien ? »
//   2. InsightEngine (agrégats déterministes + priorités) → « quoi ? »
//   3. GlobalExperienceEngine (LLM, job) → « situation et pourquoi ? »
// L'IA VERBALISE des agrégats fournis : elle ne mesure ni ne compte rien.
// Chaque conclusion est reconstructible (snapshot stocké sur l'analyse).
// ============================================================================

import { agregerNPS, type AgregationNPS } from '../../shared/scoringEngine';
import { agregerCES, reconnaitreCES, type AgregationCES } from '../../shared/ces';
import { estCritereSatisfaction } from '../../shared/noteSur5';

export interface PerimetreGlobal {
  id_entreprise: number;
  debut: Date;
  fin: Date;
  /** Restreint aux agences listées (vue chef d'agence). Défaut : tout le réseau. */
  idsAgences?: number[];
}

export type LigneAgence = {
  id: number;
  nom: string;
  volume: number;
  csat: number | null;
}

export type ThemeCompte = {
  theme: string;
  count: number;
}

export type ThemeDetail = ThemeCompte & {
  severiteMax: string;
  agencesDistinctes: number;
}

export type AgregatsGlobaux = {
  volumeAvis: number;
  volumeNotables: number;
  volumeCommentaires: number;
  csat: number | null;
  distribution5: Record<string, number>;
  nps: AgregationNPS | null;
  /** Phase L : effort perçu. null = aucune question CES dans le périmètre. */
  ces: AgregationCES | null;
  sentiments: Record<string, number>;
  totalAnalyses: number;
  incoherents: number;
  tauxIncoherence: number;
  themesTop: ThemeCompte[];
  /** Détail par thème (sévérité max + étendue) pour la priorisation. */
  themesDetail: ThemeDetail[];
  /** Fréquences de la période précédente (évolution par irritant). */
  themesTopPrev: ThemeCompte[];
  totalAnalysesPrev: number;
  parAgence: LigneAgence[];
  parService: { id: number | null; nom: string; volume: number; csat: number | null }[];
  guichetsTop: { id: number; nom: string; volume: number; csat: number | null }[];
  guichetsFlop: { id: number; nom: string; volume: number; csat: number | null }[];
  evolutionVolumePct: number | null;
  evolutionCsatPts: number | null;
  qualiteDonnees: number;
  confiance: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
}

// Gravité ordinale pour la priorité (LOW=1 … CRITICAL=4).
const GRAVITE: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function moyenne(notes: number[]): number | null {
  if (notes.length === 0) return null;
  return notes.reduce((s, n) => s + n, 0) / notes.length;
}

function arrondi1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Confiance globale (pure) : volume + qualité + cohérence. */
export function niveauConfianceGlobal(
  volumeAvis: number,
  qualiteDonnees: number,
  tauxIncoherence: number,
): 'FAIBLE' | 'MOYENNE' | 'ELEVEE' {
  const penalite = tauxIncoherence > 0.25 ? 1 : 0;
  if (volumeAvis >= 50 && qualiteDonnees >= 70 && penalite === 0) return 'ELEVEE';
  if (volumeAvis >= 15 && qualiteDonnees >= 40) return 'MOYENNE';
  return 'FAIBLE';
}

export interface EntreeIrritant {
  theme: string;
  count: number;
  total: number;
  severiteMax: string;
  frequencePrecedente: number;
  agencesDistinctes: number;
  nbAgences: number;
  confiance: number;
}

export interface IrritantPriorise extends EntreeIrritant {
  frequence: number;
  gravite: number;
  evolution: number;
  etendue: number;
  priorite: number;
}

/**
 * Recale les irritants verbalisés par le modèle sur les mesures réelles
 * (Vague 5, P10).
 *
 * Le modèle reçoit une liste d'irritants DÉTERMINISTES et la commente. Il
 * peut toutefois en formuler un dont la donnée ne dit rien — un thème
 * absent des mesures, donc sans fréquence, sans gravité, sans étendue.
 *
 * Le code précédent gardait la priorité du modèle dans ce cas :
 *
 *     priorite: deterministe(theme) ?? i.priorite
 *
 * Une valeur « plausible » entre 0 et 100 se retrouvait donc affichée à
 * la direction avec l'apparence d'une mesure. Le repli rendait
 * l'invention invisible : impossible de distinguer une priorité calculée
 * d'une priorité inventée, même en relisant le code.
 *
 * Ici on SUPPRIME ce qui n'est pas mesuré. Un irritant absent des
 * données n'a pas de priorité, donc il n'est pas affiché. Le modèle
 * verbalise, il ne mesure pas.
 *
 * @returns les irritants retenus, priorité réécrite, et le nombre écarté.
 */
export function recalerIrritantsSurMesures<T extends { theme: string; priorite: number }>(
  irritantsDuModele: T[],
  mesures: Pick<IrritantPriorise, 'theme' | 'priorite'>[],
): { retenus: T[]; ecarte: number } {
  const prioriteParTheme = new Map(mesures.map((m) => [m.theme, m.priorite]));
  const retenus: T[] = [];
  for (const irritant of irritantsDuModele) {
    const priorite = prioriteParTheme.get(irritant.theme);
    // Thème non mesuré → écarté, sans conserver la valeur du modèle.
    if (priorite === undefined) continue;
    retenus.push({ ...irritant, priorite });
  }
  return { retenus, ecarte: irritantsDuModele.length - retenus.length };
}

/**
 * Priorité opérationnelle DÉTERMINISTE (documentée, §28) :
 *   priorite = frequence × gravite × (1 + |evolution|) × etendue × confiance × 100
 * Jamais présentée comme mesure universelle : indicateur interne.
 */
export function prioriserIrritants(entrees: EntreeIrritant[]): IrritantPriorise[] {
  return entrees
    .map((e) => {
      const frequence = e.total > 0 ? e.count / e.total : 0;
      const gravite = GRAVITE[e.severiteMax] ?? 1;
      const evolutionBrute =
        (frequence - e.frequencePrecedente) / Math.max(e.frequencePrecedente, 0.01);
      const evolution = Math.max(-2, Math.min(2, evolutionBrute));
      const etendue = e.nbAgences > 0 ? e.agencesDistinctes / e.nbAgences : 1;
      const priorite = Math.round(
        frequence * gravite * (1 + Math.abs(evolution)) * etendue * e.confiance * 100,
      );
      return { ...e, frequence, gravite, evolution, etendue, priorite };
    })
    .sort((a, b) => b.priorite - a.priorite);
}

/** Calcule les agrégats déterministes d'un périmètre (requêtes scopées tenant). */
export async function calculerAgregats(db: any, p: PerimetreGlobal): Promise<AgregatsGlobaux> {
  const agences = await db.agence.findMany({
    where: {
      id_entreprise: p.id_entreprise,
      archive: false,
      ...(p.idsAgences && p.idsAgences.length > 0 ? { id: { in: p.idsAgences } } : {}),
    },
    select: { id: true, nom_agence: true },
    orderBy: { id: 'asc' },
  });
  const idsAgences = agences.map((a: any) => a.id);

  const reponses = await db.reponse.findMany({
    where: {
      id_agence: { in: idsAgences },
      date_reponse: { gte: p.debut, lte: p.fin },
    },
    select: {
      id: true,
      id_soumission: true,
      score_normalise: true,
      score_officiel: true,
      commentaire_texte: true,
      id_agence: true,
      id_guichet: true,
      id_service: true,
      critere: { select: { type_reponse: true, libelle_critere: true, scoring_mode: true, options_reponse: true } },
      guichet: { select: { nom_guichet: true } },
      service: { select: { libelle_service: true } },
      agence: { select: { nom_agence: true } },
    },
  });

  // Volume d'avis = soumissions distinctes (lignes orphelines = 1 avis chacune).
  const soumissions = new Set<string>();
  let orphelines = 0;
  for (const r of reponses) {
    if (r.id_soumission) soumissions.add(String(r.id_soumission));
    else orphelines += 1;
  }
  const volumeAvis = soumissions.size + orphelines;

  const notables = reponses.filter(
    (r: any) => typeof r.score_normalise === 'number' && Number.isFinite(r.score_normalise),
  );
  // Vague 1 (P2) : le CSAT ne doit mesurer QUE de la satisfaction. Le
  // calcul.previous mélangeait dans la même moyenne les notes de
  // recommandation (NPS 0-10) et les scores d'effort (CES, sens inversé) —
  // un « très difficile » 0/100 faisait ainsi plummir un CSAT de 4,2 à 3,8.
  // Ces deux familles ont leurs propres indicateurs (nps, ces ci-dessous).
  const notesSatisfaction: number[] = [];
  for (const r of notables) {
    const c: any = r.critere;
    if (!estCritereSatisfaction({ type_reponse: c?.type_reponse, scoring_mode: c?.scoring_mode })) continue;
    notesSatisfaction.push(Number(r.score_normalise));
  }
  const csat = notesSatisfaction.length > 0 ? arrondi1(moyenne(notesSatisfaction) as number) : null;

  const distribution5: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const n of notesSatisfaction) {
    const b = Math.max(1, Math.min(5, Math.round(n / 20)));
    distribution5[String(b)] += 1;
  }

  const notesNPS = reponses
    .filter((r: any) => r.critere?.type_reponse === 'NPS' && Number.isInteger(r.score_officiel))
    .map((r: any) => Number(r.score_officiel));
  const nps = notesNPS.length > 0 ? agregerNPS(notesNPS) : null;

  // Phase L — CES (effort perçu) : uniquement les critères explicitement
  // marqués CES (échelle 1-5 / 1-7). Aucun critère, aucune estimation —
  // ces = null et le rapport affiche « non mesuré ».
  const notesCES: { note: number; echelle: 5 | 7 }[] = [];
  for (const r of reponses) {
    const c: any = r.critere;
    if (!c) continue;
    const [minStr, maxStr] = String(c.options_reponse || '').split(',').map((v) => String(v).trim());
    const echelle = reconnaitreCES({
      scoring_mode: c.scoring_mode,
      type_reponse: c.type_reponse,
      echelle_min: minStr ? Number(minStr) : null,
      echelle_max: maxStr ? Number(maxStr) : null,
    });
    if (!echelle) continue;
    if (Number.isInteger(r.score_officiel)) {
      notesCES.push({ note: Number(r.score_officiel), echelle });
    }
  }
  let ces: AgregationCES | null = null;
  if (notesCES.length > 0) {
    // Échelles mixtes (1-5 et 1-7) : on sépare, la plus nombreuse gagne,
    // l'autre reste exclue du dénominateur (jamais de mélange silencieux).
    const parEchelle = new Map<5 | 7, number[]>();
    for (const n of notesCES) {
      const l = parEchelle.get(n.echelle) ?? [];
      l.push(n.note);
      parEchelle.set(n.echelle, l);
    }
    const dominante = [...parEchelle.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    ces = agregerCES(dominante[1], dominante[0]);
  }

  const volumeCommentaires = reponses.filter(
    (r: any) => String(r.commentaire_texte || '').trim().length > 0,
  ).length;

  const analyses = await db.analyseAvisIA.findMany({
    where: {
      status: 'DONE',
      reponse: { id_agence: { in: idsAgences }, date_reponse: { gte: p.debut, lte: p.fin } },
    },
    select: {
      sentiment: true,
      sentimentRetenu: true,
      themes: true,
      urgence: true,
      severite: true,
      coherenceNote: true,
      confidence: true,
      reponse: { select: { id_agence: true, id_guichet: true } },
    },
  });

  const sentiments: Record<string, number> = {};
  let incoherents = 0;
  const compteurThemes = new Map<string, { count: number; severiteMax: string; agences: Set<number> }>();
  const severiteDe = (a: any): string => a.severite || a.urgence || 'LOW';
  for (const a of analyses) {
    const s = a.sentimentRetenu || a.sentiment || 'NEUTRAL';
    sentiments[s] = (sentiments[s] ?? 0) + 1;
    if (a.coherenceNote) incoherents += 1;
    let themes: string[] = [];
    try {
      const lus = JSON.parse(String(a.themes || '[]'));
      if (Array.isArray(lus)) themes = lus.filter((t) => typeof t === 'string');
    } catch {
      themes = [];
    }
    for (const t of themes) {
      const e = compteurThemes.get(t) ?? { count: 0, severiteMax: 'LOW', agences: new Set<number>() };
      e.count += 1;
      if ((GRAVITE[severiteDe(a)] ?? 1) > (GRAVITE[e.severiteMax] ?? 1)) e.severiteMax = severiteDe(a);
      if (typeof a.reponse?.id_agence === 'number') e.agences.add(a.reponse.id_agence);
      compteurThemes.set(t, e);
    }
  }
  const themesTop: ThemeCompte[] = [...compteurThemes.entries()]
    .map(([theme, e]) => ({ theme, count: e.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const themesDetail: ThemeDetail[] = [...compteurThemes.entries()]
    .map(([theme, e]) => ({
      theme,
      count: e.count,
      severiteMax: e.severiteMax,
      agencesDistinctes: e.agences.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const tauxIncoherence = analyses.length > 0 ? incoherents / analyses.length : 0;

  const parAgence: LigneAgence[] = agences.map((a: any) => {
    const lignes = reponses.filter((r: any) => r.id_agence === a.id);
    const notes = lignes
      .filter((r: any) => typeof r.score_normalise === 'number')
      .map((r: any) => Number(r.score_normalise));
    // Volume d'avis par agence (soumissions distinctes).
    const subs = new Set<string>();
    let orph = 0;
    for (const r of lignes) {
      if ((r as any).id_soumission) subs.add(String((r as any).id_soumission));
      else orph += 1;
    }
    return {
      id: a.id,
      nom: a.nom_agence,
      volume: subs.size + orph,
      csat: notes.length > 0 ? arrondi1(moyenne(notes) as number) : null,
    };
  });

  const servicesMap = new Map<number | null, { nom: string; notes: number[]; volume: number }>();
  for (const r of reponses) {
    const e = servicesMap.get(r.id_service ?? null) ?? {
      nom: r.service?.libelle_service || 'Sans opération',
      notes: [] as number[],
      volume: 0,
    };
    e.volume += 1;
    if (typeof r.score_normalise === 'number') e.notes.push(Number(r.score_normalise));
    servicesMap.set(r.id_service ?? null, e);
  }
  const parService = [...servicesMap.entries()].map(([id, e]) => ({
    id,
    nom: e.nom,
    volume: e.volume,
    csat: e.notes.length > 0 ? arrondi1(moyenne(e.notes) as number) : null,
  }));

  const guichetsMap = new Map<number, { nom: string; notes: number[]; volume: number }>();
  for (const r of reponses) {
    const e = guichetsMap.get(r.id_guichet) ?? {
      nom: r.guichet?.nom_guichet || `Guichet ${r.id_guichet}`,
      notes: [] as number[],
      volume: 0,
    };
    e.volume += 1;
    if (typeof r.score_normalise === 'number') e.notes.push(Number(r.score_normalise));
    guichetsMap.set(r.id_guichet, e);
  }
  // §39 : volume minimal 5 pour comparer (évite les faux champions).
  const guichetsNotables = [...guichetsMap.entries()]
    .map(([id, e]) => ({
      id,
      nom: e.nom,
      volume: e.volume,
      csat: e.notes.length > 0 ? arrondi1(moyenne(e.notes) as number) : null,
    }))
    .filter((g) => g.csat !== null && g.volume >= 5)
    .sort((a, b) => (b.csat as number) - (a.csat as number));
  const guichetsTop = guichetsNotables.slice(0, 3);
  const guichetsFlop = guichetsNotables.slice(-3).reverse();

  // Évolution vs période précédente de même durée (volume + CSAT).
  const dureeMs = p.fin.getTime() - p.debut.getTime();
  const prevFin = new Date(p.debut.getTime() - 1);
  const prevDebut = new Date(prevFin.getTime() - dureeMs);
  const prev = await db.reponse.findMany({
    where: {
      id_agence: { in: idsAgences },
      date_reponse: { gte: prevDebut, lte: prevFin },
    },
    select: { id_soumission: true, score_normalise: true },
  });
  const subsPrev = new Set<string>();
  let orphPrev = 0;
  const notesPrev: number[] = [];
  for (const r of prev) {
    if ((r as any).id_soumission) subsPrev.add(String((r as any).id_soumission));
    else orphPrev += 1;
    if (typeof (r as any).score_normalise === 'number') notesPrev.push(Number((r as any).score_normalise));
  }
  const volumePrev = subsPrev.size + orphPrev;
  const csatPrev = notesPrev.length > 0 ? moyenne(notesPrev) : null;
  const evolutionVolumePct =
    volumePrev > 0 && volumeAvis >= 0
      ? arrondi1(((volumeAvis - volumePrev) / volumePrev) * 100)
      : null;
  const evolutionCsatPts =
    csat !== null && csatPrev !== null ? arrondi1(csat - (csatPrev as number)) : null;

  // Thèmes de la période précédente (même durée) pour l'évolution par
  // irritant. Déclaré ici car prevDebut/prevFin naissent juste au-dessus.
  const analysesPrev = await db.analyseAvisIA.findMany({
    where: {
      status: 'DONE',
      reponse: { id_agence: { in: idsAgences }, date_reponse: { gte: prevDebut, lte: prevFin } },
    },
    select: { themes: true },
  });
  const compteurPrev = new Map<string, number>();
  for (const a of analysesPrev) {
    try {
      const lus = JSON.parse(String((a as any).themes || '[]'));
      if (Array.isArray(lus)) {
        for (const t of lus) {
          if (typeof t === 'string') compteurPrev.set(t, (compteurPrev.get(t) ?? 0) + 1);
        }
      }
    } catch {
      // Thème illisible : ignoré (ne fausse pas les fréquences).
    }
  }
  const themesTopPrev: ThemeCompte[] = [...compteurPrev.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Qualité des données (simple, documentée ; Phase H la raffine) :
  // 50 % notables + 30 % commentées + 20 % cohérence.
  const partNotables = reponses.length > 0 ? notables.length / reponses.length : 0;
  const partCommentaires = reponses.length > 0 ? volumeCommentaires / reponses.length : 0;
  const qualiteDonnees = arrondi1(
    100 * (0.5 * partNotables + 0.3 * partCommentaires + 0.2 * (1 - tauxIncoherence)),
  );

  return {
    volumeAvis,
    volumeNotables: notables.length,
    volumeCommentaires,
    csat,
    distribution5,
    nps,
    ces,
    sentiments,
    totalAnalyses: analyses.length,
    incoherents,
    tauxIncoherence: arrondi1(tauxIncoherence * 100) / 100,
    themesTop,
    themesDetail,
    themesTopPrev,
    totalAnalysesPrev: analysesPrev.length,
    parAgence,
    parService,
    guichetsTop,
    guichetsFlop,
    evolutionVolumePct,
    evolutionCsatPts,
    qualiteDonnees,
    confiance: niveauConfianceGlobal(volumeAvis, qualiteDonnees, tauxIncoherence),
  };
}

/**
 * Dernière semaine COMPLÈTE (lundi 00:00 → dimanche 23:59:59.999) avant la
 * semaine contenant `ref`. Jamais la semaine en cours (données partelles).
 */
export function derniereSemaineComplete(ref: Date = new Date()): { debut: Date; fin: Date } {
  const r = new Date(ref);
  const jour = (r.getDay() + 6) % 7; // 0 = lundi
  const lundiCourant = new Date(r);
  lundiCourant.setHours(0, 0, 0, 0);
  lundiCourant.setDate(lundiCourant.getDate() - jour);
  const debut = new Date(lundiCourant);
  debut.setDate(debut.getDate() - 7);
  const fin = new Date(lundiCourant);
  fin.setMilliseconds(fin.getMilliseconds() - 1);
  return { debut, fin };
}

/** Mois calendaire COMPLET précédent (jamais le mois en cours). */
export function moisPrecedent(ref: Date = new Date()): { debut: Date; fin: Date } {
  const debut = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 0, 0, 0, 0);
  const fin = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  fin.setMilliseconds(fin.getMilliseconds() - 1);
  return { debut, fin };
}

/** Semaine (lun-dim) CONTENANT une date — déclenchement manuel uniquement. */
export function semaineContenant(ref: Date): { debut: Date; fin: Date } {
  const r = new Date(ref);
  const jour = (r.getDay() + 6) % 7;
  const debut = new Date(r);
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - jour);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 7);
  fin.setMilliseconds(fin.getMilliseconds() - 1);
  return { debut, fin };
}

/** Mois calendaire CONTENANT une date — déclenchement manuel uniquement. */
export function moisContenant(ref: Date): { debut: Date; fin: Date } {
  const debut = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);
  fin.setMilliseconds(fin.getMilliseconds() - 1);
  return { debut, fin };
}

/** Prompt LLM déterministe : même entrée → même chaîne (testé). */
export function construirePromptSynthese(
  entrepriseNom: string,
  periodeLabel: string,
  a: AgregatsGlobaux,
  irritants: ReturnType<typeof prioriserIrritants>,
): string {
  const doc = {
    entreprise: entrepriseNom,
    periode: periodeLabel,
    volumes: {
      avis: a.volumeAvis,
      reponses_notables: a.volumeNotables,
      commentaires: a.volumeCommentaires,
      analyses_ia: a.totalAnalyses,
    },
    csat_sur_100: a.csat ?? 'non disponible',
    distribution_notes_sur_5: a.distribution5,
    nps: a.nps ?? 'non disponible (aucune question NPS)',
    ces_effort_percu: a.ces
      ? {
          echelle: `1-${a.ces.echelle}`,
          volume: a.ces.volume,
          note_effort_moyenne: a.ces.note_effort_moyenne,
          top_box_faible_effort_pct: arrondi1(a.ces.top_box),
          taux_effort_eleve_pct: arrondi1(a.ces.taux_effort_eleve),
          repartition: a.ces.repartition,
          rappel: "1 = très facile (bonne expérience), valeur max = très difficile",
        }
      : 'non disponible (aucune question d\'effort CES)',
    sentiments_ia: a.sentiments,
    coherence: {
      analyses: a.totalAnalyses,
      incoherentes_note_vs_texte: a.incoherents,
      taux_incoherence: a.tauxIncoherence,
    },
    themes_top: a.themesTop,
    irritants_priorises: irritants.map((i) => ({
      theme: i.theme,
      priorite_sur_100: i.priorite,
      frequence: arrondi1(i.frequence * 100) / 100,
      gravite_sur_4: i.gravite,
      evolution_relative: arrondi1(i.evolution * 100) / 100,
      confiance: i.confiance,
    })),
    par_agence: a.parAgence,
    par_service: a.parService,
    guichets_top: a.guichetsTop,
    guichets_flop: a.guichetsFlop,
    evolution_vs_periode_precedente: {
      volume_pct: a.evolutionVolumePct ?? 'non disponible',
      csat_points: a.evolutionCsatPts ?? 'non disponible',
    },
    qualite_donnees_sur_100: a.qualiteDonnees,
    confiance_globale: a.confiance,
  };
  return (
    `Synthèse d'expérience client (période : ${periodeLabel}, entreprise : ${entrepriseNom}).\n` +
    `DONNÉES VÉRIFIÉES (seule source autorisée — cite ces nombres, n'en invente aucun) :\n` +
    `${JSON.stringify(doc)}\n` +
    `Retourne exclusivement le JSON demandé (resume_executif, points_positifs, points_negatifs, irritants, tendances, anomalies, priorites, confiance, limites).`
  );
}
