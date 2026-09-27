// src/server/jobs/rapportMensuel.ts
// ============================================================================
// Cron Job — Rapport mensuel automatique (Brevo/SMTP)
// Déclenché le 1er de chaque mois à 07:00.
// Envoie un rapport de satisfaction du mois précédent à :
//   - Chaque chef d'agence (données de son agence uniquement)
//   - La direction (données consolidées de toutes les agences)
// ============================================================================

import { envoyerEmailBrevo } from '../lib/emailBrevo';
import { prisma } from 'wasp/server';
import { scoreMoyenParAvis } from '../soumissions';

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

/** Calcule les stats d'une période [debut, fin] pour une agence donnée */
async function calculeStatsAgence(
  idAgence: number,
  debut: Date,
  fin: Date
): Promise<StatsAgence | null> {
  const agence = await prisma.agence.findUnique({ where: { id: idAgence } });
  if (!agence) return null;

  const reponses = await prisma.reponse.findMany({
    where: {
      id_agence: idAgence,
      date_reponse: { gte: debut, lte: fin },
    },
    select: {
      id: true,
      id_soumission: true,
      score_brut: true,
      // Vague 1 (P2) : sans ce champ, l'agrégat recalculait depuis score_brut
      // et inversait le CES / comptait le NPS en étoiles.
      score_normalise: true,
      critere: { select: { type_reponse: true, options_reponse: true, scoring_mode: true } },
    },
  });

  const alertesCritiques = await prisma.alerte.count({
    where: {
      guichet: { id_agence: idAgence },
      type_alerte: 'NOTE_CRITIQUE',
      date_creation: { gte: debut, lte: fin },
    },
  });

  const tachesOuvertes = await prisma.tacheCorrective.count({
    where: {
      statut_tache: { in: ['A_FAIRE', 'EN_COURS'] },
      alerte: { guichet: { id_agence: idAgence } },
    },
  });

  // MÉTRIQUE MÉTIER (règle « avis = 1 soumission ») : même logique que
  // getKPIsPeriode — le taux de satisfaction et la note moyenne sont calculés
  // sur le score moyen PAR AVIS. Une soumission à 5 critères compte 1 fois
  // (avec la moyenne de ses 5 scores), pas 5 fois.
  const scoresParAvis = scoreMoyenParAvis(reponses);
  const totalAvis = scoresParAvis.length;
  const noteMoyenne = totalAvis > 0 ? scoresParAvis.reduce((s, v) => s + v, 0) / totalAvis : 0;
  const satisfaits = scoresParAvis.filter((v) => v >= 4).length;
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

/** Génère le HTML du rapport (mensuel ou hebdomadaire — même gabarit).
 * `contexte` nomme le périmètre des chiffres : nom de l'agence, ou
 * « Toutes les agences — Vue consolidée ». Correctif 2026-09-27 : avant,
 * chaque direction recevait les chiffres d'UNE agence titrés « Vue
 * Consolidée » — l'intitulé mentait sur le périmètre. */
function genererHtmlRapport(
  stats: StatsAgence,
  periodeLabel: string,
  contexte: string
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
        ${periodeLabel} · ${contexte}
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
        Ce rapport est généré automatiquement par <strong>Yeba</strong> — Plateforme de satisfaction client
        <br>Norme FD X50-167 · Conformité ARTCI ·
        <a href="${FRONTEND_URL}" style="color: #c47a20; text-decoration: none;">yeba.ci</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Consolidation multi-agences (pure, testée) : la Direction reçoit UN email
 * avec les chiffres de son entreprise, pas N emails par agence.
 * - taux = satisfaits / total (recalculé, pas moyenné) ;
 * - note moyenne pondérée par le volume (une grosse agence pèse plus).
 */
export function consoliderStatsAgences(stats: StatsAgence[]): StatsAgence | null {
  const avecDonnees = stats.filter((s) => s.totalAvis > 0);
  if (avecDonnees.length === 0) return null;
  const totalAvis = avecDonnees.reduce((s, x) => s + x.totalAvis, 0);
  const satisfaits = avecDonnees.reduce((s, x) => s + x.satisfaits, 0);
  const noteMoyenne =
    totalAvis > 0
      ? avecDonnees.reduce((s, x) => s + x.noteMoyenne * x.totalAvis, 0) / totalAvis
      : 0;
  return {
    agenceNom: 'Toutes les agences',
    commune: `${avecDonnees.length} agence${avecDonnees.length > 1 ? 's' : ''}`,
    totalAvis,
    noteMoyenne,
    satisfaits,
    tauxSatisfaction: totalAvis > 0 ? (satisfaits / totalAvis) * 100 : 0,
    alertesCritiques: avecDonnees.reduce((s, x) => s + x.alertesCritiques, 0),
    tachesOuvertes: avecDonnees.reduce((s, x) => s + x.tachesOuvertes, 0),
  };
}

type RythmeRapport = 'mensuel' | 'hebdomadaire';

async function envoyerUnRapport(
  email: string,
  stats: StatsAgence,
  contexte: string,
  periodeLabel: string,
  rythme: RythmeRapport,
  tag: string,
): Promise<boolean> {
  const html = genererHtmlRapport(stats, periodeLabel, contexte);
  try {
    await envoyerEmailBrevo({
      to: email,
      subject: `📊 Yeba — Rapport ${periodeLabel} · ${contexte}`,
      html,
      text: [
        `Rapport ${rythme} Yeba — ${periodeLabel}`,
        `${contexte}`,
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
    console.log(`[RAPPORT] Email envoyé à ${email} (${contexte})`);
    return true;
  } catch (err) {
    console.error(`[RAPPORT] Erreur email vers ${email}:`, err);
    return false;
  }
}

/**
 * Moteur commun mensuel/hebdomadaire : chefs = email de leur agence,
 * directions = UN email consolidé par entreprise.
 *
 * Correctif 2026-09-27 : avant, chaque direction recevait les chiffres
 * d'UNE agence titrés « Vue Consolidée » (l'intitulé mentait), et les
 * directions sans agence ne recevaient rien du tout. Le regroupement est
 * PAR ENTREPRISE : sans ça, le consolidé mélangerait les tenants.
 */
async function envoyerRapportsPeriode(
  debut: Date,
  fin: Date,
  periodeLabel: string,
  rythme: RythmeRapport,
  tag: string,
): Promise<{ emailsEnvoyes: number; periodeLabel: string }> {
  const agences = await prisma.agence.findMany({
    include: {
      utilisateurs: {
        where: { role: { in: ['CHEF_AGENCE'] }, actif: true },
      },
    },
  });

  let emailsEnvoyes = 0;
  const statsParAgence: Array<{ idAgence: number; idEntreprise: number; stats: StatsAgence }> = [];

  for (const agence of agences) {
    const stats = await calculeStatsAgence(agence.id, debut, fin);
    if (!stats || stats.totalAvis === 0) continue; // Pas de données → pas de rapport
    statsParAgence.push({ idAgence: agence.id, idEntreprise: agence.id_entreprise, stats });
    for (const destinataire of agence.utilisateurs) {
      if (!destinataire.email) continue;
      const ok = await envoyerUnRapport(
        destinataire.email, stats, stats.agenceNom, periodeLabel, rythme, tag,
      );
      if (ok) emailsEnvoyes++;
    }
  }

  const entreprises = [...new Set(statsParAgence.map((s) => s.idEntreprise))];
  for (const idEntreprise of entreprises) {
    const consolide = consoliderStatsAgences(
      statsParAgence.filter((s) => s.idEntreprise === idEntreprise).map((s) => s.stats),
    );
    if (!consolide) continue;
    const directions = await prisma.user.findMany({
      where: { role: 'DIRECTION', actif: true, email: { not: null }, id_entreprise: idEntreprise },
      select: { email: true },
    });
    for (const d of directions) {
      if (!d.email) continue;
      const ok = await envoyerUnRapport(
        d.email, consolide, 'Toutes les agences — Vue consolidée', periodeLabel, rythme, tag,
      );
      if (ok) emailsEnvoyes++;
    }
  }

  console.log(`[RAPPORT] Job terminé — ${emailsEnvoyes} rapport(s) envoyé(s) pour ${periodeLabel}`);
  return { emailsEnvoyes, periodeLabel };
}

/**
 * Handler principal du job de rapport mensuel.
 * Appelé par Wasp le 1er du mois à 07:00 (cron "0 7 1 * *").
 */
export const envoyerRapportsMensuels = async (_args: unknown, _context: any) => {
  const maintenant = new Date();
  const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const finMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth(), 0, 23, 59, 59);
  const moisLabel = debutMoisPrecedent.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return envoyerRapportsPeriode(debutMoisPrecedent, finMoisPrecedent, moisLabel, 'mensuel', 'MENSUEL');
};

/**
 * Handler du job de rapport hebdomadaire (2026-09-27, §14 — le mensuel
 * seul ne suffit pas au pilotage). Appelé par Wasp le lundi à 07:00
 * (cron "0 7 * * 1"), sur la dernière semaine COMPLÈTE (lun→dim, jamais la
 * semaine en cours — mêmes bornes que l'analyse GEX SEMAINE).
 */
export const envoyerRapportsHebdo = async (_args: unknown, _context: any) => {
  const { derniereSemaineComplete } = await import('../gex/moteurGlobal');
  const { debut, fin } = derniereSemaineComplete(new Date());
  const semaineLabel = `semaine du ${debut.toLocaleDateString('fr-FR')} au ${fin.toLocaleDateString('fr-FR')}`;
  return envoyerRapportsPeriode(debut, fin, semaineLabel, 'hebdomadaire', 'HEBDO');
};
