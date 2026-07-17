// src/server/jobs/rapportMensuel.ts
// ============================================================================
// Cron Job — Rapport mensuel automatique (Brevo/SMTP)
// Déclenché le 1er de chaque mois à 07:00.
// Envoie un rapport de satisfaction du mois précédent à :
//   - Chaque chef d'agence (données de son agence uniquement)
//   - La direction (données consolidées de toutes les agences)
// ============================================================================

import { emailSender } from 'wasp/server/email';
import { prisma } from 'wasp/server';

const FRONTEND_URL = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

interface StatsAgence {
  agenceNom: string;
  commune: string;
  totalAvis: number;
  noteMoyenne: number;
  satisfaits: number;
  tauxSatisfaction: number;
  alertesCritiques: number;
  tachesOuvertes: number;
}

/** Calcule les stats du mois précédent pour une agence donnée */
async function calculeStatsAgence(
  idAgence: number,
  debutMois: Date,
  finMois: Date
): Promise<StatsAgence | null> {
  const agence = await prisma.agence.findUnique({ where: { id: idAgence } });
  if (!agence) return null;

  const reponses = await prisma.reponse.findMany({
    where: {
      id_agence: idAgence,
      date_reponse: { gte: debutMois, lte: finMois },
    },
    select: { score_brut: true },
  });

  const alertesCritiques = await prisma.alerte.count({
    where: {
      guichet: { id_agence: idAgence },
      type_alerte: 'NOTE_CRITIQUE',
      date_creation: { gte: debutMois, lte: finMois },
    },
  });

  const tachesOuvertes = await prisma.tacheCorrective.count({
    where: {
      statut_tache: { in: ['A_FAIRE', 'EN_COURS'] },
      alerte: { guichet: { id_agence: idAgence } },
    },
  });

  const totalAvis = reponses.length;
  const sommeNotes = reponses.reduce((s, r) => s + r.score_brut, 0);
  const noteMoyenne = totalAvis > 0 ? sommeNotes / totalAvis : 0;
  const satisfaits = reponses.filter((r) => r.score_brut >= 4).length;
  const tauxSatisfaction = totalAvis > 0 ? (satisfaits / totalAvis) * 100 : 0;

  return {
    agenceNom: agence.nom_agence,
    commune: agence.commune,
    totalAvis,
    noteMoyenne,
    satisfaits,
    tauxSatisfaction,
    alertesCritiques,
    tachesOuvertes,
  };
}

