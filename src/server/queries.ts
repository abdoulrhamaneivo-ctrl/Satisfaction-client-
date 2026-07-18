// src/server/queries.ts
import { HttpError } from 'wasp/server';
import {
  requireAuth,
  requireRole,
  buildAgenceFilter,
  assertAgenceAccess,
  resolveAgenceId,
  resolveAgenceScope,
} from './middleware/rowLevelSecurity';
import { regrouperParSoumission, compterAvis, scoreMoyenParAvis } from './soumissions';
import { BRANDING } from '../shared/branding';

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
  } else {
    // Par défaut, limiter aux 90 derniers jours pour protéger le dashboard
    // contre les timeouts sur une base mature.
    const debut90j = new Date();
    debut90j.setDate(debut90j.getDate() - 90);
    whereClause.date_reponse = { gte: debut90j };
  }

  return context.entities.Reponse.findMany({
    where: whereClause,
    orderBy: { date_reponse: 'desc' },
    take: 500, // sécurité : plafond pour la carte dashboard
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

// ============================================================================
// AVIS REGROUPÉS PAR SOUMISSION — VERSION PAGINÉE (take/skip)
// ============================================================================
// La pagination est appliquée après regroupement côté mémoire sur la fenêtre
// chargée. Retourne { avis, total, hasMore, page, pageSize }.
// ============================================================================

type GetAvisGroupesArgs = GetReponsesArgs & {
  page?: number;      // 1-indexed, défaut 1
  pageSize?: number;  // défaut 20, max 100
};

export const getAvisGroupes = async (args: GetAvisGroupesArgs, context: any) => {
  requireAuth(context);

  const page = Math.max(1, Number(args.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(args.pageSize) || 20));

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
  };

  if (args.startDate || args.endDate) {
    whereClause.date_reponse = {};
    if (args.startDate) whereClause.date_reponse.gte = new Date(args.startDate);
    if (args.endDate) whereClause.date_reponse.lte = new Date(args.endDate);
  }

  // Fenêtre glissante : on charge page * pageSize * 4 lignes pour compenser
  // le regroupement (formulaire à 4 critères = 4 lignes pour 1 avis).
  const windowSize = page * pageSize * 4;

  const brutes = await context.entities.Reponse.findMany({
    where: whereClause,
    orderBy: { date_reponse: 'desc' },
    take: windowSize,
    include: {
      guichet: true,
      critere: true,
      service: true,
      agence: { select: { id: true, nom_agence: true, commune: true } },
      agent: { select: { id: true, username: true, email: true, nom: true, prenom: true } },
    },
  });

  const groupes = regrouperParSoumission(brutes).map((g) => {
    const premiere = g.reponses[0];
    const scores = g.reponses.map((r: any) => r.score_brut);
    const scoreMin = Math.min(...scores);
    const scoreMoyen = parseFloat((scores.reduce((s: number, v: number) => s + v, 0) / scores.length).toFixed(2));

    return {
      id_soumission: g.id_soumission ?? g.cle,
      date_reponse: premiere.date_reponse,
      commentaire_texte: premiere.commentaire_texte,
      id_canal: premiere.id_canal,
      guichet: premiere.guichet,
      service: premiere.service,
      agence: premiere.agence,
      agent: premiere.agent,
      score_min: scoreMin,
      score_moyen: scoreMoyen,
      reponses: g.reponses.map((r: any) => ({
        id: r.id,
        score_brut: r.score_brut,
        critere: r.critere,
      })),
    };
  });

  const filtered = args.score
    ? groupes.filter((g) => g.reponses.some((r) => r.score_brut === Number(args.score)))
    : groupes;

  const sorted = filtered.sort(
    (a, b) => new Date(b.date_reponse).getTime() - new Date(a.date_reponse).getTime()
  );

  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);
  const hasMore = sorted.length > start + pageSize;

  return { avis: paginated, total: sorted.length, hasMore, page, pageSize };
};

// ============================================================================
// EXPORT AVIS COMPLET (pour CSV — sans pagination, limité à 20 000 lignes)
// ============================================================================

