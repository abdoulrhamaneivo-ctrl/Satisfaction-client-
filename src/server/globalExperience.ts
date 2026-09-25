// src/server/globalExperience.ts
// ============================================================================
// LECTURE + DÉCLENCHEMENT des analyses globales (vague 1, Phase G).
// - getAnalysesGlobales : scoped entreprise de l'utilisateur connecté.
// - declencherAnalyseGlobale : DIRECTION uniquement ; crée une ligne PENDING
//   (semaine/mois CONTENANT la date donnée, défaut aujourd'hui) que le job
//   hebdo traitera — jamais de calcul synchrone coûteux dans l'action.
// ============================================================================

import { HttpError } from 'wasp/server';
import {
  requireAuth,
  requireRole,
  assertEntrepriseActive,
} from './middleware/rowLevelSecurity';
import { semaineContenant, moisContenant } from './gex/moteurGlobal';

export const getAnalysesGlobales = async (
  args: { periode?: 'SEMAINE' | 'MOIS' } | void,
  context: any,
) => {
  requireAuth(context);
  const idEntreprise = (context.user as any)?.id_entreprise ?? null;
  // Comptes plateforme (sans entreprise) : leur espace est /platform.
  if (!idEntreprise) return [];
  await assertEntrepriseActive(context, context.entities);
  const periode = typeof args === 'object' && args?.periode ? String(args.periode) : undefined;
  if (periode && periode !== 'SEMAINE' && periode !== 'MOIS') {
    throw new HttpError(400, 'Période invalide (SEMAINE ou MOIS).');
  }
  return context.entities.GlobalExperienceAnalysis.findMany({
    where: { id_entreprise: idEntreprise, ...(periode ? { periode } : {}) },
    orderBy: { fin: 'desc' },
    take: 20,
  });
};

export const declencherAnalyseGlobale = async (
  args: { periode: 'SEMAINE' | 'MOIS'; date?: string },
  context: any,
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);
  const idEntreprise = (context.user as any)?.id_entreprise;
  if (!idEntreprise) {
    throw new HttpError(403, "Réservé aux directions d'entreprise.");
  }
  const periode = String(args?.periode || '').toUpperCase();
  if (periode !== 'SEMAINE' && periode !== 'MOIS') {
    throw new HttpError(400, 'Période invalide (SEMAINE ou MOIS).');
  }
  const ref = args?.date ? new Date(args.date) : new Date();
  if (Number.isNaN(ref.getTime())) {
    throw new HttpError(400, 'Date invalide.');
  }
  const bornes = periode === 'SEMAINE' ? semaineContenant(ref) : moisContenant(ref);
  const existante = await context.entities.GlobalExperienceAnalysis.upsert({
    where: {
      id_entreprise_periode_debut: {
        id_entreprise: idEntreprise,
        periode,
        debut: bornes.debut,
      },
    },
    update: {},
    create: {
      id_entreprise: idEntreprise,
      periode,
      debut: bornes.debut,
      fin: bornes.fin,
      status: 'PENDING',
    },
  });
  return {
    id: String(existante.id),
    status: existante.status,
    dejaExistante: existante.status !== 'PENDING',
  };
};
