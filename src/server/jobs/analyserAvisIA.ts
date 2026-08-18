// src/server/jobs/analyserAvisIA.ts
// ============================================================================
// Cron / Worker Job — Analyse sémantique IA des avis clients via NVIDIA NIM
//
// Exécuté de manière asynchrone par PgBoss sans bloquer les requêtes usagers.
// ============================================================================

import { prisma } from 'wasp/server';
import { AIService } from '../ai/service';

const MAX_ATTEMPTS = 3;

export const analyserAvisIAJob = async (_args: unknown, _context: any) => {
  if (!AIService.isConfigured()) {
    return { status: 'skipped', message: 'NVIDIA_API_KEY non configurée.' };
  }

  // Sélectionne les analyses en attente ou en échec avec des tentatives restantes
  const pendingAnalyses = await prisma.analyseAvisIA.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    include: {
      reponse: {
        include: {
          agence: { select: { nom_agence: true } },
          guichet: { select: { nom_guichet: true } },
          service: { select: { libelle_service: true } },
          critere: { select: { libelle_critere: true } },
          agent: { select: { nom: true, prenom: true } },
        },
      },
    },
    take: 10, // Concurrence maîtrisée
  });

  if (pendingAnalyses.length === 0) {
    return { status: 'idle', count: 0 };
  }

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingAnalyses) {
    // Évite les doublons si déjà traitée entre-temps
    if (item.status === 'DONE') continue;

    // Passage au statut PROCESSING
    await prisma.analyseAvisIA.update({
      where: { id: item.id },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });

    const reponse = item.reponse;
    const commentaire = reponse.commentaire_texte?.trim();

    if (!commentaire) {
      // Pas de texte à analyser -> Marquer comme DONE avec sentiment NEUTRAL
      await prisma.analyseAvisIA.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          sentiment: 'NEUTRAL',
          sentimentScore: 1.0,
          themes: JSON.stringify(['AUTRE']),
          problemePrincipal: null,
          urgence: 'LOW',
          resume: 'Aucun commentaire texte fourni par l usager.',
          actionRecommandee: null,
          processedAt: new Date(),
        },
      });
      successCount++;
      continue;
    }

    const agentNom = reponse.agent ? `${reponse.agent.prenom || ''} ${reponse.agent.nom || ''}`.trim() : null;

    try {
      const result = await AIService.analyserAvis(commentaire, {
        score: reponse.score_brut,
        agence: reponse.agence?.nom_agence,
        guichet: reponse.guichet?.nom_guichet,
        service: reponse.service?.libelle_service,
        critere: reponse.critere?.libelle_critere,
        agent: agentNom,
      });

      await prisma.analyseAvisIA.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          sentiment: result.sentiment,
          sentimentScore: result.sentiment_score,
          themes: JSON.stringify(result.themes),
          problemePrincipal: result.probleme_principal || null,
          urgence: result.urgence,
          resume: result.resume,
          actionRecommandee: result.action_recommandee || null,
          error: null,
          processedAt: new Date(),
        },
      });

      successCount++;
    } catch (err: any) {
      failCount++;
      const errorMessage = err?.message || 'Erreur inconnue lors de l analyse IA';
      console.error(`[AI_JOB_ERROR] Échec de l analyse pour la réponse #${item.reponseId}:`, errorMessage);

      const nextAttempts = item.attempts + 1;
      const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';

      await prisma.analyseAvisIA.update({
        where: { id: item.id },
        data: {
          status: nextStatus,
          error: errorMessage.slice(0, 500),
        },
      });
    }
  }

  return { status: 'completed', processed: pendingAnalyses.length, success: successCount, failed: failCount };
};
