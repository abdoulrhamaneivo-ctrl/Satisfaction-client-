// src/server/jobs/analyseGlobale.ts
// ============================================================================
// JOB PgBoss — analyse globale d'expérience (vague 1, Phase G).
// Chaque lundi 6h : pour chaque entreprise ACTIVE, garantit une analyse de
// la dernière semaine COMPLÈTE + du mois précédent, puis traite les lignes
// PENDING (dont déclenchements manuels). Idempotent (unique entreprise +
// periode + debut) : un redémarrage ne duplique jamais une analyse.
//
// Volume insuffisant (< SEUIL_MIN_AVIS) : analyse DONE SANS appel LLM
// (limites documentées, budget préservé) — jamais d'invention.
// ============================================================================
import { prisma } from 'wasp/server';
import { AIService } from '../ai/service';
import { PROMPT_SYNTHESE_VERSION } from '../ai/types';
import { calculerAgregats, prioriserIrritants, construirePromptSynthese, derniereSemaineComplete, moisPrecedent, recalerIrritantsSurMesures, } from '../gex/moteurGlobal';
import { budgetDuJour as calculerBudgetDuJour, comparerParPriorite } from '../gex/budget';
export const SEUIL_MIN_AVIS = 10;
/* ── Budget IA (Vague 5, P9) ──────────────────────────────────────────────
 * La règle elle-même vit dans `src/server/gex/budget.ts` : fonction pure,
 * testable sans ouvrir de connexion Prisma. Ce qui suit n'est que le
 * branchement sur l'environnement du job. */
