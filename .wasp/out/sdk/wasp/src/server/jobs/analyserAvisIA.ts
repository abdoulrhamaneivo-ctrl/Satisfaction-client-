// src/server/jobs/analyserAvisIA.ts
// ============================================================================
// Cron / Worker Job — Analyse sémantique IA des avis clients via DeepSeek
//
// Exécuté de manière asynchrone par PgBoss sans bloquer les requêtes usagers.
// ============================================================================

import { prisma } from 'wasp/server';
import { AIService } from '../ai/service';
import { evaluerCoherenceNote, PROMPT_VERSION } from '../ai/types';
import { estObsolete, DELAI_OBSOLESCENCE_MINUTES, MAX_ATTEMPTS_ANALYSE } from '../ai/etatAnalyse';

const MAX_ATTEMPTS = MAX_ATTEMPTS_ANALYSE;

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
        where: { id_agence: reponse.id_agence, role: { in: ['CHEF_AGENCE', 'DIRECTION'] }, actif: true },
      })) ||
      (await prisma.user.findFirst({
        where: {
          id_entreprise: reponse.agence?.id_entreprise ?? null,
          role: { in: ['DIRECTION'] },
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

/**
 * Alerte « incohérence note ↔ texte » : un avis noté positivement mais dont
 * le commentaire décrit un problème réel (cas classique : 5/5 rancunier).
 * Type IA_INCOHERENCE_NOTE — distinct de IA_URGENCE pour que le responsable
 * distingue immédiatement « problème grave » de « note trompeuse ».
 */
async function creerAlerteIncoherenceNote(reponse: any, note: number | null, coherence: ReturnType<typeof evaluerCoherenceNote>) {
  try {
    const destinataire =
      (await prisma.user.findFirst({
        where: { id_agence: reponse.id_agence, role: { in: ['CHEF_AGENCE', 'DIRECTION'] }, actif: true },
      })) ||
      (await prisma.user.findFirst({
        where: {
          id_entreprise: reponse.agence?.id_entreprise ?? null,
          role: { in: ['DIRECTION'] },
          actif: true,
        },
      }));

    if (!destinataire) return;

    const dejaExistante = await prisma.alerte.findFirst({
      where: { id_reponse: reponse.id, type_alerte: 'IA_INCOHERENCE_NOTE' },
    });
    if (dejaExistante) return;

    const guichet = reponse.guichet?.nom_guichet || 'guichet inconnu';
    const noteStr = note != null ? `${note}/5` : 'non fournie';
    await prisma.alerte.create({
      data: {
        message: `IA — Note ${noteStr} non cohérente avec le commentaire au guichet "${guichet}". ${coherence.explication || ''}`.slice(0, 500),
        type_alerte: 'IA_INCOHERENCE_NOTE',
        id_reponse: reponse.id,
        id_destinataire: destinataire.id,
        id_guichet_concerne: reponse.id_guichet,
      },
    });
  } catch (e) {
    console.warn('[AI_ALERT] Impossible de créer l’alerte d’incohérence :', e);
  }
}

export const analyserAvisIAJob = async (_args: unknown, _context: any) => {
  if (!AIService.isConfigured()) {
    return { status: 'skipped', message: 'Clé IA non configurée (NVIDIA_API_KEY, OPENROUTER_API_KEY ou DEEPSEEK_API_KEY).' };
  }

  // RÉCUPÉRATION (Vague 1, P3) : un traitement resté PROCESSING plus de
  // DELAI_OBSOLESCENCE_MINUTES est mort (crash, OOM, redéploiement, worker
  // tué) : sans ce rattrapage, la ligne restait coincée pour toujours et
  // l'UI affichait « Analyse IA en cours… » indéfiniment. On remet en file
  // avec la mention du recovered, jamais en silence.
  const maintenant = new Date();
  const perimeeAvant = new Date(maintenant.getTime() - DELAI_OBSOLESCENCE_MINUTES * 60_000);
  const { count: recuperees } = await prisma.analyseAvisIA.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: perimeeAvant } },
    data: {
      status: 'PENDING',
      error: `Traitement interrompu (statut PROCESSING depuis plus de ${DELAI_OBSOLESCENCE_MINUTES} min) — remis en file.`,
    },
  });

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
    orderBy: { createdAt: 'asc' }, // backlog traité en FIFO (audit P14 h)
    take: 10, // Concurrence maîtrisée
  });

  if (pendingAnalyses.length === 0) {
    return { status: 'idle', count: 0, recuperees };
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

    // Prise en charge ATOMIQUE : `updateMany` filtré sur le statut constaté.
    // Si un autre worker a traité la ligne entre-temps, count = 0 → on
    // l'ignore au lieu de l'écraser (audit P14 h : le `update` classique
    // réécrivait un statut peut-être déjà DONE et ré-incrémentait attempts).
    const prise = await prisma.analyseAvisIA.updateMany({
      where: { id: item.id, status: item.status as any },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });
    if (prise.count === 0) continue;

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
          sousThemes: JSON.stringify([]),
          problemePrincipal: null,
          problemesSecondaires: JSON.stringify([]),
          severite: 'LOW',
          emotion: null,
          confidence: 1,
          urgence: 'LOW',
          resume: "Aucun commentaire texte fourni par l'usager.",
          actionRecommandee: null,
          // Sans texte, pas de croisement possible
          coherenceNote: null,
          sentimentRetenu: null,
          promptVersion: PROMPT_VERSION,
          processedAt: new Date(),
        },
      });
      successCount++;
      continue;
    }

    const agentNom = reponse.agent ? `${reponse.agent.prenom || ''} ${reponse.agent.nom || ''}`.trim() : null;

    try {
      // Vague 1 Phase F : le service renvoie provider/modèle effectifs
      // (secours inclus) pour traçabilité.
      const { result, provider, model } = await AIService.analyserAvis(commentaire, {
        score: reponse.score_brut,
        agence: reponse.agence?.nom_agence,
        guichet: reponse.guichet?.nom_guichet,
        service: reponse.service?.libelle_service,
        critere: reponse.critere?.libelle_critere,
        agent: agentNom,
      });

      // --- CROISEMENT NOTE ↔ TEXTE (cohérence) ---
      // La note source : celle conservée à la création de l'analyse, sinon
      // le score brut de la réponse liée. Le prompt IA demande déjà de
      // croiser ; ici on FORCE le verdict côté serveur (règle RG : le
      // serveur tranche) et on retient le sentiment ajusté pour les stats.
      const noteAvis = item.noteBrut ?? reponse.score_brut ?? null;
      const coherence = evaluerCoherenceNote(noteAvis, result.sentiment, result.resume);

      await prisma.analyseAvisIA.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          sentiment: result.sentiment,
          sentimentScore: result.sentiment_score,
          themes: JSON.stringify(result.themes),
          // Champs étendus v2 (replis si le modèle ne les renvoie pas) :
          // severite ← urgence (même échelle), confidence ← sentiment_score.
          sousThemes: JSON.stringify(result.sous_themes ?? []),
          problemePrincipal: result.probleme_principal || null,
          problemesSecondaires: JSON.stringify(result.problemes_secondaires ?? []),
          severite: result.severite ?? result.urgence,
          emotion: result.emotion ?? null,
          confidence: result.confidence ?? result.sentiment_score,
          urgence: result.urgence,
          resume: result.resume,
          actionRecommandee: result.action_recommandee || null,
          // Verdict de cohérence + sentiment retenu pour les statistiques
          coherenceNote: coherence.type,
          sentimentRetenu: coherence.sentiment_retenu,
          // Traçabilité modèle (§47-48) : fini les défauts deepseek figés.
          model,
          provider,
          promptVersion: PROMPT_VERSION,
          error: null,
          processedAt: new Date(),
        },
      });

      successCount++;

      // --- VALEUR AJOUTÉE : alerte auto si urgence critique/élevée ---
      if (result.urgence === 'CRITICAL' || result.urgence === 'HIGH') {
        await creerAlerteUrgenceIA(reponse, result);
      }

      // --- VALEUR AJOUTÉE : alerte si note ≠ texte (ex. 5/5 rancunier) ---
      // Le chef d'agence doit savoir que la note brute masque un problème.
      if (coherence.incoherent) {
        await creerAlerteIncoherenceNote(reponse, noteAvis, coherence);
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
