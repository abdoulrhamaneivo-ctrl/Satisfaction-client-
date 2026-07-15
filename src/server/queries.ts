// src/server/queries.ts
import { HttpError } from 'wasp/server';
import {
  requireAuth,
  buildAgenceFilter,
  assertAgenceAccess,
  resolveAgenceId,
  resolveAgenceScope,
} from './middleware/rowLevelSecurity';

// Petit garde-fou commun : un id_agence "obligatoire" côté TypeScript n'est
// PAS validé au runtime par Wasp. On le vérifie explicitement partout où on
// en a besoin, plutôt que de laisser Prisma ignorer un filtre `undefined`
// (ce qui revenait auparavant à retourner les données de toute la plateforme).
function requireNumber(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (value === undefined || value === null || Number.isNaN(n)) {
    throw new HttpError(400, `Le champ "${fieldName}" est requis et doit être un nombre.`);
  }
  return n;
}

type GetGuichetsArgs = {
  id_agence?: number;
};

export const getGuichets = async (args: GetGuichetsArgs, context: any) => {
  requireAuth(context);

  let where: any;
  if (args.id_agence !== undefined) {
    const idAgence = requireNumber(args.id_agence, 'id_agence');
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    where = { id_agence: idAgence };
  } else {
    where = await buildAgenceFilter(context, context.entities);
  }

  return context.entities.Guichet.findMany({
    where: { ...where, actif: true },
    include: { services: true },
    orderBy: { id: 'asc' },
  });
};

export const getAgents = async (args: { id_agence: number }, context: any) => {
  requireAuth(context);
  const idAgence = requireNumber(args.id_agence, 'id_agence');
  await assertAgenceAccess(context, context.entities, idAgence, 'agence');

  return context.entities.User.findMany({
    where: {
      id_agence: idAgence,
      role: 'AGENT',
      actif: true,
    },
    select: { id: true, nom: true, prenom: true },
  });
};

export const getStatsFiltrees = async (
  args: { startDate: string; endDate: string },
  context: any
) => {
  requireAuth(context);
  const filter = await buildAgenceFilter(context, context.entities);

  return context.entities.Reponse.findMany({
    where: {
      ...filter,
      date_reponse: {
        gte: new Date(args.startDate),
        lte: new Date(args.endDate),
      },
    },
    orderBy: { date_reponse: 'desc' },
    include: {
      guichet: true,
      critere: true,
    },
  });
};

type GetReponsesArgs = {
  id_agence?: number;
  id_guichet?: number;
  id_service?: number;
  score?: number;
  startDate?: string;
  endDate?: string;
};

export const getReponses = async (args: GetReponsesArgs, context: any) => {
  requireAuth(context);

  let scopeFilter: any;
  if (args.id_agence !== undefined) {
    const idAgence = requireNumber(args.id_agence, 'id_agence');
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    scopeFilter = { id_agence: idAgence };
  } else {
    scopeFilter = await buildAgenceFilter(context, context.entities);
  }

  const whereClause: any = {
    ...scopeFilter,
    ...(args.id_guichet ? { id_guichet: args.id_guichet } : {}),
    ...(args.id_service ? { id_service: args.id_service } : {}),
    ...(args.score ? { score_brut: args.score } : {}),
  };

  if (args.startDate || args.endDate) {
    whereClause.date_reponse = {};
    if (args.startDate) {
      whereClause.date_reponse.gte = new Date(args.startDate);
    }
    if (args.endDate) {
      whereClause.date_reponse.lte = new Date(args.endDate);
    }
  }

  return context.entities.Reponse.findMany({
    where: whereClause,
    orderBy: { date_reponse: 'desc' },
    include: {
      guichet: true,
      critere: true,
      service: true,
      agence: {
        select: { id: true, nom_agence: true, commune: true },
      },
      agent: {
        select: {
          id: true,
          username: true,
          email: true,
          nom: true,
          prenom: true,
        },
      },
    },
  });
};