export const exportAvisGroupes = async (args: GetReponsesArgs, context: any) => {
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
  };

  if (args.startDate || args.endDate) {
    whereClause.date_reponse = {};
    if (args.startDate) whereClause.date_reponse.gte = new Date(args.startDate);
    if (args.endDate) whereClause.date_reponse.lte = new Date(args.endDate);
  }

  const brutes = await context.entities.Reponse.findMany({
    where: whereClause,
    orderBy: { date_reponse: 'desc' },
    take: 20000,
    include: {
      guichet: true,
      critere: true,
      service: true,
      agence: { select: { id: true, nom_agence: true, commune: true } },
      agent: { select: { id: true, nom: true, prenom: true } },
    },
  });

  return regrouperParSoumission(brutes)
    .map((g) => {
      const premiere = g.reponses[0];
      const scores = g.reponses.map((r: any) => r.score_brut);
      const scoreMoyen = parseFloat((scores.reduce((s: number, v: number) => s + v, 0) / scores.length).toFixed(2));
      return {
        id_soumission: g.id_soumission ?? g.cle,
        date_reponse: premiere.date_reponse,
        guichet: premiere.guichet?.nom_guichet || '',
        agence: premiere.agence?.nom_agence || '',
        service: premiere.service?.libelle_service || '',
        agent: premiere.agent ? `${premiere.agent.prenom || ''} ${premiere.agent.nom || ''}`.trim() : '',
        score_moyen: scoreMoyen,
        commentaire: premiere.commentaire_texte || '',
        criteres: g.reponses.map((r: any) => `${r.critere?.libelle_critere || 'Critère'}:${r.score_brut}`).join(' | '),
      };
    })
    .sort((a, b) => new Date(b.date_reponse).getTime() - new Date(a.date_reponse).getTime());
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
          criteresServices: {
            include: { critere: true },
            orderBy: { ordre: 'asc' },
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
      criteres: s.criteresServices.map((cs: any) => cs.critere),
    })),
    agencyCriteres: agencyCriteres,
    brandConfig: BRANDING,
  };
};