const budgetDuJour = (nbEntreprisesActives) => calculerBudgetDuJour(nbEntreprisesActives, process.env);
const MAX_ATTEMPTS_GEX = Number(process.env.GLOBAL_AI_MAX_ATTEMPTS || 3);
const arrondi1 = (n) => Math.round(n * 10) / 10;
async function budgetRestant(budget) {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    // `model: { not: null }` : une analyse close pour volume insuffisant ne
    // consomme AUCUN budget — elle n'a appelé aucun modèle. (L'audit V0
    // signalait l'inverse sur ce point ; le filtre était déjà là, on le
    // conserve et on le couvre par un test.)
    const consommees = await prisma.globalExperienceAnalysis.count({
        where: { status: 'DONE', processedAt: { gte: debutJour }, model: { not: null } },
    });
    return Math.max(0, budget - consommees);
}
async function assurerProgrammee(idEntreprise, periode, debut, fin) {
    await prisma.globalExperienceAnalysis.upsert({
        where: {
            id_entreprise_periode_debut: { id_entreprise: idEntreprise, periode, debut },
        },
        update: {},
        create: {
            id_entreprise: idEntreprise,
            periode,
            debut,
            fin,
            status: 'PENDING',
        },
    });
}
async function traiterLigne(row, entrepriseNom, budget) {
    const debut = new Date(row.debut);
    const fin = new Date(row.fin);
    const agregats = await calculerAgregats(prisma, {
        id_entreprise: row.id_entreprise,
        debut,
        fin,
    });
    const base = {
        datasetSnapshot: JSON.stringify({
            volumeAvis: agregats.volumeAvis,
            volumeNotables: agregats.volumeNotables,
            volumeCommentaires: agregats.volumeCommentaires,
            totalAnalyses: agregats.totalAnalyses,
        }),
        indicateurs: JSON.stringify({
            csat: agregats.csat,
            nps: agregats.nps,
            // Phase L : effort perçu (null = aucune question CES dans le périmètre).
            ces: agregats.ces
                ? {
                    echelle: agregats.ces.echelle,
                    volume: agregats.ces.volume,
                    note_moyenne: agregats.ces.note_effort_moyenne,
                    top_box_pct: arrondi1(agregats.ces.top_box),
                    taux_effort_eleve_pct: arrondi1(agregats.ces.taux_effort_eleve),
                    taux_faible_effort_pct: arrondi1(agregats.ces.taux_faible_effort),
                }
                : null,
            coherence: {
                analyses: agregats.totalAnalyses,
                incoherentes: agregats.incoherents,
                taux: agregats.tauxIncoherence,
            },
            qualite: agregats.qualiteDonnees,
        }),
        volumeAvis: agregats.volumeAvis,
        volumeCommentaires: agregats.volumeCommentaires,
        qualiteDonnees: agregats.qualiteDonnees,
    };
    // Volume insuffisant : pas d'appel LLM — limites explicites, pas d'invention.
    if (agregats.volumeAvis < SEUIL_MIN_AVIS) {
        await prisma.globalExperienceAnalysis.update({
            where: { id: row.id },
            data: {
                ...base,
                resumeExecutif: null,
                confiance: 'FAIBLE',
                limites: JSON.stringify([
                    `Volume insuffisant (${agregats.volumeAvis} avis, minimum ${SEUIL_MIN_AVIS}) : aucune synthèse IA produite.`,
                ]),
                status: 'DONE',
                processedAt: new Date(),
            },
        });
        return 'ok';
    }
    if ((await budgetRestant(budget)) <= 0)
        return 'budget';
    try {
        const freqPrev = new Map(agregats.themesTopPrev.map((t) => [t.theme, t.count]));
        const entrees = agregats.themesDetail.map((d) => ({
            theme: d.theme,
            count: d.count,
            total: Math.max(1, agregats.totalAnalyses),
            severiteMax: d.severiteMax,
            frequencePrecedente: agregats.totalAnalysesPrev > 0 ? (freqPrev.get(d.theme) ?? 0) / agregats.totalAnalysesPrev : 0,
            agencesDistinctes: d.agencesDistinctes,
            nbAgences: agregats.parAgence.length,
            confiance: d.count >= 30 ? 0.9 : d.count >= 10 ? 0.7 : 0.5,
        }));
        const irritants = prioriserIrritants(entrees).slice(0, 8);
        const periodeLabel = row.periode === 'SEMAINE'
            ? `semaine du ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`
            : `mois de ${debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
        const prompt = construirePromptSynthese(entrepriseNom, periodeLabel, agregats, irritants);
        const { synthese, provider, model } = await AIService.syntheseGlobale(prompt);
        /* Vague 5, P10 — la priorité DÉTERMINISTE fait foi, sans exception.
           Le code précédent conservait la priorité du modèle pour tout thème
           absent de la liste mesurée :
               priorite: deterministe ?? i.priorite
           Un thème que le modèle invente (donc sans fréquence, sans
           sévérité, sans measure) gardait ainsi une priorité « plausible »
           entre 0 et 100, affichée comme un fait à la direction. Le repli
           rendait l'invention invisible : la valeur avait l'air mesurée.
    
           On filtre donc plutôt que de retomber : un irritant qui n'existe pas
           dans les données déterministes n'a pas de priorité, et n'apparaît
           pas. Le modèle ne fait que VERBALISER une liste qu'il a reçue. */
        const { retenus: irritantsVerifies, ecarte: themesInventes } = recalerIrritantsSurMesures(synthese.irritants, irritants);
        if (themesInventes > 0) {
            console.warn(`[GEX] ${themesInventes} irritant(s) écarté(s) : thème absent des mesures ` +
                `déterministes (le modèle l'avait formulé, la donnée ne le dit pas).`);
        }
        await prisma.globalExperienceAnalysis.update({
            where: { id: row.id },
            data: {
                ...base,
                resumeExecutif: synthese.resume_executif,
                pointsPositifs: JSON.stringify(synthese.points_positifs),
                pointsNegatifs: JSON.stringify(synthese.points_negatifs),
                irritants: JSON.stringify(irritantsVerifies),
                tendances: JSON.stringify(synthese.tendances),
                anomalies: JSON.stringify(synthese.anomalies),
                priorites: JSON.stringify(synthese.priorites),
                confiance: synthese.confiance,
                limites: JSON.stringify(synthese.limites),
                model,
                provider,
                promptVersion: PROMPT_SYNTHESE_VERSION,
                status: 'DONE',
                error: null,
                processedAt: new Date(),
            },
        });
        return 'ok';
    }
    catch (e) {
        // Vague 1 (P4) : compteur de tentatives + remise en PENDING tant que le
        // quota n'est pas atteint, pour que l'exécution suivante reprenne. La
        // trace de l'échec est conservée dans `error` même en cas de remise en
        // file : rien n'est effacé en silence.
        const tentatives = (row.attempts ?? 0) + 1;
        await prisma.globalExperienceAnalysis.update({
            where: { id: row.id },
            data: {
                status: tentatives < MAX_ATTEMPTS_GEX ? 'PENDING' : 'FAILED',
                attempts: tentatives,
                error: String(e?.message ?? e).slice(0, 500),
            },
        });
        return 'echec';
    }
}
export async function analyserGlobaleJob(_args, _context) {
    const maintenant = new Date();
    const semaine = derniereSemaineComplete(maintenant);
    const mois = moisPrecedent(maintenant);
    const entreprises = await prisma.entreprise.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, nom_entreprise: true },
    });
    for (const e of entreprises) {
        await assurerProgrammee(e.id, 'SEMAINE', semaine.debut, semaine.fin);
        await assurerProgrammee(e.id, 'MOIS', mois.debut, mois.fin);
    }
    const budget = budgetDuJour(entreprises.length);
    // Sélection : PENDING **et** FAILED sous le quota de tentatives (Vague 1,
    // P4). Sans les echecs, un incident de fournisseur a 6 h un lundi rendait la
    // synthese definitive : aucune execution suivante ne la reprenait.
    //
    // Vague 5, P9 : deux ajustements.
    //  - On prend plus large que le budget puis on trie, au lieu de lire les N
    //    plus anciennes lignes : l'ordre par `createdAt` seul pouvait
    //    consommer le budget du jour sur des périodes MOIS alors que la
    //    SEMAINE correspondante restait en attente. La donnée fraîche passe
    //    d'abord.
    //  - Le reliquat est décompté et renvoyé : un retard qui s'accumule en
    //    silence est un bug invisible.
    const candidats = await prisma.globalExperienceAnalysis.findMany({
        where: {
            OR: [
                { status: 'PENDING' },
                { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS_GEX } },
            ],
        },
        orderBy: { createdAt: 'asc' },
        take: budget * 3,
        include: { entreprise: { select: { nom_entreprise: true } } },
    });
    const files = [...candidats].sort(comparerParPriorite).slice(0, budget);
    let traitees = 0;
    let budgetAtteint = false;
    for (const row of files) {
        if (budgetAtteint)
            break;
        const res = await traiterLigne(row, row.entreprise?.nom_entreprise || 'Entreprise', budget);
        if (res === 'budget')
            budgetAtteint = true;
        else
            traitees += 1;
    }
    const enAttente = await prisma.globalExperienceAnalysis.count({
        where: {
            OR: [
                { status: 'PENDING' },
                { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS_GEX } },
            ],
        },
    });
    if (enAttente > 0) {
        console.warn(`[GEX] ${enAttente} analyse(s) en attente après ce passage (budget ${budget}, ` +
            `${entreprises.length} entreprise(s) active(s)). Le budget IA est la file d'attente.`);
    }
    return {
        status: 'completed',
        entreprises: entreprises.length,
        budget,
        traitees,
        budgetAtteint,
        enAttente,
    };
}
//# sourceMappingURL=analyseGlobale.js.map