export const getAgentsByAgence = async (args: { id_agence: number }, context: any) => {
  requireAuth(context);
  const idAgence = requireNumber(args.id_agence, 'id_agence');
  await assertAgenceAccess(context, context.entities, idAgence, 'agence');

  return context.entities.User.findMany({
    where: {
      id_agence: idAgence,
      role: { in: ['AGENT', 'CHEF_AGENCE', 'QUALITE'] },
    },
    select: { id: true, nom: true, prenom: true, role: true, email: true, telephone: true, actif: true },
    orderBy: [{ actif: 'desc' }, { role: 'asc' }, { nom: 'asc' }],
  });
};

// Liste les agences DE L'ENTREPRISE de l'utilisateur (DIRECTION/QUALITE
// uniquement) — jamais toutes les agences de la plateforme.
export const getAgences = async (args: void, context: any) => {
  requireAuth(context);

  if (context.user.role !== 'DIRECTION' && context.user.role !== 'QUALITE') return [];
  if (!context.user.id_entreprise) return [];

  return context.entities.Agence.findMany({
    where: { id_entreprise: context.user.id_entreprise },
    select: { id: true, nom_agence: true, commune: true },
    orderBy: { id: 'asc' },
  });
};

export const getAlertes = async (_args: void, context: any) => {
  requireAuth(context);

  const filter = await buildAgenceFilter(context, context.entities);
  const idAgenceClause = filter.id_agence;

  return context.entities.Alerte.findMany({
    where: {
      OR: [
        { guichet: { id_agence: idAgenceClause } },
        { reponse: { id_agence: idAgenceClause } },
      ],
    },
    orderBy: { date_creation: 'desc' },
    include: {
      guichet: true,
      reponse: true,
    },
  });
};

// Catalogue = socle commun de la plateforme (id_entreprise NULL, ex. seed
// initial) + critères propres à l'entreprise de l'utilisateur. Une
// entreprise ne voit jamais les critères créés par une AUTRE entreprise.
export const getCriteres = async (_args: void, context: any) => {
  requireAuth(context);
  return context.entities.Critere.findMany({
    where: {
      OR: [
        { id_entreprise: null },
        { id_entreprise: context.user.id_entreprise ?? -1 },
      ],
    },
    orderBy: { id: 'asc' },
  });
};

export const getAgenceCriteres = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  const agenceCriteres = await context.entities.AgenceCritere.findMany({
    where: { id_agence: idAgence },
    select: { id_critere: true },
  });

  return agenceCriteres.map((ac: any) => ac.id_critere);
};

// Même principe que getCriteres : socle commun + services propres à
// l'entreprise de l'utilisateur.
export const getServices = async (_args: void, context: any) => {
  requireAuth(context);
  return context.entities.Service.findMany({
    where: {
      OR: [
        { id_entreprise: null },
        { id_entreprise: context.user.id_entreprise ?? -1 },
      ],
    },
    orderBy: { id: 'asc' },
  });
};

// Route PUBLIQUE volontairement (formulaire de collecte scanné par un client
// anonyme via QR code) : pas d'authentification requise ici par design.
export const getFormDefinitionForGuichet = async (args: { id_guichet: number }, context: any) => {
  const guichet = await context.entities.Guichet.findUnique({
    where: { id: args.id_guichet },
    include: {
      services: {
        include: {
          criteres: {
            orderBy: { id: 'asc' },
          },
        },
      },
      agence: {
        include: {
          agencesCriteres: {
            include: {
              critere: true,
            },
            orderBy: { id_critere: 'asc' },
          },
        },
      },
    },
  });

  if (!guichet) return null;

  const agencyCriteres = guichet.agence.agencesCriteres.map((ac: any) => ac.critere);

  return {
    guichetName: guichet.nom_guichet,
    id_agence: guichet.id_agence,
    services: guichet.services.map((s: any) => ({
      id: s.id,
      libelle_service: s.libelle_service,
      criteres: s.criteres,
    })),
    agencyCriteres: agencyCriteres,
  };
};

