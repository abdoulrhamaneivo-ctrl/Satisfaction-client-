// src/server/jobs/alerteSilence.ts
// ============================================================================
// Cron Job — Alerte de silence
// Déclenché toutes les 30 minutes.
// Si un guichet planifié aujourd'hui n'a reçu AUCUN avis depuis 2h pendant
// ses heures d'ouverture, une alerte SILENCE_EVALUATION est créée et un SMS
// envoyé au chef d'agence responsable.
// ============================================================================

import { emailSender } from 'wasp/server/email';
import { prisma } from 'wasp/server';
import { envoyerAlerteSMS, envoyerAlerteWhatsApp } from '../notifications/gateway';

/**
 * Handler principal du job de surveillance des silences.
 * Appelé par Wasp toutes les 30 minutes via la configuration du job.
 */
export const detecterAlertesSilence = async (_args: unknown, context: any) => {
  const maintenant = new Date();
  const heureNow = maintenant.toTimeString().slice(0, 5); // "HH:MM"
  const today = maintenant.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // Fenêtre : avis reçus au cours des 2 dernières heures
  const il_y_a_2h = new Date(maintenant.getTime() - 2 * 60 * 60 * 1000);

  // 1. Récupérer tous les guichets planifiés aujourd'hui et actuellement en service
  const affectationsActives = await prisma.affectationGuichet.findMany({
    where: {
      date_affectation: new Date(today),
      heure_debut: { lte: heureNow },
      heure_fin: { gte: heureNow },
    },
    include: {
      guichet: {
        include: {
          reponses: {
            where: { date_reponse: { gte: il_y_a_2h } },
            take: 1, // On veut juste savoir si AU MOINS 1 avis existe
          },
          agence: {
            include: {
              utilisateurs: {
                where: {
                  role: { in: ['CHEF_AGENCE', 'DIRECTION'] },
                  actif: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  let alertesCreees = 0;

  for (const affectation of affectationsActives) {
    const guichet = affectation.guichet;

    // Si au moins 1 avis reçu dans les 2 dernières heures → pas de silence
    if (guichet.reponses.length > 0) continue;

    // Vérifier qu'une alerte SILENCE n'a pas déjà été créée dans la dernière heure
    const alerteRecente = await prisma.alerte.findFirst({
      where: {
        id_guichet_concerne: guichet.id,
        type_alerte: 'SILENCE_EVALUATION',
        date_creation: { gte: new Date(maintenant.getTime() - 60 * 60 * 1000) },
      },
    });

    if (alerteRecente) continue; // Alerte déjà envoyée récemment

    const destinataire = guichet.agence.utilisateurs[0];
    if (!destinataire) continue;

    // Créer l'alerte en base
    await prisma.alerte.create({
      data: {
        message: `⚠️ Silence détecté : aucun avis reçu au guichet "${guichet.nom_guichet}" depuis plus de 2 heures. Vérifiez si le dispositif est opérationnel.`,
        type_alerte: 'SILENCE_EVALUATION',
        statut_alerte: 'NOUVELLE',
        id_guichet_concerne: guichet.id,
        id_destinataire: destinataire.id,
      },
    });

    // Notifier par SMS/WhatsApp
    const msg = `🔕 CXSAT SILENCE — Guichet "${guichet.nom_guichet}" : aucun avis depuis 2h. Vérifiez votre dispositif de collecte.`;
    if (destinataire.telephone) {
      try {
        await envoyerAlerteWhatsApp(destinataire.telephone, msg);
      } catch {
        await envoyerAlerteSMS(destinataire.telephone, msg);
      }
    }

    alertesCreees++;
    console.log(`[SILENCE] Alerte créée pour guichet #${guichet.id} (${guichet.nom_guichet})`);
  }

  console.log(`[SILENCE] Job terminé — ${alertesCreees} alerte(s) créée(s) sur ${affectationsActives.length} guichet(s) actifs`);
  return { alertesCreees };
};
