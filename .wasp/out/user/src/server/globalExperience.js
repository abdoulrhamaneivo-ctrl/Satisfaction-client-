// src/server/globalExperience.ts
// ============================================================================
// LECTURE + DÉCLENCHEMENT des analyses globales (vague 1, Phase G).
// - getAnalysesGlobales : scoped entreprise de l'utilisateur connecté.
// - declencherAnalyseGlobale : DIRECTION uniquement ; crée une ligne PENDING
//   (semaine/mois CONTENANT la date donnée, défaut aujourd'hui) que le job
//   hebdo traitera — jamais de calcul synchrone coûteux dans l'action.
// ============================================================================
import { HttpError } from 'wasp/server';
import { requireAuth, requireRole, requireManagementRole, assertEntrepriseActive, } from './middleware/rowLevelSecurity';
import { semaineContenant, moisContenant } from './gex/moteurGlobal';
export const getAnalysesGlobales = async (args, context) => {
    requireAuth(context);
    // SÉCURITÉ (Vague 1, P5) : la synthèse exécutive, les irritants et les
    // priorités sont des agrégats de direction. Le module RLS documente que
    // « le front n'est jamais la protection » : l'absence de contrôle de rôle
    // laissait un AGENT lire la lecture complète de l'entreprise.
    requireManagementRole(context);
    const idEntreprise = context.user?.id_entreprise ?? null;
    // Comptes plateforme (sans entreprise) : leur espace est /platform.
    if (!idEntreprise)
        return [];
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
export const declencherAnalyseGlobale = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION']);
    const idEntreprise = context.user?.id_entreprise;
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
    // Vague 1 (P4) : le déclencheur manuel REMET EN FILE une analyse échouée ou
    // bloquée. Avant, `update: {}` laissait la ligne FAILED telle quelle et
    // répondait « déjà disponible » : un incident de fournisseur condamnait la
    // synthèse de la semaine, définitivement et sans issue.
    const existante = await context.entities.GlobalExperienceAnalysis.upsert({
        where: {
            id_entreprise_periode_debut: {
                id_entreprise: idEntreprise,
                periode,
                debut: bornes.debut,
            },
        },
        update: { status: 'PENDING', error: null, attempts: 0, processedAt: null },
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
        // true = il existait déjà une analyse ETABLIE (DONE) : le message doit
        // dire « déjà publiée », pas « remise en file ».
        dejaExistante: existante.status === 'DONE',
    };
};