export const getRadarStats = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, args.id_agence);
  const idAgence = scope.id_agence;

  const activeGuichets = await context.entities.Guichet.findMany({
    where: { id_agence: idAgence, actif: true },
  });
  const totalGuichetsCount = activeGuichets.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const assignmentsToday = await context.entities.AffectationGuichet.findMany({
    where: {
      id_guichet: { in: activeGuichets.map((g: any) => g.id) },
      date_affectation: new Date(todayStr),
    },
    select: { id_guichet: true },
  });
  const uniquePlannedGuichets = new Set(assignmentsToday.map((a: any) => a.id_guichet)).size;
  const planificationScore = totalGuichetsCount > 0
    ? Math.round((uniquePlannedGuichets / totalGuichetsCount) * 100)
    : 100;

  const totalReponses = await context.entities.Reponse.count({
    where: { id_agence: idAgence },
  });
  const targetReponses = totalGuichetsCount * 15;
  const mesurageScore = targetReponses > 0
    ? Math.min(100, Math.round((totalReponses / targetReponses) * 100))
    : 100;

  const totalAlertes = await context.entities.Alerte.count({
    where: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } },
      ],
    },
  });
  const activeAlertesNonNouvelles = await context.entities.Alerte.count({
    where: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } },
      ],
      statut_alerte: { in: ['EN_COURS', 'TRAITEE'] },
    },
  });
  const surveillanceScore = totalAlertes > 0
    ? Math.round((activeAlertesNonNouvelles / totalAlertes) * 100)
    : 100;

  const distinctCanalsResponse = await context.entities.Reponse.findMany({
    where: { id_agence: idAgence },
    select: { id_canal: true },
    distinct: ['id_canal'],
  });
  const distinctCanalsCount = distinctCanalsResponse.length;
  const communicationScore = Math.min(100, Math.round((distinctCanalsCount / 3) * 100));

  const tacheFilter = {
    alerte: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } },
      ],
    },
  };
  const totalTaches = await context.entities.TacheCorrective.count({
    where: tacheFilter,
  });
  const tachesTerminees = await context.entities.TacheCorrective.count({
    where: { ...tacheFilter, statut_tache: 'TERMINEE' },
  });
  const ameliorationScore = totalTaches > 0
    ? Math.round((tachesTerminees / totalTaches) * 100)
    : 100;

  return [
    { subject: 'Planification', A: planificationScore, fullMark: 100 },
    { subject: 'Mesurage', A: mesurageScore, fullMark: 100 },
    { subject: 'Surveillance', A: surveillanceScore, fullMark: 100 },
    { subject: 'Communication', A: communicationScore, fullMark: 100 },
    { subject: 'Amélioration', A: ameliorationScore, fullMark: 100 },
  ];
};

// Lecture publique volontaire (page tarifs visible avant connexion).
export const getPlanPricing = async (_args: void, context: any) => {
  const defaults: Record<string, number> = { hobby: 15000, pro: 35000, credits10: 5000 };

  const rows = await context.entities.PlanPricing.findMany();

  const pricing = { ...defaults };
  for (const row of rows) {
    pricing[row.id] = row.amountFcfa;
  }

  return pricing;
};

// ============================================================================
// OBJECTIFS DE SATISFACTION (Module 1 — Planification)
// ============================================================================

