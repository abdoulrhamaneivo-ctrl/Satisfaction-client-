// src/server/jobs/genererPlanning.ts
// ============================================================================
// Cron Job — Génération auto du planning depuis les semaines types.
// ============================================================================
// Chaque matin, pour chaque agence active dont l'entreprise est ACTIVE ou
// TRIAL : si le jour n'a AUCUNE affectation, on le génère depuis la grille
// (ModeleHoraire). Si le chef a déjà saisi manuellement, on ne touche à
// rien — le manuel prime toujours sur l'auto.
// ============================================================================

import { prisma } from 'wasp/server';
import { genererDepuisModeles } from '../planningService';

export const genererPlanningAutoJob = async (_args: unknown, _context: any) => {
  const today = new Date().toISOString().slice(0, 10);

  const agences = await prisma.agence.findMany({
    where: {
      archive: false,
      entreprise: { status: { in: ['ACTIVE', 'TRIAL'] } },
      modelesHoraires: { some: {} },
    },
    select: { id: true, nom_agence: true },
  });

  let agencesTraitees = 0;
  let totalCrees = 0;
  const details: Array<{ agence: string; crees: number; ignores: number }> = [];

  for (const agence of agences) {
    const dejaPlanifie = await prisma.affectationGuichet.count({
      where: {
        date_affectation: new Date(today),
        guichet: { id_agence: agence.id },
      },
    });
    // Manuel prime : si le chef a déjà planifié, on ne génère rien.
    if (dejaPlanifie > 0) continue;

    try {
      const res = await genererDepuisModeles(prisma as any, agence.id, today, today);
      agencesTraitees++;
      totalCrees += res.crees;
      details.push({ agence: agence.nom_agence, crees: res.crees, ignores: res.ignores.length });
    } catch (err: any) {
      console.error(`[PLANNING-AUTO] Agence #${agence.id} (${agence.nom_agence}) :`, err?.message);
    }
  }

  return { status: 'completed', date: today, agencesTraitees, totalCrees, details };
};