/** Génère le HTML du rapport mensuel */
function genererHtmlRapport(
  stats: StatsAgence,
  moisLabel: string,
  estDirection: boolean
): string {
  const couleurTaux =
    stats.tauxSatisfaction >= 80
      ? '#059669'
      : stats.tauxSatisfaction >= 60
      ? '#d97706'
      : '#dc2626';

  const niveauConformite =
    stats.tauxSatisfaction >= 80
      ? 'Conforme ✅'
      : stats.tauxSatisfaction >= 60
      ? 'Convaincante 🟡'
      : stats.tauxSatisfaction >= 40
      ? 'Informelle 🟠'
      : 'Insuffisante 🔴';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.1);">
    
    <!-- En-tête -->
    <div style="background: linear-gradient(135deg, #0f2240 0%, #1a3a5c 50%, #c47a20 100%); padding: 36px 40px; text-align: center;">
      <div style="font-size: 36px; margin-bottom: 8px;">📊</div>
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
        Rapport de Satisfaction
      </h1>
      <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 14px;">
        ${moisLabel} · ${stats.agenceNom}${estDirection ? ' — Vue Consolidée' : ''}
      </p>
      <p style="color: rgba(255,255,255,0.5); margin: 4px 0 0; font-size: 12px;">${stats.commune}</p>
    </div>

    <!-- Badge conformité -->
    <div style="background: #f8fafc; padding: 16px 40px; border-bottom: 1px solid #e2e8f0; text-align: center;">
      <span style="
        font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
        background: ${couleurTaux}20; color: ${couleurTaux};
        padding: 6px 16px; border-radius: 999px; border: 1px solid ${couleurTaux}40;
      ">
        Niveau FD X50-167 : ${niveauConformite}
      </span>
    </div>

    <!-- KPIs principaux -->
    <div style="padding: 32px 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; color: #059669;">${stats.tauxSatisfaction.toFixed(0)}%</div>
        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-top: 4px;">Taux satisfaction</div>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; color: #1d4ed8;">${stats.totalAvis}</div>
        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-top: 4px;">Avis collectés</div>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; color: #d97706;">${stats.noteMoyenne.toFixed(1)}<span style="font-size: 16px;">/5</span></div>
        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-top: 4px;">Note moyenne</div>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; color: #dc2626;">${stats.alertesCritiques}</div>
        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-top: 4px;">Alertes critiques</div>
      </div>
    </div>

    <!-- Tâches ouvertes -->
    ${stats.tachesOuvertes > 0 ? `
    <div style="margin: 0 40px 24px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">⚠️</span>
      <div>
        <strong style="color: #c2410c; font-size: 14px;">${stats.tachesOuvertes} tâche${stats.tachesOuvertes > 1 ? 's' : ''} corrective${stats.tachesOuvertes > 1 ? 's' : ''} encore ouverte${stats.tachesOuvertes > 1 ? 's' : ''}</strong>
        <p style="margin: 2px 0 0; color: #9a3412; font-size: 12px;">Des actions correctives nécessitent votre attention.</p>
      </div>
    </div>` : `
    <div style="margin: 0 40px 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">✅</span>
      <div>
        <strong style="color: #15803d; font-size: 14px;">Toutes les tâches correctives sont clôturées</strong>
        <p style="margin: 2px 0 0; color: #166534; font-size: 12px;">Excellent travail de votre équipe !</p>
      </div>
    </div>`}

    <!-- CTA -->
    <div style="padding: 8px 40px 36px; text-align: center;">
      <a href="${FRONTEND_URL}/dashboard"
         style="
           display: inline-block;
           background: linear-gradient(135deg, #1a3a5c, #c47a20);
           color: white;
           text-decoration: none;
           padding: 14px 32px;
           border-radius: 10px;
           font-weight: 800;
           font-size: 15px;
           letter-spacing: -0.2px;
         ">
        Voir le tableau de bord complet →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Ce rapport est généré automatiquement par <strong>CXSAT</strong> — Plateforme de satisfaction client
        <br>Norme FD X50-167 · Conformité ARTCI ·
        <a href="${FRONTEND_URL}" style="color: #c47a20; text-decoration: none;">cxsat.ci</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Handler principal du job de rapport mensuel.
 * Appelé par Wasp le 1er du mois à 07:00 (cron "0 7 1 * *").
 */
export const envoyerRapportsMensuels = async (_args: unknown, _context: any) => {
  const maintenant = new Date();

  // Calculer le premier et dernier jour du mois précédent
  const debutMoisPrecedent = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth() - 1,
    1
  );
  const finMoisPrecedent = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    0,
    23, 59, 59
  );

  const moisLabel = debutMoisPrecedent.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  // Récupérer toutes les agences
  const agences = await prisma.agence.findMany({
    include: {
      utilisateurs: {
        where: { role: { in: ['CHEF_AGENCE', 'DIRECTION'] }, actif: true },
      },
    },
  });

  let emailsEnvoyes = 0;

  for (const agence of agences) {
    const stats = await calculeStatsAgence(
      agence.id,
      debutMoisPrecedent,
      finMoisPrecedent
    );
    if (!stats || stats.totalAvis === 0) continue; // Pas de données → pas de rapport

    for (const destinataire of agence.utilisateurs) {
      if (!destinataire.email) continue;

      const estDirection = destinataire.role === 'DIRECTION';
      const html = genererHtmlRapport(stats, moisLabel, estDirection);

      try {
        await emailSender.send({
          to: destinataire.email,
          subject: `📊 CXSAT — Rapport ${moisLabel} · ${agence.nom_agence}`,
          html,
          text: [
            `Rapport mensuel CXSAT — ${moisLabel}`,
            `Agence : ${stats.agenceNom} (${stats.commune})`,
            ``,
            `• Taux satisfaction : ${stats.tauxSatisfaction.toFixed(0)}%`,
            `• Total avis : ${stats.totalAvis}`,
            `• Note moyenne : ${stats.noteMoyenne.toFixed(1)}/5`,
            `• Alertes critiques : ${stats.alertesCritiques}`,
            `• Tâches ouvertes : ${stats.tachesOuvertes}`,
            ``,
            `Tableau de bord complet : ${FRONTEND_URL}/dashboard`,
          ].join('\n'),
        });

        emailsEnvoyes++;
        console.log(
          `[RAPPORT] Email envoyé à ${destinataire.email} (${agence.nom_agence})`
        );
      } catch (err) {
        console.error(
          `[RAPPORT] Erreur email vers ${destinataire.email}:`,
          err
        );
      }
    }
  }

  console.log(
    `[RAPPORT] Job terminé — ${emailsEnvoyes} rapport(s) envoyé(s) pour ${moisLabel}`
  );
  return { emailsEnvoyes, moisLabel };
};