export const getObjectifs = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, args.id_agence);

  const objectifs = await context.entities.Objectif.findMany({
    where: { id_agence: scope.id_agence },
    include: { critere: true },
    orderBy: { id_critere: 'asc' },
  });

  const now = new Date();

  // Un objectif seul ("cible 85%") ne dit rien sans le réalisé en face :
  // on calcule ici le score réellement obtenu sur la période de l'objectif
  // pour que le dashboard affiche directement "Atteint" / "En retard".
  return Promise.all(
    objectifs.map(async (obj: any) => {
      const dateFinEffective = obj.date_fin < now ? obj.date_fin : now;
      const reponses = await context.entities.Reponse.findMany({
        where: {
          id_critere: obj.id_critere,
          id_agence: scope.id_agence,
          date_reponse: { gte: obj.date_debut, lte: dateFinEffective },
        },
        select: { score_brut: true },
      });

      const nb = reponses.length;
      const cible_pct = parseFloat(Number(obj.valeur_cible).toFixed(1));
      let realise_pct: number | null = null;
      let ecart: number | null = null;
      let statut: 'ATTEINT' | 'EN_RETARD' | 'PAS_DE_DONNEES' = 'PAS_DE_DONNEES';

      if (nb > 0) {
        const moyenne = reponses.reduce((s: number, r: any) => s + r.score_brut, 0) / nb;
        realise_pct = parseFloat(((moyenne / 5) * 100).toFixed(1));
        ecart = parseFloat((realise_pct - cible_pct).toFixed(1));
        statut = ecart >= 0 ? 'ATTEINT' : 'EN_RETARD';
      }

      return { ...obj, nb_avis: nb, cible_pct, realise_pct, ecart, statut };
    })
  );
};

// ============================================================================
// TÂCHES CORRECTIVES (Module 5 — Amélioration)
// ============================================================================

export const getTachesCorrectives = async (_args: void, context: any) => {
  requireAuth(context);

  const filter = await buildAgenceFilter(context, context.entities);

  const alertes = await context.entities.Alerte.findMany({
    where: {
      OR: [
        { guichet: { id_agence: filter.id_agence } },
        { reponse: { id_agence: filter.id_agence } },
      ],
    },
    select: { id: true },
  });

  const alerteIds = alertes.map((a: any) => a.id);

  return context.entities.TacheCorrective.findMany({
    where: { id_alerte: { in: alerteIds } },
    orderBy: { date_creation: 'desc' },
    include: {
      alerte: {
        include: {
          guichet: true,
          reponse: true,
        },
      },
      responsable: {
        select: { id: true, nom: true, prenom: true },
      },
    },
  });
};

// ============================================================================
// AFFECTATIONS DU JOUR (Planning)
// ============================================================================

export const getAffectationsDuJour = async (args: { id_agence: number; date?: string }, context: any) => {
  requireAuth(context);
  const idAgence = requireNumber(args.id_agence, 'id_agence');
  await assertAgenceAccess(context, context.entities, idAgence, 'agence');

  const dateStr = args.date || new Date().toISOString().split('T')[0];

  return context.entities.AffectationGuichet.findMany({
    where: {
      guichet: { id_agence: idAgence },
      date_affectation: new Date(dateStr),
    },
    include: {
      agent: { select: { id: true, nom: true, prenom: true } },
      guichet: { select: { id: true, nom_guichet: true } },
    },
    orderBy: { heure_debut: 'asc' },
  });
};

// ============================================================================
// TENDANCE MENSUELLE (Module 3 — Surveillance)
// ============================================================================

export const getTendanceMensuelle = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, args.id_agence);
  const idAgence = scope.id_agence;

  const debut = new Date();
  debut.setMonth(debut.getMonth() - 11);
  debut.setDate(1);
  debut.setHours(0, 0, 0, 0);

  const reponses = await context.entities.Reponse.findMany({
    where: {
      id_agence: idAgence,
      date_reponse: { gte: debut },
    },
    select: {
      score_brut: true,
      date_reponse: true,
    },
    orderBy: { date_reponse: 'asc' },
  });

  const moisMap = new Map<string, { total: number; count: number }>();

  for (const r of reponses) {
    const d = new Date(r.date_reponse);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!moisMap.has(key)) moisMap.set(key, { total: 0, count: 0 });
    const entry = moisMap.get(key)!;
    entry.total += r.score_brut;
    entry.count++;
  }

  return Array.from(moisMap.entries()).map(([key, val]) => {
    const [annee, mois] = key.split('-');
    return {
      mois: new Date(Number(annee), Number(mois) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      score_moyen: parseFloat((val.total / val.count).toFixed(2)),
      nb_reponses: val.count,
    };
  });
};

