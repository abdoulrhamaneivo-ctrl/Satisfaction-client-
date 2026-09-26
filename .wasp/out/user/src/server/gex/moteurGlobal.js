// src/server/gex/moteurGlobal.ts
// ============================================================================
// MOTEUR D'ANALYSE GLOBALE — vague 1, Phase G. Trois couches strictes :
//   1. ScoreEngine (déterministe, ici) → « combien ? »
//   2. InsightEngine (agrégats déterministes + priorités) → « quoi ? »
//   3. GlobalExperienceEngine (LLM, job) → « situation et pourquoi ? »
// L'IA VERBALISE des agrégats fournis : elle ne mesure ni ne compte rien.
// Chaque conclusion est reconstructible (snapshot stocké sur l'analyse).
// ============================================================================
import { agregerNPS } from '../../shared/scoringEngine';
import { agregerCES, reconnaitreCES } from '../../shared/ces';
// Vague 6 : DATA_QUALITY_SCORE n'est plus recalculé ici. La formule vit
// dans le module canonique, avec ses cinq composantes documentées.
import { scoreQualiteDonnees } from '../../shared/indicateurs';
// Vague 6 : règle unique du CSAT (par avis, satisfaction seule).
import { grouperParAvis, scoresAvisSatisfaction, distributionParAvis, } from '../../shared/csat';
// Gravité ordinale pour la priorité (LOW=1 … CRITICAL=4).
const GRAVITE = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
function moyenne(notes) {
    if (notes.length === 0)
        return null;
    return notes.reduce((s, n) => s + n, 0) / notes.length;
}
function arrondi1(n) {
    return Math.round(n * 10) / 10;
}
/** Confiance globale (pure) : volume + qualité + cohérence. */
export function niveauConfianceGlobal(volumeAvis, qualiteDonnees, tauxIncoherence) {
    const penalite = tauxIncoherence > 0.25 ? 1 : 0;
    if (volumeAvis >= 50 && qualiteDonnees >= 70 && penalite === 0)
        return 'ELEVEE';
    if (volumeAvis >= 15 && qualiteDonnees >= 40)
        return 'MOYENNE';
    return 'FAIBLE';
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
export function recalerIrritantsSurMesures(irritantsDuModele, mesures) {
    const prioriteParTheme = new Map(mesures.map((m) => [m.theme, m.priorite]));
    const retenus = [];
    for (const irritant of irritantsDuModele) {
        const priorite = prioriteParTheme.get(irritant.theme);
        // Thème non mesuré → écarté, sans conserver la valeur du modèle.
        if (priorite === undefined)
            continue;
        retenus.push({ ...irritant, priorite });
    }
    return { retenus, ecarte: irritantsDuModele.length - retenus.length };
}
/**
 * Priorité opérationnelle DÉTERMINISTE (documentée, §28) :
 *   priorite = frequence × gravite × (1 + |evolution|) × etendue × confiance × 100
 * Jamais présentée comme mesure universelle : indicateur interne.
 */
export function prioriserIrritants(entrees) {
    return entrees
        .map((e) => {
        const frequence = e.total > 0 ? e.count / e.total : 0;
        const gravite = GRAVITE[e.severiteMax] ?? 1;
        const evolutionBrute = (frequence - e.frequencePrecedente) / Math.max(e.frequencePrecedente, 0.01);
        const evolution = Math.max(-2, Math.min(2, evolutionBrute));
        const etendue = e.nbAgences > 0 ? e.agencesDistinctes / e.nbAgences : 1;
        const priorite = Math.round(frequence * gravite * (1 + Math.abs(evolution)) * etendue * e.confiance * 100);
        return { ...e, frequence, gravite, evolution, etendue, priorite };
    })
        .sort((a, b) => b.priorite - a.priorite);
}
/** Calcule les agrégats déterministes d'un périmètre (requêtes scopées tenant). */
export async function calculerAgregats(db, p) {
    const agences = await db.agence.findMany({
        where: {
            id_entreprise: p.id_entreprise,
            archive: false,
            ...(p.idsAgences && p.idsAgences.length > 0 ? { id: { in: p.idsAgences } } : {}),
        },
        select: { id: true, nom_agence: true },
        orderBy: { id: 'asc' },
    });
    const idsAgences = agences.map((a) => a.id);
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
            // Vague 6 : la formule canonique de qualité des données
            // (`scoreQualiteDonnees`) intègre une composante « fraîcheur » qui
            // pénalise les lignes HÉRITÉES ou INFERÉES. Sans la colonne dans le
            // SELECT, la composante serait calculée sur une information absente —
            // c'est-à-dire toujours 1, donc invisible. Une colonne sélectionnée
            // de plus, une métrique honnête.
            score_source: true,
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
    const soumissions = new Set();
    let orphelines = 0;
    for (const r of reponses) {
        if (r.id_soumission)
            soumissions.add(String(r.id_soumission));
        else
            orphelines += 1;
    }
    const volumeAvis = soumissions.size + orphelines;
    const notables = reponses.filter((r) => typeof r.score_normalise === 'number' && Number.isFinite(r.score_normalise));
    // Vague 1 (P2) : le CSAT ne doit mesurer QUE de la satisfaction. Le
    // calcul.previous mélangeait dans la même moyenne les notes de
    // recommandation (NPS 0-10) et les scores d'effort (CES, sens inversé) —
    // un « très difficile » 0/100 faisait ainsi plummir un CSAT de 4,2 à 3,8.
    // Ces deux familles ont leurs propres indicateurs (nps, ces ci-dessous).
    //
    // Vague 6 — SOURCE UNIQUE : le calcul est celui de `src/shared/csat.ts`.
    //   - moyenne par AVIS (soumission), pas par ligne. Le volume compte
    //     déjà les soumissions distinctes (`volumeAvis` ci-dessus) : la moyenne
    //     doit obéir à la même unité, sinon le total et ses ventilations ne se
    //     recoupent pas ;
    //   - uniquement les critères de satisfaction, comme ci-dessus.
    // Avant, ce calcul était refait ici ET dans chaque ventilation, avec la
    // moyenne par ligne. Deux agences ayant le même nombre de clients
    // pouvaient donc afficher des CSAT différents selon le nombre de
    // questions de leur formulaire.
    // La LISTE des scores d'avis, pas seulement sa moyenne : les
    // ventilations ci-dessous doivent moyenner exactement la même liste.
    const notesSatisfaction = scoresAvisSatisfaction(reponses);
    const csat = notesSatisfaction.length > 0 ? arrondi1(moyenne(notesSatisfaction)) : null;
    const distribution5 = distributionParAvis(reponses);
    const notesNPS = reponses
        .filter((r) => r.critere?.type_reponse === 'NPS' && Number.isInteger(r.score_officiel))
        .map((r) => Number(r.score_officiel));
    const nps = notesNPS.length > 0 ? agregerNPS(notesNPS) : null;
    // Phase L — CES (effort perçu) : uniquement les critères explicitement
    // marqués CES (échelle 1-5 / 1-7). Aucun critère, aucune estimation —
    // ces = null et le rapport affiche « non mesuré ».
    const notesCES = [];
    for (const r of reponses) {
        const c = r.critere;
        if (!c)
            continue;
        const [minStr, maxStr] = String(c.options_reponse || '').split(',').map((v) => String(v).trim());
        const echelle = reconnaitreCES({
            scoring_mode: c.scoring_mode,
            type_reponse: c.type_reponse,
            echelle_min: minStr ? Number(minStr) : null,
            echelle_max: maxStr ? Number(maxStr) : null,
        });
        if (!echelle)
            continue;
        if (Number.isInteger(r.score_officiel)) {
            notesCES.push({ note: Number(r.score_officiel), echelle });
        }
    }
    let ces = null;
    if (notesCES.length > 0) {
        // Échelles mixtes (1-5 et 1-7) : on sépare, la plus nombreuse gagne,
        // l'autre reste exclue du dénominateur (jamais de mélange silencieux).
        const parEchelle = new Map();
        for (const n of notesCES) {
            const l = parEchelle.get(n.echelle) ?? [];
            l.push(n.note);
            parEchelle.set(n.echelle, l);
        }
        const dominante = [...parEchelle.entries()].sort((a, b) => b[1].length - a[1].length)[0];
        ces = agregerCES(dominante[1], dominante[0]);
    }
    const volumeCommentaires = reponses.filter((r) => String(r.commentaire_texte || '').trim().length > 0).length;
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
    const sentiments = {};
    let incoherents = 0;
    const compteurThemes = new Map();
    const severiteDe = (a) => a.severite || a.urgence || 'LOW';
    for (const a of analyses) {
        const s = a.sentimentRetenu || a.sentiment || 'NEUTRAL';
        sentiments[s] = (sentiments[s] ?? 0) + 1;
        if (a.coherenceNote)
            incoherents += 1;
        let themes = [];
        try {
            const lus = JSON.parse(String(a.themes || '[]'));
            if (Array.isArray(lus))
                themes = lus.filter((t) => typeof t === 'string');
        }
        catch {
            themes = [];
        }
        for (const t of themes) {
            const e = compteurThemes.get(t) ?? { count: 0, severiteMax: 'LOW', agences: new Set() };
            e.count += 1;
            if ((GRAVITE[severiteDe(a)] ?? 1) > (GRAVITE[e.severiteMax] ?? 1))
                e.severiteMax = severiteDe(a);
            if (typeof a.reponse?.id_agence === 'number')
                e.agences.add(a.reponse.id_agence);
            compteurThemes.set(t, e);
        }
    }
    const themesTop = [...compteurThemes.entries()]
        .map(([theme, e]) => ({ theme, count: e.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const themesDetail = [...compteurThemes.entries()]
        .map(([theme, e]) => ({
        theme,
        count: e.count,
        severiteMax: e.severiteMax,
        agencesDistinctes: e.agences.size,
    }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const tauxIncoherence = analyses.length > 0 ? incoherents / analyses.length : 0;
    // Vague 6 : même règle que le CSAT global — par avis, satisfaction
    // seule. Le volume déjà comptait les soumissions, mais la moyenne
    // comptait les lignes ET laissait entrer CES et NPS : une agence pouvait
    // être tirée vers le bas par un « très difficile ».
    const parAgence = agences.map((a) => {
        const lignes = reponses.filter((r) => r.id_agence === a.id);
        const parAvis = grouperParAvis(lignes);
        const scores = scoresAvisSatisfaction(lignes);
        return {
            id: a.id,
            nom: a.nom_agence,
            volume: parAvis.length,
            csat: scores.length > 0 ? arrondi1(moyenne(scores)) : null,
        };
    });
    // Vague 6 : le volume par service comptait les LIGNES — exactement le
    // bug que docs/logique-avis-uniques.md déclare avoir corrigé. Deux
    // services avec le même nombre de clients mais un nombre de questions
    // différent affichaient des volumes différents. Le comptage passe par
    // les avis distincts, comme partout ailleurs.
    const servicesMap = new Map();
    for (const r of reponses) {
        const cle = r.id_service ?? null;
        const e = servicesMap.get(cle) ?? {
            nom: r.service?.libelle_service || 'Sans opération',
            lignes: [],
        };
        e.lignes.push(r);
        servicesMap.set(cle, e);
    }
    const parService = [...servicesMap.entries()].map(([id, e]) => {
        const parAvis = grouperParAvis(e.lignes);
        const scores = scoresAvisSatisfaction(e.lignes);
        return {
            id,
            nom: e.nom,
            volume: parAvis.length,
            csat: scores.length > 0 ? arrondi1(moyenne(scores)) : null,
        };
    });
    // Même correction que par service : volume par avis, CSAT par avis et
    // satisfaction seule. Le seuil §39 (volume minimal 5) continue de
    // porter sur le nombre d'AVIS, ce qui est l'unité affichée.
    const guichetsMap = new Map();
    for (const r of reponses) {
        const e = guichetsMap.get(r.id_guichet) ?? {
            nom: r.guichet?.nom_guichet || `Guichet ${r.id_guichet}`,
            lignes: [],
        };
        e.lignes.push(r);
        guichetsMap.set(r.id_guichet, e);
    }
    // §39 : volume minimal 5 pour comparer (évite les faux champions).
    const guichetsNotables = [...guichetsMap.entries()]
        .map(([id, e]) => {
        const parAvis = grouperParAvis(e.lignes);
        const scores = scoresAvisSatisfaction(e.lignes);
        return {
            id,
            nom: e.nom,
            volume: parAvis.length,
            csat: scores.length > 0 ? arrondi1(moyenne(scores)) : null,
        };
    })
        .filter((g) => g.csat !== null && g.volume >= 5)
        .sort((a, b) => b.csat - a.csat);
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
    const subsPrev = new Set();
    let orphPrev = 0;
    const notesPrev = [];
    for (const r of prev) {
        if (r.id_soumission)
            subsPrev.add(String(r.id_soumission));
        else
            orphPrev += 1;
        if (typeof r.score_normalise === 'number')
            notesPrev.push(Number(r.score_normalise));
    }
    const volumePrev = subsPrev.size + orphPrev;
    const csatPrev = notesPrev.length > 0 ? moyenne(notesPrev) : null;
    const evolutionVolumePct = volumePrev > 0 && volumeAvis >= 0
        ? arrondi1(((volumeAvis - volumePrev) / volumePrev) * 100)
        : null;
    const evolutionCsatPts = csat !== null && csatPrev !== null ? arrondi1(csat - csatPrev) : null;
    // Thèmes de la période précédente (même durée) pour l'évolution par
    // irritant. Déclaré ici car prevDebut/prevFin naissent juste au-dessus.
    const analysesPrev = await db.analyseAvisIA.findMany({
        where: {
            status: 'DONE',
            reponse: { id_agence: { in: idsAgences }, date_reponse: { gte: prevDebut, lte: prevFin } },
        },
        select: { themes: true },
    });
    const compteurPrev = new Map();
    for (const a of analysesPrev) {
        try {
            const lus = JSON.parse(String(a.themes || '[]'));
            if (Array.isArray(lus)) {
                for (const t of lus) {
                    if (typeof t === 'string')
                        compteurPrev.set(t, (compteurPrev.get(t) ?? 0) + 1);
                }
            }
        }
        catch {
            // Thème illisible : ignoré (ne fausse pas les fréquences).
        }
    }
    const themesTopPrev = [...compteurPrev.entries()]
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    // Qualité des données — SOURCE UNIQUE.
    //
    // Avant, cette valeur était recalculée ici avec une formule locale
    // (50 % notables + 30 % commentées + 20 % cohérence) alors que le
    // module canonique `src/shared/indicateurs.ts` en documentait une autre
    // (35/20/20/15/10, avec fraîcheur et volume). Deux définitions
    // divergentes de la même métrique, dont une seule réellement affichée :
    // le catalogue mentait sur la formule, et rien ne le signalait.
    //
    // On appelle désormais la fonction canonique. Conséquence : la valeur
    // AFFICHÉE change (c'est une correction, pas un réglage) et devient
    //终于 explicable composante par composante — voir `details`.
    const { score: qualiteDonnees, details: qualiteDetails } = scoreQualiteDonnees({
        totalReponses: reponses.length,
        notables: notables.length,
        avecCommentaire: volumeCommentaires,
        incoherentes: incoherents,
        legacy: reponses.filter((r) => r.score_source === 'LEGACY_POSITIONAL' || r.score_source === 'MIGRATED').length,
        inferees: reponses.filter((r) => r.score_source === 'INFERRED').length,
    });
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
        qualiteDonneesDetails: qualiteDetails,
        confiance: niveauConfianceGlobal(volumeAvis, qualiteDonnees, tauxIncoherence),
    };
}
/**
 * Dernière semaine COMPLÈTE (lundi 00:00 → dimanche 23:59:59.999) avant la
 * semaine contenant `ref`. Jamais la semaine en cours (données partelles).
 */
export function derniereSemaineComplete(ref = new Date()) {
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
export function moisPrecedent(ref = new Date()) {
    const debut = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 0, 0, 0, 0);
    const fin = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    fin.setMilliseconds(fin.getMilliseconds() - 1);
    return { debut, fin };
}
/** Semaine (lun-dim) CONTENANT une date — déclenchement manuel uniquement. */
export function semaineContenant(ref) {
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
export function moisContenant(ref) {
    const debut = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);
    fin.setMilliseconds(fin.getMilliseconds() - 1);
    return { debut, fin };
}
/** Prompt LLM déterministe : même entrée → même chaîne (testé). */
export function construirePromptSynthese(entrepriseNom, periodeLabel, a, irritants) {
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
    return (`Synthèse d'expérience client (période : ${periodeLabel}, entreprise : ${entrepriseNom}).\n` +
        `DONNÉES VÉRIFIÉES (seule source autorisée — cite ces nombres, n'en invente aucun) :\n` +
        `${JSON.stringify(doc)}\n` +
        `Retourne exclusivement le JSON demandé (resume_executif, points_positifs, points_negatifs, irritants, tendances, anomalies, priorites, confiance, limites).`);
}
