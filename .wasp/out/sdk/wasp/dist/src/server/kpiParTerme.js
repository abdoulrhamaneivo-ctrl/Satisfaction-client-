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
import { agregerNPS } from '../shared/scoringEngine';
import { agregerCES, reconnaitreCES } from '../shared/ces';
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
export function normaliserNbJours(valeur, defaut = NB_JOURS_DEFAUT) {
    if (!Number.isFinite(valeur))
        return defaut;
    return Math.min(NB_JOURS_MAX, Math.max(NB_JOURS_MIN, Math.round(valeur)));
}
export function normaliserNbMois(valeur, defaut = NB_MOIS_DEFAUT) {
    if (!Number.isFinite(valeur))
        return defaut;
    return Math.min(NB_MOIS_MAX, Math.max(NB_MOIS_MIN, Math.round(valeur)));
}
/**
 * Famille d'indicateur d'un critère : NPS et CES ont leurs métriques
 * dédiées (jamais moyennés avec la satisfaction), TEXTE et choix
 * catégoriels (QCM/CASES non valencés) ne portent que des répartitions.
 */
export function classifierCritere(critere) {
    const type = String(critere?.type_reponse || '').toUpperCase();
    if (type === 'NPS')
        return 'NPS';
    if (reconnaitreEchelleCES(critere) !== null)
        return 'CES';
    if (estCritereSatisfaction(critere))
        return 'SATISFACTION';
    if (type === 'TEXTE' || String(critere?.scoring_mode || '').toUpperCase() === 'FREE_TEXT')
        return 'TEXTE';
    return 'CATEGORIEL';
}
/**
 * Note /5 depuis le SEUL `score_normalise` (/100 → /5, bornée [1,5]).
 * `score_brut` n'est JAMAIS lu (pas de repli) ; les critères hors
 * satisfaction (TEXTE, QCM/CASES, NPS, CES) rendent null.
 */
export function noteDepuisNormalise(ligne) {
    if (!estCritereSatisfaction((ligne.critere ?? null)))
        return null;
    const s = ligne.score_normalise;
    if (typeof s !== 'number' || !Number.isFinite(s))
        return null;
    return Math.max(1, Math.min(5, s / 20));
}
/** Avis distincts : même `id_soumission` = 1 avis ; orphelines = 1 chacune. */
export function clesAvis(lignes) {
    const cles = new Set();
    for (const l of lignes) {
        cles.add(l.id_soumission ? `s:${l.id_soumission}` : `r:${String(l.id)}`);
    }
    return cles;
}
export function compterAvis(lignes) {
    return clesAvis(lignes).size;
}
function arrondi1(n) {
    return Math.round(n * 10) / 10;
}
function arrondi2(n) {
    return Math.round(n * 100) / 100;
}
export function distributionVide() {
    return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
}
/**
 * Agrège les lignes d'UN critère : seules les notes de satisfaction
 * (noteDepuisNormalise non-null) entrent dans la moyenne. Le seuil porte
 * sur `nb_notables` (la base réelle de la moyenne, pas le volume brut).
 */
export function agregerLignesCritere(lignes) {
    const distribution = distributionVide();
    const notes = [];
    for (const l of lignes) {
        const note = noteDepuisNormalise(l);
        if (note === null)
            continue;
        notes.push(note);
        const bande = String(Math.max(1, Math.min(5, Math.round(note))));
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
/**
 * Répartition des choix : le dénominateur est le nombre d'AVIS distincts
 * (pas le nombre de coches — un avis CASES multi-choix compte 1). Les
 * pourcentages peuvent donc dépasser 100 au total en CASES : c'est la
 * part d'avis cochant chaque option, documentée comme telle.
 */
export function repartirOptionsParAvis(selections, optionsRef) {
    const nb_avis = clesAvis(selections.map((s) => ({ id: s.id, id_soumission: s.id_soumission }))).size;
    const cochesParOption = new Map();
    for (const s of selections) {
        const cle = s.id_soumission ? `s:${s.id_soumission}` : `r:${String(s.id)}`;
        for (const opt of new Set(s.options)) {
            let set = cochesParOption.get(opt);
            if (!set) {
                set = new Set();
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
export function reconnaitreEchelleCES(c) {
    if (!c)
        return null;
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
export function agregerLignesCES(lignes, echelle) {
    const notes = lignes
        .map((l) => l.score_officiel)
        .filter((n) => Number.isInteger(n));
    const agreg = agregerCES(notes, echelle);
    if (agreg.volume < SEUIL_KPI_N)
        return null;
    return agreg;
}
/** Clé mensuelle calendaire 'YYYY-MM' (mois local du serveur). */
export function cleMois(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** Libellé court FR ('août 26') — même convention que getTendanceMensuelle. */
export function libelleMois(cle) {
    const [a, m] = cle.split('-');
    return new Date(Number(a), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}
/** Clés des `nb` derniers mois calendaires, du plus ancien au courant inclus. */
export function moisGlissants(nb, ref = new Date()) {
    const cles = [];
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
export function construireTendance(lignes, cles) {
    const parMois = new Map();
    for (const c of cles)
        parMois.set(c, []);
    for (const l of lignes) {
        if (!l.date_reponse)
            continue;
        const cle = cleMois(new Date(l.date_reponse));
        const bucket = parMois.get(cle);
        if (bucket)
            bucket.push(l);
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
//# sourceMappingURL=kpiParTerme.js.map