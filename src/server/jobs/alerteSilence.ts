// src/server/jobs/alerteSilence.ts
// ============================================================================
// Cron Job — Alerte de silence
// Déclenché toutes les 30 minutes.
// Si un guichet planifié aujourd'hui n'a reçu AUCUN avis depuis 2h pendant
// ses heures d'ouverture, une alerte SILENCE_EVALUATION est créée.
//
// VALEUR AJOUTÉE DES NOTIFICATIONS SMS/WhatsApp (et non simple spam) :
// - Un seul message par destinataire et par cycle, même si plusieurs
//   guichets de son agence sont en silence en même temps (avant : un SMS
//   PAR guichet, ce qui pouvait spammer un chef d'agence de 5 SMS d'un
//   coup en cas de panne réseau générale).
// - Contenu concret : durée RÉELLE écoulée depuis le dernier avis (pas
//   juste ">2h"), et nom de l'agent actuellement affecté au guichet — de
//   quoi agir immédiatement au lieu de devoir aller vérifier soi-même.
// - Escalade : si un guichet reste en silence après plusieurs cycles sans
//   qu'aucune alerte n'ait été traitée, la DIRECTION est notifiée en plus
//   du chef d'agence (au lieu de renvoyer indéfiniment le même SMS à la
//   même personne qui ne répond pas).
// ============================================================================

import { prisma } from 'wasp/server';
import { envoyerAlerteSMS, envoyerAlerteWhatsApp } from '../notifications/gateway';

const FRONTEND_URL = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

// Au-delà de ce nombre d'alertes NOUVELLE non traitées pour un même guichet,
// on considère que le chef d'agence n'a pas réagi et on notifie aussi la
// direction. 3 alertes espacées d'au moins 1h (voir dédoublonnage plus bas)
// = silence non résolu depuis au moins ~3h.
const SEUIL_ESCALADE_DIRECTION = 3;