// ============================================================================
// Vue "todo" des questions par opération (glisser-déposer)
// ============================================================================
// Alimente le tableau de type Kanban de ConfigurationCriteresPage : une
// colonne par opération (avec ses questions déjà rattachées, triées par
// `ordre`), plus le vivier des questions encore "non assignées" à aucune
// opération.
export const getCriteresParOperation = async (args: { id_agence?: number }, context: any) => {
  requireAuth(context);
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  const entrepriseFilter = {
    OR: [
      { id_entreprise: null },
      { id_entreprise: context.user.id_entreprise ?? -1 },
    ],
  };

  const [services, criteres, agenceCriteres] = await Promise.all([
    context.entities.Service.findMany({
      where: entrepriseFilter,
      include: {
        criteresServices: {
          include: { critere: true },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    }),
    context.entities.Critere.findMany({
      where: entrepriseFilter,
      orderBy: { id: 'asc' },
    }),
    context.entities.AgenceCritere.findMany({
      where: { id_agence: idAgence },
      select: { id_critere: true },
    }),
  ]);

  const activeIds = new Set(agenceCriteres.map((ac: any) => ac.id_critere));
  const assignedIds = new Set(
    services.flatMap((s: any) => s.criteresServices.map((cs: any) => cs.id_critere))
  );

  return {
    operations: services.map((s: any) => ({
      id: s.id,
      libelle_service: s.libelle_service,
      criteres: s.criteresServices.map((cs: any) => ({
        ...cs.critere,
        actif: activeIds.has(cs.critere.id),
      })),
    })),
    // Questions encore rattachées à aucune opération : le vivier de gauche
    // dans lequel on pioche pour glisser une question vers une colonne.
    nonAssignees: criteres
      .filter((c: any) => !assignedIds.has(c.id))
      .map((c: any) => ({ ...c, actif: activeIds.has(c.id) })),
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

  // "Mesurage" = nombre d'AVIS reçus (pas de lignes Reponse : un formulaire à
  // plusieurs critères ne doit pas gonfler artificiellement ce score).
  const reponsesPourComptage = await context.entities.Reponse.findMany({
    where: { id_agence: idAgence },
    select: { id: true, id_soumission: true },
  });
  const totalAvis = compterAvis(reponsesPourComptage);
  const targetReponses = totalGuichetsCount * 15;
  const mesurageScore = targetReponses > 0
    ? Math.min(100, Math.round((totalAvis / targetReponses) * 100))
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
      id: true,
      id_soumission: true,
      score_brut: true,
      date_reponse: true,
    },
    orderBy: { date_reponse: 'asc' },
  });

  // Regroupement par mois, puis par avis (soumission) à l'intérieur de
  // chaque mois : un avis à 5 critères ne doit pas peser 5x plus qu'un avis
  // à 1 critère dans le score moyen mensuel, et nb_avis doit compter des
  // clients, pas des lignes.
  const moisMap = new Map<string, typeof reponses>();
  for (const r of reponses) {
    const d = new Date(r.date_reponse);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!moisMap.has(key)) moisMap.set(key, []);
    moisMap.get(key)!.push(r);
  }

  return Array.from(moisMap.entries()).map(([key, reponsesDuMois]) => {
    const [annee, mois] = key.split('-');
    const scoresParAvis = scoreMoyenParAvis(reponsesDuMois as any);
    const scoreMoyen = scoresParAvis.length > 0
      ? scoresParAvis.reduce((s, v) => s + v, 0) / scoresParAvis.length
      : 0;
    return {
      mois: new Date(Number(annee), Number(mois) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      score_moyen: parseFloat(scoreMoyen.toFixed(2)),
      nb_avis: scoresParAvis.length,
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

  // Correctif performance : l'ancienne version lançait une requête
  // findMany séparée PAR AGENT (N+1) — sur une agence à 30 agents, ça
  // faisait 30 allers-retours base de données rien que pour cette carte du
  // dashboard. On récupère maintenant toutes les réponses de l'agence en
  // UNE seule requête, puis on les regroupe en mémoire par agent.
  const reponses = await context.entities.Reponse.findMany({
    where: { id_agence: idAgence, id_agent: { in: agents.map((a: any) => a.id) } },
    select: { id: true, id_soumission: true, score_brut: true, id_agent: true },
  });

  const reponsesParAgent = new Map<string, any[]>();
  for (const r of reponses) {
    if (!r.id_agent) continue;
    if (!reponsesParAgent.has(r.id_agent)) reponsesParAgent.set(r.id_agent, []);
    reponsesParAgent.get(r.id_agent)!.push(r);
  }

  const stats = agents.map((agent: any) => {
    const reponsesAgent = reponsesParAgent.get(agent.id) || [];
    const nb = compterAvis(reponsesAgent);
    const scoreMoyen = reponsesAgent.length > 0
      ? parseFloat((reponsesAgent.reduce((s: number, r: any) => s + r.score_brut, 0) / reponsesAgent.length).toFixed(2))
      : 0;
    return {
      nom: `${agent.prenom} ${agent.nom}`,
      score_moyen: scoreMoyen,
      nb_avis: nb,
    };
  });

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

  // Même correctif que getStatsByAgent : une seule requête pour TOUS les
  // guichets de l'agence plutôt qu'une requête par guichet (N+1). Le gain
  // devient significatif dès qu'une agence dépasse une poignée de caisses.
  const reponses = await context.entities.Reponse.findMany({
    where: { id_guichet: { in: guichets.map((g: any) => g.id) } },
    select: { id: true, id_soumission: true, score_brut: true, id_guichet: true },
  });

  const reponsesParGuichet = new Map<number, any[]>();
  for (const r of reponses) {
    if (!reponsesParGuichet.has(r.id_guichet)) reponsesParGuichet.set(r.id_guichet, []);
    reponsesParGuichet.get(r.id_guichet)!.push(r);
  }

  const stats = guichets.map((g: any) => {
    const reponsesGuichet = reponsesParGuichet.get(g.id) || [];
    const nb = compterAvis(reponsesGuichet);
    const scoreMoyen = reponsesGuichet.length > 0
      ? parseFloat((reponsesGuichet.reduce((s: number, r: any) => s + r.score_brut, 0) / reponsesGuichet.length).toFixed(2))
      : 0;
    return {
      id: g.id,
      nom: g.nom_guichet,
      agence: g.agence?.nom_agence ?? null,
      score_moyen: scoreMoyen,
      nb_avis: nb,
    };
  });

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
      select: { id: true, id_soumission: true, score_brut: true },
    }),
    context.entities.Reponse.findMany({
      where: { ...filter, date_reponse: { gte: debutPrecedent, lt: debutActuel } },
      select: { id: true, id_soumission: true, score_brut: true },
    }),
  ]);

  // "nb" = nombre d'avis (soumissions), pas de lignes Reponse. La moyenne et
  // le taux de satisfaction sont calculés sur le score moyen PAR AVIS (une
  // soumission à N critères compte 1 fois, avec la moyenne de ses N scores),
  // pas sur chaque ligne individuellement.
  const calc = (list: any[]) => {
    const scoresParAvis = scoreMoyenParAvis(list);
    const nb = scoresParAvis.length;
    const moyenne = nb > 0 ? scoresParAvis.reduce((s, v) => s + v, 0) / nb : 0;
    const satisfaction = nb > 0 ? (scoresParAvis.filter((v) => v >= 4).length / nb) * 100 : 0;
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

// ============================================================================
// HISTORIQUE D'AUDIT DES TÂCHES CORRECTIVES (Module 4)
// Retourne l'historique complet des changements de statut d'une tâche.
// Utilisé par la timeline dans le Kanban pour la traçabilité ARTCI.
// ============================================================================

export const getTacheHistorique = async (args: { id_tache: number }, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const idTache = requireNumber(args.id_tache, 'id_tache');

  // Vérifier que la tâche appartient bien à l'agence de l'appelant
  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: BigInt(idTache) },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  const idAgence = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
  if (!idAgence) throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
  await assertAgenceAccess(context, context.entities, idAgence, 'tâche');

  const historique = await context.entities.TacheCorrectiveHistorique.findMany({
    where: { id_tache: BigInt(idTache) },
    orderBy: { date_action: 'asc' },
    include: {
      auteur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
    },
  });

  return historique.map((h: any) => ({
    id: h.id.toString(),
    date_action: h.date_action,
    ancien_statut: h.ancien_statut,
    nouveau_statut: h.nouveau_statut,
    commentaire: h.commentaire,
    auteur: h.auteur,
  }));
};