// ============================================================================
// COMPARAISON PAR AGENT (Module 3 — Surveillance)
// ============================================================================

export const getStatsByAgent = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, args.id_agence);
  const idAgence = scope.id_agence;

  const agents = await context.entities.User.findMany({
    where: { id_agence: idAgence, role: 'AGENT', actif: true },
    select: { id: true, nom: true, prenom: true },
  });

  const stats = await Promise.all(
    agents.map(async (agent: any) => {
      const reponses = await context.entities.Reponse.findMany({
        where: { id_agent: agent.id },
        select: { score_brut: true },
      });
      const nb = reponses.length;
      const scoreMoyen = nb > 0
        ? parseFloat((reponses.reduce((s: number, r: any) => s + r.score_brut, 0) / nb).toFixed(2))
        : 0;
      return {
        nom: `${agent.prenom} ${agent.nom}`,
        score_moyen: scoreMoyen,
        nb_avis: nb,
      };
    })
  );

  return stats.filter((s: any) => s.nb_avis > 0).sort((a: any, b: any) => b.score_moyen - a.score_moyen);
};

// ============================================================================
// CLASSEMENT PAR GUICHET (drill-down "où est le problème")
// ============================================================================
// Trié du PIRE au MEILLEUR volontairement : sur un dashboard de pilotage,
// l'utilisateur doit repérer en priorité les points faibles, pas se
// féliciter des meilleurs scores en premier.

export const getStatsByGuichet = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, args.id_agence);

  const guichets = await context.entities.Guichet.findMany({
    where: { id_agence: scope.id_agence, actif: true },
    select: {
      id: true,
      nom_guichet: true,
      agence: { select: { nom_agence: true } },
    },
  });

  const stats = await Promise.all(
    guichets.map(async (g: any) => {
      const reponses = await context.entities.Reponse.findMany({
        where: { id_guichet: g.id },
        select: { score_brut: true },
      });
      const nb = reponses.length;
      const scoreMoyen = nb > 0
        ? parseFloat((reponses.reduce((s: number, r: any) => s + r.score_brut, 0) / nb).toFixed(2))
        : 0;
      return {
        id: g.id,
        nom: g.nom_guichet,
        agence: g.agence?.nom_agence ?? null,
        score_moyen: scoreMoyen,
        nb_avis: nb,
      };
    })
  );

  return stats.filter((s: any) => s.nb_avis > 0).sort((a: any, b: any) => a.score_moyen - b.score_moyen);
};

// ============================================================================
// ACTIONS PRIORITAIRES ("quoi faire aujourd'hui" — bandeau haut de dashboard)
// ============================================================================
// Regroupe et priorise ce qui exige une action humaine immédiate : alertes
// jamais traitées + tâches correctives dont l'échéance est dépassée. Un
// dashboard décisionnel doit répondre à "qu'est-ce que je traite en premier"
// avant même d'afficher des courbes.