const formatDuree = (depuis: Date, maintenant: Date): string => {
  const minutes = Math.round((maintenant.getTime() - depuis.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste > 0 ? `${heures}h${String(reste).padStart(2, '0')}` : `${heures}h`;
};

/**
 * Handler principal du job de surveillance des silences.
 * Appelé par Wasp toutes les 30 minutes via la configuration du job.
 */
export const detecterAlertesSilence = async (_args: unknown, context: any) => {
  const maintenant = new Date();
  const heureNow = maintenant.toTimeString().slice(0, 5); // "HH:MM"
  const today = maintenant.toISOString().split('T')[0]; // "YYYY-MM-DD"
  const il_y_a_2h = new Date(maintenant.getTime() - 2 * 60 * 60 * 1000);

  // 1. Récupérer tous les guichets planifiés aujourd'hui et actuellement en service
  const affectationsActives = await prisma.affectationGuichet.findMany({
    where: {
      date_affectation: new Date(today),
      heure_debut: { lte: heureNow },
      heure_fin: { gte: heureNow },
    },
    include: {
      agent: { select: { nom: true, prenom: true } },
      guichet: {
        include: {
          // Dernier avis reçu, quelle que soit son ancienneté : sert à
          // afficher une durée réelle ("depuis 3h20") plutôt qu'un
          // simple ">2h" qui ne dit rien sur la gravité de la situation.
          reponses: {
            orderBy: { date_reponse: 'desc' },
            take: 1,
          },
          agence: {
            include: {
              utilisateurs: {
                where: { role: { in: ['CHEF_AGENCE', 'DIRECTION'] }, actif: true },
              },
            },
          },
        },
      },
    },
  });

  type GuichetSilencieux = {
    nom: string;
    duree: string;
    agentNom: string | null;
    escalade: boolean;
  };
  const parDestinataire = new Map<
    string,
    { destinataire: any; guichets: GuichetSilencieux[]; escaladeDirection: boolean; idAgence: number }
  >();

  let alertesCreees = 0;

  for (const affectation of affectationsActives) {
    const guichet = affectation.guichet;
    const dernierAvis = guichet.reponses[0]?.date_reponse ?? null;

    // Silence = pas d'avis du tout, OU dernier avis vieux de plus de 2h.
    if (dernierAvis && dernierAvis >= il_y_a_2h) continue;

    // Dédoublonnage : pas plus d'une alerte créée par heure pour un même
    // guichet (le cron tourne toutes les 30 min).
    const alerteRecente = await prisma.alerte.findFirst({
      where: {
        id_guichet_concerne: guichet.id,
        type_alerte: 'SILENCE_EVALUATION',
        date_creation: { gte: new Date(maintenant.getTime() - 60 * 60 * 1000) },
      },
    });
    if (alerteRecente) continue;

    // Chef d'agence en priorité pour le message "standard" ; s'il n'y en a
    // pas, on retombe sur un compte DIRECTION de l'agence.
    const chefAgence = guichet.agence.utilisateurs.find((u: any) => u.role === 'CHEF_AGENCE');
    const destinataire = chefAgence || guichet.agence.utilisateurs[0];
    if (!destinataire) continue;

    const duree = dernierAvis ? formatDuree(dernierAvis, maintenant) : "aujourd'hui";

    // Historique des alertes NOUVELLE (non traitées) sur ce guichet dans les
    // dernières 24h, pour savoir si on doit escalader vers la direction.
    const alertesNonTraitees = await prisma.alerte.count({
      where: {
        id_guichet_concerne: guichet.id,
        type_alerte: 'SILENCE_EVALUATION',
        statut_alerte: 'NOUVELLE',
        date_creation: { gte: new Date(maintenant.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    const escalade = alertesNonTraitees + 1 >= SEUIL_ESCALADE_DIRECTION;

    await prisma.alerte.create({
      data: {
        message: dernierAvis
          ? `⚠️ Silence détecté : aucun avis reçu au guichet "${guichet.nom_guichet}" depuis ${duree}. Vérifiez si le dispositif est opérationnel.`
          : `⚠️ Silence détecté : le guichet "${guichet.nom_guichet}" n'a reçu aucun avis aujourd'hui alors qu'un agent y est affecté.`,
        type_alerte: 'SILENCE_EVALUATION',
        statut_alerte: 'NOUVELLE',
        id_guichet_concerne: guichet.id,
        id_destinataire: destinataire.id,
      },
    });
    alertesCreees++;

    // Regroupement pour le message consolidé (1 SMS/WhatsApp par
    // destinataire pour ce cycle, même si plusieurs guichets sont concernés).
    if (!parDestinataire.has(destinataire.id)) {
      parDestinataire.set(destinataire.id, {
        destinataire,
        guichets: [],
        escaladeDirection: false,
        idAgence: guichet.id_agence,
      });
    }
    const groupe = parDestinataire.get(destinataire.id)!;
    groupe.guichets.push({
      nom: guichet.nom_guichet,
      duree,
      agentNom: affectation.agent ? `${affectation.agent.prenom ?? ''} ${affectation.agent.nom ?? ''}`.trim() : null,
      escalade,
    });
    if (escalade) groupe.escaladeDirection = true;

    console.log(`[SILENCE] Alerte créée pour guichet #${guichet.id} (${guichet.nom_guichet}) — silence depuis ${duree}`);
  }

  // 2. Envoi consolidé : un seul message par destinataire, listant tous ses
  // guichets en silence pour ce cycle.
  let messagesEnvoyes = 0;
  for (const [, groupe] of parDestinataire) {
    const { destinataire, guichets, escaladeDirection, idAgence } = groupe;
    if (!destinataire.telephone) continue;

    const lignes = guichets
      .map((g) => `• ${g.nom} — silence depuis ${g.duree}${g.agentNom ? ` (agent : ${g.agentNom})` : ''}`)
      .join('\n');

    const prefixeUrgence = escaladeDirection ? '🔴 URGENT' : '🔕';
    const msg =
      guichets.length === 1
        ? `${prefixeUrgence} Yeba SILENCE — ${lignes}. Vérifiez le dispositif de collecte : ${FRONTEND_URL}/alertes-taches`
        : `${prefixeUrgence} Yeba SILENCE — ${guichets.length} guichets sans avis :\n${lignes}\nVérifiez : ${FRONTEND_URL}/alertes-taches`;

    try {
      await envoyerAlerteWhatsApp(destinataire.telephone, msg);
    } catch {
      await envoyerAlerteSMS(destinataire.telephone, msg);
    }
    messagesEnvoyes++;

    // Escalade réelle : la direction (hors chef d'agence déjà notifié) est
    // prévenue si un guichet de cette agence est en silence depuis
    // plusieurs cycles sans traitement — pas à chaque cycle, seulement
    // quand le seuil est franchi, pour ne pas doubler le volume de SMS.
    if (escaladeDirection) {
      const direction = await prisma.user.findMany({
        where: { id_agence: idAgence, role: 'DIRECTION', actif: true, telephone: { not: '' } },
      });
      for (const dir of direction) {
        if (dir.id === destinataire.id) continue;
        const msgDirection = `🔴 Yeba ESCALADE — Silence non résolu depuis plusieurs heures sur ${guichets.length} guichet(s) de votre agence, malgré alerte au chef d'agence. Détails : ${FRONTEND_URL}/alertes-taches`;
        try {
          await envoyerAlerteWhatsApp(dir.telephone!, msgDirection);
        } catch {
          await envoyerAlerteSMS(dir.telephone!, msgDirection);
        }
      }
    }
  }

  console.log(
    `[SILENCE] Job terminé — ${alertesCreees} alerte(s) créée(s), ${messagesEnvoyes} message(s) envoyé(s) (consolidés) sur ${affectationsActives.length} guichet(s) actifs`
  );
  return { alertesCreees, messagesEnvoyes };
};
