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
import { regrouperParSoumission, compterAvis, scoreMoyenParAvis, scoreNormaliseSur5, commentairesDeGroupe } from './soumissions';
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

  // Un guichet archivé (fermeture définitive) sort des vues actives — voir
  // getArchives pour le consulter et le désarchiver si besoin.
  return context.entities.Guichet.findMany({
    where: { ...where, actif: true, archive: false },
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
      commentaire_texte: commentairesDeGroupe(g.reponses),
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
        commentaire: commentairesDeGroupe(g.reponses),
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
    where: { id_entreprise: context.user.id_entreprise, archive: false },
    select: { id: true, nom_agence: true, commune: true },
    orderBy: { id: 'asc' },
  });
};

export const getAlertes = async (_args: void, context: any) => {
  requireAuth(context);

  const filter = await buildAgenceFilter(context, context.entities);
  const idAgenceClause = filter.id_agence;

  // Une alerte archivée sort de la liste active — voir getArchives.
  return context.entities.Alerte.findMany({
    where: {
      archive: false,
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
        orderBy: { id: 'asc' },
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

  // Un QR code ne doit jamais réactiver une collecte sur un guichet ou une
  // agence retirée du service. Cette query est publique, donc elle constitue
  // la première barrière côté client.
  if (!guichet || !guichet.actif || guichet.archive || guichet.agence.archive) return null;

  const agencyCriteres = guichet.agence.agencesCriteres.map((ac: any) => ac.critere);
  const criteresActifsAgence = new Set(guichet.agence.agencesCriteres.map((ac: any) => ac.id_critere));
  const criteresDejaRattaches = new Set<number>();

  return {
    guichetName: guichet.nom_guichet,
    id_agence: guichet.id_agence,
    services: guichet.services.map((s: any) => ({
      id: s.id,
      libelle_service: s.libelle_service,
      criteres: s.criteresServices.filter((cs: any) => {
        // Désactiver un critère pour l'agence doit le retirer de tous les
        // formulaires, y compris lorsqu'il était déjà placé dans une opération.
        if (!criteresActifsAgence.has(cs.id_critere)) return false;
        if (criteresDejaRattaches.has(cs.id_critere)) return false;
        criteresDejaRattaches.add(cs.id_critere);
        return true;
      }).map((cs: any) => cs.critere),
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
  // Les anciennes données pouvaient contenir le même critère dans plusieurs
  // opérations alors que l'éditeur le déplace comme une carte unique. On
  // présente une seule carte (la première opération par ordre stable) pour
  // éviter doublons et déplacements ambigus ; le prochain déplacement remet
  // automatiquement les rattachements en cohérence.
  const criteresDejaPlaces = new Set<number>();

  return {
    operations: services.map((s: any) => ({
      id: s.id,
      libelle_service: s.libelle_service,
      criteres: s.criteresServices
        .filter((cs: any) => {
          if (criteresDejaPlaces.has(cs.id_critere)) return false;
          criteresDejaPlaces.add(cs.id_critere);
          return true;
        })
        .map((cs: any) => ({
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
  const debutCollecte = new Date();
  debutCollecte.setDate(debutCollecte.getDate() - 30);
  const reponsesPourComptage = await context.entities.Reponse.findMany({
    where: { id_agence: idAgence, date_reponse: { gte: debutCollecte } },
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
  const alertesPrisesEnCharge = await context.entities.Alerte.count({
    where: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } },
      ],
      statut_alerte: { in: ['EN_COURS', 'TRAITEE'] },
    },
  });
  const surveillanceScore = totalAlertes > 0
    ? Math.round((alertesPrisesEnCharge / totalAlertes) * 100)
    : 100;

  const alertesResolues = await context.entities.Alerte.count({
    where: {
      OR: [
        { guichet: { id_agence: idAgence } },
        { reponse: { id_agence: idAgence } },
      ],
      statut_alerte: 'TRAITEE',
    },
  });
  const resolutionScore = totalAlertes > 0
    ? Math.round((alertesResolues / totalAlertes) * 100)
    : 100;

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
    { subject: 'Collecte (30j)', A: mesurageScore, fullMark: 100 },
    { subject: 'Alertes prises en charge', A: surveillanceScore, fullMark: 100 },
    { subject: 'Alertes résolues', A: resolutionScore, fullMark: 100 },
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
        select: {
          score_brut: true,
          critere: { select: { type_reponse: true, options_reponse: true } },
        },
      });

      const nb = reponses.length;
      const cible_pct = parseFloat(Number(obj.valeur_cible).toFixed(1));
      let realise_pct: number | null = null;
      let ecart: number | null = null;
      let statut: 'ATTEINT' | 'EN_RETARD' | 'PAS_DE_DONNEES' = 'PAS_DE_DONNEES';

      if (nb > 0) {
        const scores = reponses
          .map((reponse: any) => scoreNormaliseSur5(reponse))
          .filter((score): score is number => score !== null);
        if (scores.length === 0) {
          return { ...obj, nb_avis: nb, cible_pct, realise_pct, ecart, statut };
        }
        const moyenne = scores.reduce((s: number, score: number) => s + score, 0) / scores.length;
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
    where: { id_alerte: { in: alerteIds }, archive: false },
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
// ARCHIVES — vue consolidée des éléments archivés (guichets, agences,
// alertes, tâches). Une seule query pour alimenter les 4 onglets de la
// page Archives en un aller-retour réseau ; chaque catégorie reste filtrée
// par le même périmètre d'agence que le reste de l'application.
// ============================================================================

export const getArchives = async (_args: void, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const filter = await buildAgenceFilter(context, context.entities);

  const [guichets, alertes, taches] = await Promise.all([
    context.entities.Guichet.findMany({
      where: { ...filter, archive: true },
      include: { agence: { select: { nom_agence: true } } },
      orderBy: { date_archivage: 'desc' },
    }),
    context.entities.Alerte.findMany({
      where: {
        archive: true,
        OR: [
          { guichet: { id_agence: filter.id_agence } },
          { reponse: { id_agence: filter.id_agence } },
        ],
      },
      include: { guichet: { include: { agence: { select: { nom_agence: true } } } }, reponse: true },
      orderBy: { date_archivage: 'desc' },
    }),
    context.entities.TacheCorrective.findMany({
      where: {
        archive: true,
        alerte: {
          OR: [
            { guichet: { id_agence: filter.id_agence } },
            { reponse: { id_agence: filter.id_agence } },
          ],
        },
      },
      include: {
        alerte: { include: { guichet: { include: { agence: { select: { nom_agence: true } } } }, reponse: true } },
        responsable: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { date_archivage: 'desc' },
    }),
  ]);

  // Les agences archivées ne concernent que la direction/qualité (les chefs
  // d'agence ne gèrent pas le réseau d'agences lui-même).
  const agences =
    context.user.role === 'DIRECTION' || context.user.role === 'QUALITE'
      ? await context.entities.Agence.findMany({
          where: { id_entreprise: context.user.id_entreprise, archive: true },
          select: { id: true, nom_agence: true, commune: true, date_archivage: true },
          orderBy: { date_archivage: 'desc' },
        })
      : [];

  return { guichets, agences, alertes, taches };
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
      critere: { select: { type_reponse: true, options_reponse: true } },
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

export const getStatsByAgent = async (args: { id_agence?: number; nbJours?: number } | void, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, (args as any)?.id_agence);
  const idAgence = scope.id_agence;
  const nbJours = Number.isFinite((args as any)?.nbJours)
    ? Math.min(365, Math.max(1, Math.round((args as any).nbJours)))
    : 30;
  const debut = new Date();
  debut.setDate(debut.getDate() - nbJours);

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
    where: {
      id_agence: idAgence,
      id_agent: { in: agents.map((a: any) => a.id) },
      date_reponse: { gte: debut },
    },
    select: {
      id: true,
      id_soumission: true,
      score_brut: true,
      id_agent: true,
      critere: { select: { type_reponse: true, options_reponse: true } },
    },
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
    const scoresParAvis = scoreMoyenParAvis(reponsesAgent);
    const scoreMoyen = scoresParAvis.length > 0
      ? parseFloat((scoresParAvis.reduce((s, score) => s + score, 0) / scoresParAvis.length).toFixed(2))
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

export const getStatsByGuichet = async (args: { id_agence?: number; nbJours?: number } | void, context: any) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, (args as any)?.id_agence);
  const nbJours = Number.isFinite((args as any)?.nbJours)
    ? Math.min(365, Math.max(1, Math.round((args as any).nbJours)))
    : 30;
  const debut = new Date();
  debut.setDate(debut.getDate() - nbJours);

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
    where: {
      id_guichet: { in: guichets.map((g: any) => g.id) },
      date_reponse: { gte: debut },
    },
    select: {
      id: true,
      id_soumission: true,
      score_brut: true,
      id_guichet: true,
      critere: { select: { type_reponse: true, options_reponse: true } },
    },
  });

  const reponsesParGuichet = new Map<number, any[]>();
  for (const r of reponses) {
    if (!reponsesParGuichet.has(r.id_guichet)) reponsesParGuichet.set(r.id_guichet, []);
    reponsesParGuichet.get(r.id_guichet)!.push(r);
  }

  const stats = guichets.map((g: any) => {
    const reponsesGuichet = reponsesParGuichet.get(g.id) || [];
    const nb = compterAvis(reponsesGuichet);
    const scoresParAvis = scoreMoyenParAvis(reponsesGuichet);
    const scoreMoyen = scoresParAvis.length > 0
      ? parseFloat((scoresParAvis.reduce((s, score) => s + score, 0) / scoresParAvis.length).toFixed(2))
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

export const getKPIsPeriode = async (args: { nbJours?: number } | void, context: any) => {
  requireAuth(context);
  const filter = await buildAgenceFilter(context, context.entities);

  // Fenêtre glissante configurable (7 / 30 / 90 jours...) — 30 par défaut
  // pour rester compatible avec les appels existants qui ne passent aucun
  // argument. On borne à [1, 365] pour éviter un scan complet de la table
  // sur une valeur farfelue envoyée par le client.
  const nbJoursDemandes = (args as any)?.nbJours;
  const nbJours = Number.isFinite(nbJoursDemandes)
    ? Math.min(365, Math.max(1, Math.round(nbJoursDemandes)))
    : 30;

  const now = new Date();
  const debutActuel = new Date(now);
  debutActuel.setDate(debutActuel.getDate() - nbJours);
  const debutPrecedent = new Date(debutActuel);
  debutPrecedent.setDate(debutPrecedent.getDate() - nbJours);

  const [actuelles, precedentes] = await Promise.all([
    context.entities.Reponse.findMany({
      where: { ...filter, date_reponse: { gte: debutActuel, lte: now } },
      select: {
        id: true,
        id_soumission: true,
        score_brut: true,
        critere: { select: { type_reponse: true, options_reponse: true } },
      },
    }),
    context.entities.Reponse.findMany({
      where: { ...filter, date_reponse: { gte: debutPrecedent, lt: debutActuel } },
      select: {
        id: true,
        id_soumission: true,
        score_brut: true,
        critere: { select: { type_reponse: true, options_reponse: true } },
      },
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
    nb_jours: nbJours,
    periode_actuelle: cur,
    periode_precedente: prev,
    delta_satisfaction_pts: deltaPoints(cur.satisfaction, prev.satisfaction),
    delta_note_pts: deltaPoints(cur.moyenne, prev.moyenne),
    delta_volume_pct: deltaVolumePct,
  };
};

// ============================================================================
// TEMPS MOYEN DE TRAITEMENT (Module "actions" — décision)
// Deux délais distincts, à ne pas confondre :
//  - "prise en charge" : Alerte.date_creation -> Alerte.date_traitement
//    (le temps qu'un manager mette la main sur l'alerte)
//  - "résolution" : TacheCorrective.date_creation -> date_cloture, sur les
//    tâches TERMINEE (le temps jusqu'à ce que le problème soit vraiment réglé)
// Les deux sont calculés sur les éléments CLÔTURÉS pendant la période (et non
// créés pendant la période), pour mesurer une vitesse de traitement réelle et
// pas un artefact de la date de création.
// ============================================================================

export const getTempsTraitement = async (args: { nbJours?: number } | void, context: any) => {
  requireAuth(context);
  const filter = await buildAgenceFilter(context, context.entities);
  const idAgenceClause = (filter as any).id_agence;

  const nbJoursDemandes = (args as any)?.nbJours;
  const nbJours = Number.isFinite(nbJoursDemandes)
    ? Math.min(365, Math.max(1, Math.round(nbJoursDemandes)))
    : 30;

  const now = new Date();
  const debutActuel = new Date(now);
  debutActuel.setDate(debutActuel.getDate() - nbJours);
  const debutPrecedent = new Date(debutActuel);
  debutPrecedent.setDate(debutPrecedent.getDate() - nbJours);

  const dureeMoyenneHeures = (items: { debut: Date; fin: Date }[]) => {
    if (items.length === 0) return null;
    const totalMs = items.reduce((s, it) => s + (it.fin.getTime() - it.debut.getTime()), 0);
    return parseFloat((totalMs / items.length / (1000 * 60 * 60)).toFixed(1));
  };

  const [alertesActuelles, alertesPrecedentes, tachesActuelles, tachesPrecedentes] = await Promise.all([
    context.entities.Alerte.findMany({
      where: {
        date_traitement: { gte: debutActuel, lte: now },
        OR: [
          { guichet: { id_agence: idAgenceClause } },
          { reponse: { id_agence: idAgenceClause } },
        ],
      },
      select: { date_creation: true, date_traitement: true },
    }),
    context.entities.Alerte.findMany({
      where: {
        date_traitement: { gte: debutPrecedent, lt: debutActuel },
        OR: [
          { guichet: { id_agence: idAgenceClause } },
          { reponse: { id_agence: idAgenceClause } },
        ],
      },
      select: { date_creation: true, date_traitement: true },
    }),
    context.entities.TacheCorrective.findMany({
      where: {
        statut_tache: 'TERMINEE',
        date_cloture: { gte: debutActuel, lte: now },
        alerte: {
          OR: [
            { guichet: { id_agence: idAgenceClause } },
            { reponse: { id_agence: idAgenceClause } },
          ],
        },
      },
      select: { date_creation: true, date_cloture: true },
    }),
    context.entities.TacheCorrective.findMany({
      where: {
        statut_tache: 'TERMINEE',
        date_cloture: { gte: debutPrecedent, lt: debutActuel },
        alerte: {
          OR: [
            { guichet: { id_agence: idAgenceClause } },
            { reponse: { id_agence: idAgenceClause } },
          ],
        },
      },
      select: { date_creation: true, date_cloture: true },
    }),
  ]);

  const priseEnChargeActuelle = dureeMoyenneHeures(
    alertesActuelles.map((a: any) => ({ debut: new Date(a.date_creation), fin: new Date(a.date_traitement) }))
  );
  const priseEnChargePrecedente = dureeMoyenneHeures(
    alertesPrecedentes.map((a: any) => ({ debut: new Date(a.date_creation), fin: new Date(a.date_traitement) }))
  );
  const resolutionActuelle = dureeMoyenneHeures(
    tachesActuelles.map((t: any) => ({ debut: new Date(t.date_creation), fin: new Date(t.date_cloture) }))
  );
  const resolutionPrecedente = dureeMoyenneHeures(
    tachesPrecedentes.map((t: any) => ({ debut: new Date(t.date_creation), fin: new Date(t.date_cloture) }))
  );

  const deltaHeures = (a: number | null, b: number | null) =>
    a === null || b === null ? null : parseFloat((a - b).toFixed(1));

  return {
    nb_jours: nbJours,
    prise_en_charge: {
      moyenne_heures: priseEnChargeActuelle,
      nb: alertesActuelles.length,
      delta_heures: deltaHeures(priseEnChargeActuelle, priseEnChargePrecedente),
    },
    resolution: {
      moyenne_heures: resolutionActuelle,
      nb: tachesActuelles.length,
      delta_heures: deltaHeures(resolutionActuelle, resolutionPrecedente),
    },
  };
};

// ============================================================================
// HISTORIQUE D'AUDIT DES TÂCHES CORRECTIVES (Module 4)
// Retourne l'historique complet des changements de statut d'une tâche.
// Utilisé par la timeline dans le Kanban pour la traçabilité ARTCI.
// ============================================================================

// ============================================================================
// HEATMAP DES AVIS PAR JOUR / HEURE
// Répond à "à quel moment mes clients sont-ils le plus mécontents ?" — sert
// à ajuster les effectifs (renfort un vendredi après-midi si c'est le
// créneau qui concentre les mauvaises notes, par ex.). Agrégation simple sur
// Reponse.date_reponse, pas de nouvelle donnée nécessaire.
// ============================================================================

const JOURS_SEMAINE_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const getHeatmapReponses = async (
  args: { nbJours?: number; id_agence?: number } | void,
  context: any
) => {
  requireAuth(context);
  const scope = await resolveAgenceScope(context, context.entities, (args as any)?.id_agence);

  const nbJoursDemandes = (args as any)?.nbJours;
  const nbJours = Number.isFinite(nbJoursDemandes)
    ? Math.min(365, Math.max(1, Math.round(nbJoursDemandes)))
    : 90;

  const debut = new Date();
  debut.setDate(debut.getDate() - nbJours);

  const reponses = await context.entities.Reponse.findMany({
    where: {
      id_agence: scope.id_agence,
      date_reponse: { gte: debut },
    },
    select: {
      id_soumission: true,
      id: true,
      score_brut: true,
      date_reponse: true,
      critere: { select: { type_reponse: true, options_reponse: true } },
    },
  });

  // Un avis à N critères ne doit compter qu'une fois par créneau — même
  // logique de regroupement par soumission que partout ailleurs dans ce
  // fichier (scoreMoyenParAvis), sinon un formulaire à 5 questions pèserait
  // artificiellement plus lourd dans la heatmap qu'un formulaire à 1 question.
  const parSoumission = new Map<string, { date: Date; scores: number[] }>();
  for (const r of reponses as any[]) {
    const cle = r.id_soumission ?? `_${r.id}`;
    if (!parSoumission.has(cle)) {
      parSoumission.set(cle, { date: new Date(r.date_reponse), scores: [] });
    }
    const score = scoreNormaliseSur5(r);
    if (score !== null) parSoumission.get(cle)!.scores.push(score);
  }

  // Grille complète 7 jours x 24h initialisée à zéro, pour que le front
  // n'ait pas à gérer les créneaux sans aucun avis.
  const grille = new Map<string, { nb: number; sommeScores: number; nbScores: number }>();
  for (let jour = 0; jour < 7; jour++) {
    for (let heure = 0; heure < 24; heure++) {
      grille.set(`${jour}-${heure}`, { nb: 0, sommeScores: 0, nbScores: 0 });
    }
  }

  for (const { date, scores } of parSoumission.values()) {
    const jour = date.getDay();
    const heure = date.getHours();
    const cellule = grille.get(`${jour}-${heure}`)!;
    cellule.nb += 1;
    if (scores.length > 0) {
      cellule.sommeScores += scores.reduce((s, v) => s + v, 0) / scores.length;
      cellule.nbScores += 1;
    }
  }

  const cellules = Array.from(grille.entries()).map(([cle, { nb, sommeScores, nbScores }]) => {
    const [jour, heure] = cle.split('-').map(Number);
    return {
      jour,
      jour_label: JOURS_SEMAINE_FR[jour],
      heure,
      nb,
      score_moyen: nbScores > 0 ? parseFloat((sommeScores / nbScores).toFixed(2)) : null,
    };
  });

  const maxNb = cellules.reduce((m, c) => Math.max(m, c.nb), 0);

  return {
    nb_jours: nbJours,
    total_avis: parSoumission.size,
    max_nb: maxNb,
    cellules,
  };
};

export const getTacheHistorique = async (args: { id_tache: number }, context: any) => {
  requireAuth(context);

  const idTache = requireNumber(args.id_tache, 'id_tache');

  // Vérifier que la tâche appartient bien à l'agence de l'appelant
  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: BigInt(idTache) },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  // Même règle que updateStatutTache : un profil de gestion peut consulter
  // l'historique de n'importe quelle tâche de son périmètre, un AGENT
  // seulement celui des tâches qui lui sont assignées.
  if (tache.id_responsable !== context.user.id) {
    requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);
  }

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

// ============================================================================
// RECHERCHE GLOBALE (palette de commandes Ctrl+K)
// Interroge plusieurs entités en une fois (agences, guichets, agents, avis)
// — voir l'analyse UX : ce n'est pas juste un champ texte en façade, c'est
// une vraie requête backend multi-entités, respectant le même périmètre de
// données (RLS) que le reste de l'app.
// ============================================================================

export const getRechercheGlobale = async (args: { q: string }, context: any) => {
  requireAuth(context);

  const q = (args?.q ?? '').trim();
  // Sous 2 caractères, une recherche "contains" sur plusieurs tables ne
  // renvoie que du bruit — on ne lance pas la requête tant que ce n'est pas
  // atteint (protège aussi la base d'un scan sur chaque frappe).
  if (q.length < 2) {
    return { agences: [], guichets: [], agents: [], avis: [] };
  }

  const filter = await buildAgenceFilter(context, context.entities);
  const idAgenceClause = filter.id_agence;
  const contains = { contains: q, mode: 'insensitive' as const };

  const peutVoirAgences = context.user.role === 'DIRECTION' || context.user.role === 'QUALITE';

  const [agences, guichets, agents, avis] = await Promise.all([
    peutVoirAgences && context.user.id_entreprise
      ? context.entities.Agence.findMany({
          where: {
            id_entreprise: context.user.id_entreprise,
            OR: [{ nom_agence: contains }, { commune: contains }],
          },
          select: { id: true, nom_agence: true, commune: true },
          take: 5,
        })
      : Promise.resolve([]),
    context.entities.Guichet.findMany({
      where: { id_agence: idAgenceClause, nom_guichet: contains },
      select: { id: true, nom_guichet: true, id_agence: true, agence: { select: { nom_agence: true } } },
      take: 5,
    }),
    context.entities.User.findMany({
      where: {
        id_agence: idAgenceClause,
        role: 'AGENT',
        OR: [{ nom: contains }, { prenom: contains }],
      },
      select: { id: true, nom: true, prenom: true, id_agence: true },
      take: 5,
    }),
    context.entities.Reponse.findMany({
      where: { id_agence: idAgenceClause, commentaire_texte: contains },
      select: {
        id: true,
        commentaire_texte: true,
        score_brut: true,
        date_reponse: true,
        guichet: { select: { nom_guichet: true } },
      },
      orderBy: { date_reponse: 'desc' },
      take: 5,
    }),
  ]);

  return {
    agences: agences.map((a: any) => ({ id: a.id, nom_agence: a.nom_agence, commune: a.commune })),
    guichets: guichets.map((g: any) => ({
      id: g.id,
      nom_guichet: g.nom_guichet,
      id_agence: g.id_agence,
      nom_agence: g.agence?.nom_agence ?? null,
    })),
    agents: agents.map((u: any) => ({ id: u.id, nom: u.nom, prenom: u.prenom, id_agence: u.id_agence })),
    avis: avis.map((r: any) => ({
      id: r.id.toString(),
      commentaire_texte: r.commentaire_texte,
      score_brut: r.score_brut,
      date_reponse: r.date_reponse,
      guichet: r.guichet?.nom_guichet ?? null,
    })),
  };
};
