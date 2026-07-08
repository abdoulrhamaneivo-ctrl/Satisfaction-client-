// src/server/queries.ts
import { HttpError } from 'wasp/server';
import { getAgencyFilter, assertAgencyAccess } from './permissions';

type GetGuichetsArgs = {
  id_agence: number;
};

export const getGuichets = async (args: GetGuichetsArgs, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  if (args.id_agence && context.user.role !== 'DIRECTION') {
    assertAgencyAccess(context.user, args.id_agence);
  }

  return context.entities.Guichet.findMany({
    where: {
      ...getAgencyFilter(context.user),
      ...(args.id_agence ? { id_agence: args.id_agence } : {}),
      actif: true
    },
    orderBy: { id: 'asc' }
  });
};

export const getAgents = async (args: { id_agence: number }, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  assertAgencyAccess(context.user, args.id_agence);

  return context.entities.User.findMany({
    where: {
      id_agence: args.id_agence,
      role: 'AGENT',
      actif: true
    },
    select: { id: true, nom: true, prenom: true }
  });
};

export const getStatsFiltrees = async (
  args: { startDate: string; endDate: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);
  const filter = getAgencyFilter(context.user);

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

export const getReponses = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  return context.entities.Reponse.findMany({
    where: getAgencyFilter(context.user),
    orderBy: { date_reponse: 'desc' },
    include: {
      guichet: true,
      critere: true,
    },
  });
};

export const getAgentsByAgence = async (args: { id_agence: number }, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  assertAgencyAccess(context.user, args.id_agence);

  return context.entities.User.findMany({
    where: {
      id_agence: args.id_agence,
      role: 'AGENT',
    },
    select: { id: true, nom: true, prenom: true, role: true },
  });
};

export const getAgences = async (args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  if (context.user.role !== 'DIRECTION') return [];

  return context.entities.Agence.findMany({
    select: { id: true, nom_agence: true, commune: true },
    orderBy: { id: 'asc' },
  });
};

export const getAlertes = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  const where: any = getAgencyFilter(context.user);
  if (where.id_agence) {
    where.OR = [
      { guichet: { id_agence: where.id_agence } },
      { reponse: { id_agence: where.id_agence } },
    ];
    delete where.id_agence;
  }

  return context.entities.Alerte.findMany({
    where,
    orderBy: { date_creation: 'desc' },
    include: {
      guichet: true,
      reponse: true,
    },
  });
};

export const getTasks = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  return context.entities.Task.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      alerte: true,
    },
  });
};

export const getCriteres = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  return context.entities.Critere.findMany({
    orderBy: { id: 'asc' },
  });
};

export const getAgenceCriteres = async (args: { id_agence?: number }, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  assertAgencyAccess(context.user, args.id_agence);

  const idAgence = args.id_agence ?? context.user.id_agence;
  if (!idAgence) return [];

  const agenceCriteres = await context.entities.AgenceCritere.findMany({
    where: { id_agence: idAgence },
    select: { id_critere: true },
  });

  return agenceCriteres.map((ac: any) => ac.id_critere);
};

export const getActiveCritereForGuichet = async (args: { id_guichet: number }, context: any) => {
  const guichet = await context.entities.Guichet.findUnique({
    where: { id: args.id_guichet },
    select: { id_agence: true }
  });

  if (!guichet) return null;

  const agenceCritere = await context.entities.AgenceCritere.findFirst({
    where: { id_agence: guichet.id_agence },
    include: { critere: true },
    orderBy: { id_critere: 'asc' }
  });

  return agenceCritere?.critere || null;
};

export const getRadarStats = async (args: { id_agence?: number }, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  assertAgencyAccess(context.user, args.id_agence);

  const idAgence = args.id_agence ?? context.user.id_agence;
  if (!idAgence) {
    return [
      { subject: 'Planification', A: 80, fullMark: 100 },
      { subject: 'Mesurage', A: 60, fullMark: 100 },
      { subject: 'Surveillance', A: 70, fullMark: 100 },
      { subject: 'Communication', A: 50, fullMark: 100 },
      { subject: 'Amélioration', A: 75, fullMark: 100 },
    ];
  }

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
        { reponse: { id_agence: idAgence } }
      ]
    }
  });
  const activeAlertesNonNouvelles = await context.entities.Alerte.count({
    where: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } }
      ],
      statut_alerte: { in: ['EN_COURS', 'TRAITEE'] }
    }
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

  const totalTasks = await context.entities.Task.count({
    where: {
      user: { id_agence: idAgence }
    }
  });
  const doneTasks = await context.entities.Task.count({
    where: {
      user: { id_agence: idAgence },
      isDone: true
    }
  });
  const ameliorationScore = totalTasks > 0
    ? Math.round((doneTasks / totalTasks) * 100)
    : 100;

  return [
    { subject: 'Planification', A: planificationScore, fullMark: 100 },
    { subject: 'Mesurage', A: mesurageScore, fullMark: 100 },
    { subject: 'Surveillance', A: surveillanceScore, fullMark: 100 },
    { subject: 'Communication', A: communicationScore, fullMark: 100 },
    { subject: 'Amélioration', A: ameliorationScore, fullMark: 100 },
  ];
};

// --- Tarification SaaS (montants en FCFA) : lecture publique ---
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
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  const idAgence = args.id_agence ?? context.user.id_agence;
  if (!idAgence) return [];

  assertAgencyAccess(context.user, idAgence);

  return context.entities.Objectif.findMany({
    where: { id_agence: idAgence },
    include: { critere: true },
    orderBy: { id_critere: 'asc' },
  });
};

// ============================================================================
// TÂCHES CORRECTIVES (Module 5 — Amélioration)
// ============================================================================

export const getTachesCorrectives = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  const filter = getAgencyFilter(context.user);

  // Les tâches correctives sont liées à une alerte, elle-même liée à un guichet ou une réponse d'agence
  const alertes = await context.entities.Alerte.findMany({
    where: filter.id_agence
      ? {
          OR: [
            { guichet: { id_agence: filter.id_agence } },
            { reponse: { id_agence: filter.id_agence } },
          ],
        }
      : {},
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
  if (!context.user) throw new HttpError(401, 'Non authentifié');
  assertAgencyAccess(context.user, args.id_agence);

  const dateStr = args.date || new Date().toISOString().split('T')[0];

  return context.entities.AffectationGuichet.findMany({
    where: {
      guichet: { id_agence: args.id_agence },
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
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  const idAgence = args.id_agence ?? context.user.id_agence;
  if (!idAgence) return [];

  assertAgencyAccess(context.user, idAgence);

  // Grouper les réponses par mois sur les 12 derniers mois
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

  // Agréger par mois
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
  if (!context.user) throw new HttpError(401, 'Non authentifié');

  const idAgence = args.id_agence ?? context.user.id_agence;
  if (!idAgence) return [];

  assertAgencyAccess(context.user, idAgence);

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