// ============================================================================
// OBJECTIFS PAR AGENCE — Vue consolidée DIRECTION (Module 5)
// Retourne les objectifs de TOUTES les agences de l'entreprise, groupés par
// agence. Réservé à DIRECTION : permet de comparer les objectifs d'un coup d'œil.
// ============================================================================

export const getObjectifsParAgence = async (_args: void, context: any) => {
  requireAuth(context);

  if (context.user.role !== 'DIRECTION') {
    throw new HttpError(403, 'Cette vue est réservée à la Direction.');
  }

  if (!context.user.id_entreprise) {
    throw new HttpError(400, "Compte non rattaché à une entreprise.");
  }

  const agences = await context.entities.Agence.findMany({
    where: { id_entreprise: context.user.id_entreprise },
    select: { id: true, nom_agence: true, commune: true },
    orderBy: { id: 'asc' },
  });

  const now = new Date();

  return Promise.all(
    agences.map(async (agence: any) => {
      const objectifs = await context.entities.Objectif.findMany({
        where: { id_agence: agence.id },
        include: { critere: true },
        orderBy: { id_critere: 'asc' },
      });

      const objectifsAvecStatut = await Promise.all(
        objectifs.map(async (obj: any) => {
          const dateFinEffective = obj.date_fin < now ? obj.date_fin : now;
          const reponses = await context.entities.Reponse.findMany({
            where: {
              id_critere: obj.id_critere,
              id_agence: agence.id,
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

      return {
        agence,
        objectifs: objectifsAvecStatut,
      };
    })
  );
};