export const getActionsPrioritaires = async (_args: void, context: any) => {
  requireAuth(context);
  const filter = await buildAgenceFilter(context, context.entities);
  const idAgenceClause = filter.id_agence;

  const alertesNouvelles = await context.entities.Alerte.findMany({
    where: {
      statut_alerte: 'NOUVELLE',
      OR: [
        { guichet: { id_agence: idAgenceClause } },
        { reponse: { id_agence: idAgenceClause } },
      ],
    },
    orderBy: { date_creation: 'desc' },
    take: 10,
    include: {
      guichet: true,
      reponse: { include: { critere: true } },
    },
  });

  const now = new Date();
  const tachesEnRetard = await context.entities.TacheCorrective.findMany({
    where: {
      statut_tache: { not: 'TERMINEE' },
      date_echeance: { lt: now },
      alerte: {
        OR: [
          { guichet: { id_agence: idAgenceClause } },
          { reponse: { id_agence: idAgenceClause } },
        ],
      },
    },
    orderBy: { date_echeance: 'asc' },
    take: 10,
    include: {
      alerte: { include: { guichet: true } },
      responsable: { select: { nom: true, prenom: true } },
    },
  });

  return {
    alertesNouvelles: alertesNouvelles.map((a: any) => ({
      id: a.id.toString(),
      message: a.message,
      type_alerte: a.type_alerte,
      date_creation: a.date_creation,
      guichet: a.guichet?.nom_guichet || a.reponse?.critere?.libelle_critere || null,
      gravite: a.type_alerte === 'NOTE_CRITIQUE' ? 'HAUTE' : 'MOYENNE',
    })),
    tachesEnRetard: tachesEnRetard.map((t: any) => ({
      id: t.id.toString(),
      titre: t.titre,
      date_echeance: t.date_echeance,
      responsable: t.responsable ? `${t.responsable.prenom} ${t.responsable.nom}` : 'Non assigné',
      guichet: t.alerte?.guichet?.nom_guichet || null,
      joursRetard: Math.max(
        0,
        Math.floor((now.getTime() - new Date(t.date_echeance).getTime()) / (1000 * 60 * 60 * 24))
      ),
    })),
  };
};

// ============================================================================
// KPIs AVEC COMPARAISON DE PÉRIODE (30 derniers jours vs 30 jours précédents)
// ============================================================================
// Un KPI seul ("satisfaction 78%") ne permet aucune décision. Ce qui compte,
// c'est la direction : est-ce mieux ou moins bien qu'avant ?

export const getKPIsPeriode = async (_args: void, context: any) => {
  requireAuth(context);
  const filter = await buildAgenceFilter(context, context.entities);

  const now = new Date();
  const debutActuel = new Date(now);
  debutActuel.setDate(debutActuel.getDate() - 30);
  const debutPrecedent = new Date(debutActuel);
  debutPrecedent.setDate(debutPrecedent.getDate() - 30);

  const [actuelles, precedentes] = await Promise.all([
    context.entities.Reponse.findMany({
      where: { ...filter, date_reponse: { gte: debutActuel, lte: now } },
      select: { score_brut: true },
    }),
    context.entities.Reponse.findMany({
      where: { ...filter, date_reponse: { gte: debutPrecedent, lt: debutActuel } },
      select: { score_brut: true },
    }),
  ]);

  const calc = (list: any[]) => {
    const nb = list.length;
    const moyenne = nb > 0 ? list.reduce((s, r) => s + r.score_brut, 0) / nb : 0;
    const satisfaction = nb > 0 ? (list.filter((r) => r.score_brut >= 4).length / nb) * 100 : 0;
    return {
      nb,
      moyenne: parseFloat(moyenne.toFixed(2)),
      satisfaction: parseFloat(satisfaction.toFixed(1)),
    };
  };

  const cur = calc(actuelles);
  const prev = calc(precedentes);

  // Delta en points (pas en %) pour la satisfaction/note — plus lisible et
  // moins trompeur qu'un pourcentage de variation quand la base est petite.
  const deltaPoints = (a: number, b: number) => parseFloat((a - b).toFixed(1));
  const deltaVolumePct = prev.nb === 0
    ? (cur.nb > 0 ? 100 : 0)
    : parseFloat((((cur.nb - prev.nb) / prev.nb) * 100).toFixed(1));

  return {
    periode_actuelle: cur,
    periode_precedente: prev,
    delta_satisfaction_pts: deltaPoints(cur.satisfaction, prev.satisfaction),
    delta_note_pts: deltaPoints(cur.moyenne, prev.moyenne),
    delta_volume_pct: deltaVolumePct,
  };
};
