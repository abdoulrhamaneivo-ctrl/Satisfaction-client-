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
import {
  calculerAgregats,
  prioriserIrritants,
  construirePromptSynthese,
  derniereSemaineComplete,
  moisPrecedent,
  type EntreeIrritant,
} from '../gex/moteurGlobal';

export const SEUIL_MIN_AVIS = 10;
const GLOBAL_AI_BUDGET = Number(process.env.GLOBAL_AI_BUDGET || 5);
const LIMITE_TRAITEMENT = 5;

async function budgetRestant(): Promise<number> {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const consommees = await prisma.globalExperienceAnalysis.count({
    where: { status: 'DONE', processedAt: { gte: debutJour }, model: { not: null } },
  });
  return Math.max(0, GLOBAL_AI_BUDGET - consommees);
}

async function assurerProgrammee(
  idEntreprise: number,
  periode: 'SEMAINE' | 'MOIS',
  debut: Date,
  fin: Date,
): Promise<void> {
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

async function traiterLigne(row: any, entrepriseNom: string): Promise<'ok' | 'budget' | 'echec'> {
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

  if ((await budgetRestant()) <= 0) return 'budget';

  try {
    const freqPrev = new Map(agregats.themesTopPrev.map((t) => [t.theme, t.count]));
    const entrees: EntreeIrritant[] = agregats.themesDetail.map((d) => ({
      theme: d.theme,
      count: d.count,
      total: Math.max(1, agregats.totalAnalyses),
      severiteMax: d.severiteMax,
      frequencePrecedente:
        agregats.totalAnalysesPrev > 0 ? (freqPrev.get(d.theme) ?? 0) / agregats.totalAnalysesPrev : 0,
      agencesDistinctes: d.agencesDistinctes,
      nbAgences: agregats.parAgence.length,
      confiance: d.count >= 30 ? 0.9 : d.count >= 10 ? 0.7 : 0.5,
    }));
    const irritants = prioriserIrritants(entrees).slice(0, 8);
    const periodeLabel =
      row.periode === 'SEMAINE'
        ? `semaine du ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`
        : `mois de ${debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    const prompt = construirePromptSynthese(entrepriseNom, periodeLabel, agregats, irritants);
    const { synthese, provider, model } = await AIService.syntheseGlobale(prompt);

    await prisma.globalExperienceAnalysis.update({
      where: { id: row.id },
      data: {
        ...base,
        resumeExecutif: synthese.resume_executif,
        pointsPositifs: JSON.stringify(synthese.points_positifs),
        pointsNegatifs: JSON.stringify(synthese.points_negatifs),
        irritants: JSON.stringify(
          synthese.irritants.map((i) => ({
            ...i,
            // La priorité DÉTERMINISTE fait foi : le LLM ne la recalcule pas.
            priorite:
              irritants.find((d) => d.theme === i.theme)?.priorite ?? i.priorite,
          })),
        ),
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
  } catch (e: any) {
    await prisma.globalExperienceAnalysis.update({
      where: { id: row.id },
      data: { status: 'FAILED', error: String(e?.message ?? e).slice(0, 500) },
    });
    return 'echec';
  }
}

export async function analyserGlobaleJob(_args: any, _context: any) {
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

  const files = await prisma.globalExperienceAnalysis.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: LIMITE_TRAITEMENT,
    include: { entreprise: { select: { nom_entreprise: true } } },
  });

  let traitees = 0;
  let budgetAtteint = false;
  for (const row of files) {
    if (budgetAtteint) break;
    const res = await traiterLigne(row, row.entreprise?.nom_entreprise || 'Entreprise');
    if (res === 'budget') budgetAtteint = true;
    else traitees += 1;
  }

  return { status: 'completed', entreprises: entreprises.length, traitees, budgetAtteint };
}
