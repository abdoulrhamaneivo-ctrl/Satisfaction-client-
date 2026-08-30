// src/server/jobs/analyserAvisIA.ts
// ============================================================================
// Cron / Worker Job — Analyse sémantique IA des avis clients via DeepSeek
//
// Exécuté de manière asynchrone par PgBoss sans bloquer les requêtes usagers.
// ============================================================================

import { prisma } from 'wasp/server';
import { AIService } from '../ai/service';

const MAX_ATTEMPTS = 3;

// Garde-fou budget IA : le modèle gratuit OpenRouter est plafonné
// (~50 requêtes/jour). On limite le nombre d'analyses réellement envoyées
// à l'API par jour ; au-delà, les analyses restent PENDING et seront
// reprises au quota du lendemain (le job ne marque rien en échec).
const DAILY_AI_BUDGET = Number(process.env.AI_DAILY_BUDGET || 40);

// --- Valeur ajoutée entreprise ---
// Quand l'IA classe un avis en urgence CRITICAL ou HIGH, on crée une alerte
// (type IA_URGENCE) dans le fil des alertes pour que l'agence réagisse — y
// compris sur des avis dont la note brute ne déclenchait pas d'alerte
// (ex. une accusation grave derrière une note correcte).
async function creerAlerteUrgenceIA(reponse: any, result: any) {
  try {
    const destinataire =
      (await prisma.user.findFirst({
        where: { id_agence: reponse.id_agence, role: 'CHEF_AGENCE', actif: true },
      })) ||
      (await prisma.user.findFirst({
        where: {
          id_entreprise: reponse.agence?.id_entreprise ?? null,
          role: { in: ['DIRECTION', 'QUALITE'] },
          actif: true,
        },
      }));

    if (!destinataire) return;

    const dejaExistante = await prisma.alerte.findFirst({
      where: { id_reponse: reponse.id, type_alerte: 'IA_URGENCE' },
    });
    if (dejaExistante) return;

    const niveau = result.urgence === 'CRITICAL' ? 'Urgence critique' : 'Urgence élevée';
    const guichet = reponse.guichet?.nom_guichet || 'guichet inconnu';
    await prisma.alerte.create({
      data: {
        message: `IA — ${niveau} détectée au guichet "${guichet}". ${result.resume || ''}`.slice(0, 500),
        type_alerte: 'IA_URGENCE',
        id_reponse: reponse.id,
        id_destinataire: destinataire.id,
        id_guichet_concerne: reponse.id_guichet,
      },
    });
  } catch (e) {
    console.warn('[AI_ALERT] Impossible de créer l’alerte IA :', e);
  }
}

export const analyserAvisIAJob = async (_args: unknown, _context: any) => {
  if (!AIService.isConfigured()) {
    return { status: 'skipped', message: 'Clé IA non configurée (OPENROUTER_API_KEY ou DEEPSEEK_API_KEY).' };
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
          agence: { select: { nom_agence: true, id_entreprise: true } },
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

  // Budget quotidien : on compte les analyses déjà traitées aujourd'hui
  // (processedAt >= début du jour local) et on s'arrête au quota atteint.
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const traiteesAujourdHui = await prisma.analyseAvisIA.count({
    where: { status: 'DONE', processedAt: { gte: debutJour } },
  });
  const budgetRestant = DAILY_AI_BUDGET - traiteesAujourdHui;
  if (budgetRestant <= 0) {
    return {
      status: 'quota_reached',
      message: `Budget IA journalier atteint (${DAILY_AI_BUDGET}). Reprise demain.`,
    };
  }
  // On ne traite que ce que le budget permet (le take: 10 reste le max par tick).
  pendingAnalyses.length = Math.min(pendingAnalyses.length, budgetRestant);

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
    const commentaire = (item.commentaireTexte || reponse.commentaire_texte || '').trim();

    if (!commentaire) {
      // Pas de texte à analyser -> Marquer comme DONE avec sentiment NEUTRAL
      await prisma.analyseAvisIA.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          sentiment: 'NEUTRAL',
          sentimentScore: 0.5,
          themes: JSON.stringify(['AUTRE']),
          problemePrincipal: null,
          urgence: 'LOW',
          resume: "Aucun commentaire texte fourni par l'usager.",
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

      // --- VALEUR AJOUTÉE : alerte auto si urgence critique/élevée ---
      if (result.urgence === 'CRITICAL' || result.urgence === 'HIGH') {
        await creerAlerteUrgenceIA(reponse, result);
      }
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
