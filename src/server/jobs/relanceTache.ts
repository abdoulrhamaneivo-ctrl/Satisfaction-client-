// src/server/jobs/relanceTache.ts
// ============================================================================
// Cron Job — Relance des tâches correctives sans action depuis 48h
// Déclenché tous les jours à 08:00.
// Si une tâche est en statut A_FAIRE ou EN_COURS et n'a pas été mise à jour
// depuis 48h, un email de relance est envoyé au responsable.
//
// VALEUR AJOUTÉE (et non spam) : un responsable avec plusieurs tâches en
// retard recevait auparavant UN EMAIL ET UN SMS PAR TÂCHE (5 tâches en
// retard = 5 emails + 5 SMS le même matin). On envoie désormais un seul
// email récapitulatif (toutes les tâches du responsable, triées par
// urgence) et, s'il y a au moins une tâche réellement en retard, un seul
// SMS résumant le nombre de tâches et la plus urgente d'entre elles.
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

  // Tâches non terminées dont la date de création est > 48h
  const tachesEnRetard = await prisma.tacheCorrective.findMany({
    where: {
      statut_tache: { in: ['A_FAIRE', 'EN_COURS'] },
      date_creation: { lte: il_y_a_48h },
    },
    include: {
      responsable: true,
      alerte: { include: { guichet: true } },
    },
    orderBy: { date_echeance: 'asc' },
  });

  // Regroupement par responsable : c'est ce qui permet de n'envoyer qu'UN
  // seul email/SMS récapitulatif par personne, quel que soit son nombre de
  // tâches en retard.
  const parResponsable = new Map<string, { responsable: any; taches: typeof tachesEnRetard }>();
  for (const tache of tachesEnRetard) {
    if (!tache.responsable?.email) continue;
    if (!parResponsable.has(tache.responsable.id)) {
      parResponsable.set(tache.responsable.id, { responsable: tache.responsable, taches: [] });
    }
    parResponsable.get(tache.responsable.id)!.taches.push(tache);
  }

  let relancesEnvoyees = 0;

  for (const [, { responsable, taches }] of parResponsable) {
    const tachesAvecMeta = taches.map((t) => ({
      tache: t,
      guichetNom: t.alerte?.guichet?.nom_guichet ?? 'Guichet inconnu',
      echeance: t.date_echeance.toLocaleDateString('fr-FR'),
      isEnRetard: t.date_echeance < maintenant,
    }));

    const nbEnRetard = tachesAvecMeta.filter((t) => t.isEnRetard).length;
    const sujet =
      nbEnRetard > 0
        ? `🔴 ${nbEnRetard} tâche(s) en retard sur ${tachesAvecMeta.length}`
        : `⏰ ${tachesAvecMeta.length} tâche(s) sans action depuis 48h`;

    const lignesHtml = tachesAvecMeta
      .map(
        ({ tache, guichetNom, echeance, isEnRetard }) => `
        <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <p style="margin: 0; font-weight: 700; color: #111827; font-size: 14px;">${tache.titre}</p>
              <p style="margin: 2px 0 0; color: #9ca3af; font-size: 12px;">${guichetNom}</p>
            </div>
            <span style="
              background: ${isEnRetard ? '#fee2e2' : '#fef3c7'};
              color: ${isEnRetard ? '#dc2626' : '#92400e'};
              padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
              white-space: nowrap;
            ">${isEnRetard ? `En retard depuis le ${echeance}` : `Échéance ${echeance}`}</span>
          </div>
        </div>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a3a5c, #c47a20); padding: 28px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 800;">Yeba — Tâches correctives</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">
        ${nbEnRetard > 0 ? `🔴 ${nbEnRetard} en retard` : '⏰ Sans action depuis 48h'}
      </p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">
        Bonjour <strong>${responsable.prenom ?? ''} ${responsable.nom ?? ''}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        ${tachesAvecMeta.length > 1
          ? `Vous avez <strong>${tachesAvecMeta.length} tâches correctives</strong> qui attendent une action, listées ci-dessous par échéance.`
          : `Une tâche corrective attend une action.`
        }
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 16px; margin: 20px 0;">
        ${lignesHtml}
      </div>
      <div style="text-align: center; margin: 24px 0 0;">
        <a href="${FRONTEND_URL}/alertes-taches"
           style="display: inline-block; background: linear-gradient(135deg, #1a3a5c, #c47a20); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">
          Traiter ${tachesAvecMeta.length > 1 ? 'ces tâches' : 'cette tâche'} →
        </a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        Yeba — Plateforme de satisfaction client · 
        <a href="${FRONTEND_URL}" style="color: #c47a20; text-decoration: none;">yeba.ci</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const texteListe = tachesAvecMeta
      .map((t) => `- ${t.tache.titre} (${t.guichetNom}) — ${t.isEnRetard ? `en retard depuis le ${t.echeance}` : `échéance ${t.echeance}`}`)
      .join('\n');

    try {
      await emailSender.send({
        to: responsable.email,
        subject: sujet,
        html,
        text: `${sujet}\n\n${texteListe}\n\nTraitez ces tâches sur : ${FRONTEND_URL}/alertes-taches`,
      });

      // SMS unique et consolidé (au lieu d'un SMS par tâche en retard) :
      // le nombre total + la plus urgente (liste déjà triée par échéance
      // croissante), avec un lien direct vers l'écran de traitement.
      if (nbEnRetard > 0 && responsable.telephone) {
        const plusUrgente = tachesAvecMeta.find((t) => t.isEnRetard)!;
        const resume =
          nbEnRetard === 1
            ? `La tâche "${plusUrgente.tache.titre.slice(0, 40)}" est en retard depuis le ${plusUrgente.echeance}.`
            : `${nbEnRetard} tâches sont en retard, la plus urgente : "${plusUrgente.tache.titre.slice(0, 30)}" (depuis le ${plusUrgente.echeance}).`;
        await envoyerAlerteSMS(responsable.telephone, `🔴 Yeba RETARD — ${resume} Détails : ${FRONTEND_URL}/alertes-taches`);
      }

      relancesEnvoyees += tachesAvecMeta.length;
      console.log(`[RELANCE] 1 email consolidé envoyé à ${responsable.email} pour ${tachesAvecMeta.length} tâche(s)`);
    } catch (err) {
      console.error(`[RELANCE] Erreur pour responsable ${responsable.id}:`, err);
    }
  }

  console.log(
    `[RELANCE] Job terminé — ${relancesEnvoyees} tâche(s) relancée(s) via ${parResponsable.size} message(s) consolidé(s) sur ${tachesEnRetard.length} tâche(s) en retard`
  );
  return { relancesEnvoyees, tachesEnRetard: tachesEnRetard.length };
};
