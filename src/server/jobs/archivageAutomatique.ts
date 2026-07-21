// src/server/jobs/archivageAutomatique.ts
// ============================================================================
// Cron Job — Archivage logique automatique
// Déclenché une fois par jour à 03:00 (heure creuse).
//
// Principe : on n'efface JAMAIS rien. Ce job se contente de poser
// `archive: true` sur les alertes et tâches correctives déjà résolues
// depuis longtemps (traitées/terminées il y a plus de RETENTION_JOURS
// jours), pour que les vues actives (Kanban "Alertes & Tâches", tableau de
// bord) restent légères sur le long terme sans jamais perdre de données —
// tout reste consultable dans la page Archives et continue de compter dans
// les statistiques et rapports mensuels.
//
// Un manager peut aussi archiver manuellement plus tôt via les actions
// archiverAlerte / archiverTache si besoin (voir actions.ts).
// ============================================================================

import { prisma } from 'wasp/server';

// Durée de rétention en vue active avant archivage automatique. 6 mois est
// un compromis raisonnable pour une plateforme de suivi qualité : assez
// long pour permettre des comparaisons "il y a quelques mois" sans sortir
// de la page Archives, assez court pour que les tableaux actifs ne
// s'alourdissent pas indéfiniment.
const RETENTION_JOURS = 180;

export const archiverElementsResolusAnciens = async (_args: unknown, _context: any) => {
  const seuil = new Date(Date.now() - RETENTION_JOURS * 24 * 60 * 60 * 1000);
  const maintenant = new Date();

  const alertesArchivees = await prisma.alerte.updateMany({
    where: {
      archive: false,
      statut_alerte: 'TRAITEE',
      date_traitement: { lte: seuil },
    },
    data: { archive: true, date_archivage: maintenant },
  });

  const tachesArchivees = await prisma.tacheCorrective.updateMany({
    where: {
      archive: false,
      statut_tache: 'TERMINEE',
      date_cloture: { lte: seuil },
    },
    data: { archive: true, date_archivage: maintenant },
  });

  console.log(
    `[Archivage] ${alertesArchivees.count} alerte(s) et ${tachesArchivees.count} tâche(s) archivées (résolues depuis plus de ${RETENTION_JOURS} jours).`
  );

  return { alertesArchivees: alertesArchivees.count, tachesArchivees: tachesArchivees.count };
};
