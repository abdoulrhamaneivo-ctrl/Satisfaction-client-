// src/server/jobs/relanceTache.ts
// ============================================================================
// Cron Job — Relance des tâches correctives sans action depuis 48h
// Déclenché tous les jours à 08:00.
// Si une tâche est en statut A_FAIRE ou EN_COURS et n'a pas été mise à jour
// depuis 48h, un email de relance est envoyé au responsable.
// ============================================================================

import { emailSender } from 'wasp/server/email';
import { prisma } from 'wasp/server';
import { envoyerAlerteSMS } from '../notifications/gateway';

const FRONTEND_URL = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

/**
 * Handler principal du job de relance des tâches correctives.
 * Appelé par Wasp une fois par jour (cron "0 8 * * *").
 */
export const relancerTachesEnRetard = async (_args: unknown, _context: any) => {
  const maintenant = new Date();
  const il_y_a_48h = new Date(maintenant.getTime() - 48 * 60 * 60 * 1000);

  // Tâches non terminées dont la date de création ou de mise à jour est > 48h
  const tachesEnRetard = await prisma.tacheCorrective.findMany({
    where: {
      statut_tache: { in: ['A_FAIRE', 'EN_COURS'] },
      date_creation: { lte: il_y_a_48h },
      // On exclut les tâches dont l'échéance n'est pas encore dépassée
      // mais on relance quand même si créées depuis 48h sans action
    },
    include: {
      responsable: true,
      alerte: {
        include: {
          guichet: true,
        },
      },
    },
  });

  let relancesEnvoyees = 0;

  for (const tache of tachesEnRetard) {
    const responsable = tache.responsable;
    if (!responsable?.email) continue;

    const guichetNom = tache.alerte?.guichet?.nom_guichet ?? 'Guichet inconnu';
    const echeance = tache.date_echeance.toLocaleDateString('fr-FR');
    const statut = tache.statut_tache === 'A_FAIRE' ? 'À Faire' : 'En cours';
    const isEnRetard = tache.date_echeance < maintenant;

    const sujet = isEnRetard
      ? `🔴 Tâche en retard — ${tache.titre}`
      : `⏰ Rappel — Tâche corrective sans action depuis 48h`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a3a5c, #c47a20); padding: 28px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 800;">CXSAT — Tâche corrective</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">
        ${isEnRetard ? '🔴 En retard' : '⏰ Sans action depuis 48h'}
      </p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">
        Bonjour <strong>${responsable.prenom ?? ''} ${responsable.nom ?? ''}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        ${isEnRetard
          ? `La tâche corrective ci-dessous a <strong style="color:#dc2626;">dépassé sa date d'échéance</strong> et reste non traitée.`
          : `La tâche corrective ci-dessous est <strong>sans action depuis plus de 48h</strong>.`
        }
      </p>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${tache.titre}</p>
            ${tache.description ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">${tache.description}</p>` : ''}
          </div>
          <span style="
            background: ${tache.statut_tache === 'A_FAIRE' ? '#fef3c7' : '#dbeafe'};
            color: ${tache.statut_tache === 'A_FAIRE' ? '#92400e' : '#1e40af'};
            padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
            white-space: nowrap;
          ">${statut}</span>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 24px;">
          <div>
            <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Guichet</p>
            <p style="margin: 2px 0 0; color: #374151; font-size: 13px; font-weight: 500;">${guichetNom}</p>
          </div>
          <div>
            <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Échéance</p>
            <p style="margin: 2px 0 0; color: ${isEnRetard ? '#dc2626' : '#374151'}; font-size: 13px; font-weight: ${isEnRetard ? '700' : '500'};">${echeance}</p>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0 0;">
        <a href="${FRONTEND_URL}/alertes-taches"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #1a3a5c, #c47a20);
             color: white;
             text-decoration: none;
             padding: 12px 28px;
             border-radius: 8px;
             font-weight: 700;
             font-size: 14px;
           ">
          Traiter cette tâche →
        </a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        CXSAT — Plateforme de satisfaction client · 
        <a href="${FRONTEND_URL}" style="color: #c47a20; text-decoration: none;">cxsat.ci</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await emailSender.send({
        to: responsable.email,
        subject: sujet,
        html,
        text: `${sujet}\n\nTâche : ${tache.titre}\nGuichet : ${guichetNom}\nÉchéance : ${echeance}\nStatut : ${statut}\n\nTraitez cette tâche sur : ${FRONTEND_URL}/alertes-taches`,
      });

      // SMS complémentaire si en vrai retard
      if (isEnRetard && responsable.telephone) {
        await envoyerAlerteSMS(
          responsable.telephone,
          `🔴 CXSAT RETARD — La tâche "${tache.titre.slice(0, 40)}" est en retard depuis le ${echeance}. Traitez-la sur l'application.`
        );
      }

      relancesEnvoyees++;
      console.log(`[RELANCE] Email envoyé à ${responsable.email} pour tâche #${tache.id}`);
    } catch (err) {
      console.error(`[RELANCE] Erreur pour tâche #${tache.id}:`, err);
    }
  }

  console.log(`[RELANCE] Job terminé — ${relancesEnvoyees} relance(s) sur ${tachesEnRetard.length} tâche(s) en retard`);
  return { relancesEnvoyees, tachesEnRetard: tachesEnRetard.length };
};
