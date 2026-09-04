// src/server/queries.ts
import { HttpError } from 'wasp/server';
import { requireAuth, requireRole, buildAgenceFilter, assertAgenceAccess, resolveAgenceId, resolveAgenceScope, assertEntrepriseActive, } from './middleware/rowLevelSecurity';
import { regrouperParSoumission, compterAvis, scoreMoyenParAvis, scoreNormaliseSur5, commentairesDeGroupe } from './soumissions';
import { BRANDING } from '../shared/branding';
// Petit garde-fou commun : un id_agence "obligatoire" côté TypeScript n'est
// PAS validé au runtime par Wasp. On le vérifie explicitement partout où on
// en a besoin, plutôt que de laisser Prisma ignorer un filtre `undefined`
// (ce qui revenait auparavant à retourner les données de toute la plateforme).
function requireNumber(value, fieldName) {
    const n = Number(value);
    if (value === undefined || value === null || Number.isNaN(n)) {
        throw new HttpError(400, `Le champ "${fieldName}" est requis et doit être un nombre.`);
    }
    return n;
}
export const getGuichets = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    let where;
    if (args.id_agence !== undefined) {
        const idAgence = requireNumber(args.id_agence, 'id_agence');
        await assertAgenceAccess(context, context.entities, idAgence, 'agence');
        where = { id_agence: idAgence };
    }
    else {
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
export const getAgents = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
export const getStatsFiltrees = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    // CONFIDENTIALITÉ (RG16/RG17) : cette query retourne des réponses brutes
    // (dont commentaire_texte). La DIRECTION n'y a pas droit, comme getReponses.
    if (context.user.role === 'DIRECTION') {
        throw new HttpError(403, "Les réponses détaillées sont réservées aux chefs d'agence. La Direction dispose des KPI consolidés.");
    }
    const filter = await buildAgenceFilter(context, context.entities);
    // Select explicite : commentaire_texte exclu par défaut du payload —
    // seuls les scores et métadonnées sont utiles à l'agrégation front.
    return context.entities.Reponse.findMany({
        where: {
            ...filter,
            date_reponse: {
                gte: new Date(args.startDate),
                lte: new Date(args.endDate),
            },
        },
        orderBy: { date_reponse: 'desc' },
        select: {
            id: true,
            id_soumission: true,
            score_brut: true,
            date_reponse: true,
            id_guichet: true,
            guichet: { select: { id: true, nom_guichet: true } },
            critere: { select: { id: true, libelle_critere: true, type_reponse: true } },
        },
    });
};
export const getReponses = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    // CONFIDENTIALITÉ MÉTIER (RG16/RG17 — Doc 08) : la DIRECTION pilote par
    // les chiffres. Elle n'a JAMAIS accès aux réponses brutes (verbatims,
    // coordonnées). Ce refus est serveur — masquer les cartes côté front ne
    // suffit jamais, l'API est la seule frontière de confiance.
    if (context.user.role === 'DIRECTION') {
        throw new HttpError(403, "Les réponses détaillées sont réservées aux chefs d'agence et auditeurs qualité. La Direction dispose des KPI consolidés, tendances et thèmes agrégés.");
    }
    let scopeFilter;
    if (args.id_agence !== undefined) {
        const idAgence = requireNumber(args.id_agence, 'id_agence');
        await assertAgenceAccess(context, context.entities, idAgence, 'agence');
        scopeFilter = { id_agence: idAgence };
    }
    else {
        scopeFilter = await buildAgenceFilter(context, context.entities);
    }
    const whereClause = {
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
    else {
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
            analyseIA: true,
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
export const getAvisGroupes = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    // CONFIDENTIALITÉ MÉTIER (RG16/RG17 — Doc 08) : même frontière que
    // getReponses — la DIRECTION ne reçoit jamais les avis détaillés
    // (verbatims, coordonnées clients). Refus serveur, pas de masquage front.
    if (context.user.role === 'DIRECTION') {
        throw new HttpError(403, "Les avis détaillés sont réservés aux chefs d'agence et auditeurs qualité. La Direction dispose des KPI consolidés et thèmes agrégés.");
    }
    const page = Math.max(1, Number(args.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(args.pageSize) || 20));
    let scopeFilter;
    if (args.id_agence !== undefined) {
        const idAgence = requireNumber(args.id_agence, 'id_agence');
        await assertAgenceAccess(context, context.entities, idAgence, 'agence');
        scopeFilter = { id_agence: idAgence };
    }
    else {
        scopeFilter = await buildAgenceFilter(context, context.entities);
    }
    const whereClause = {
        ...scopeFilter,
        ...(args.id_guichet ? { id_guichet: args.id_guichet } : {}),
        ...(args.id_service ? { id_service: args.id_service } : {}),
    };
    if (args.startDate || args.endDate) {
        whereClause.date_reponse = {};
        if (args.startDate)
            whereClause.date_reponse.gte = new Date(args.startDate);
        if (args.endDate)
            whereClause.date_reponse.lte = new Date(args.endDate);
    }
    // FENÊTRE OPTIMISÉE (audit F3 — amélioration de la pagination sans changer
    // le modèle) : l'ancienne fenêtre « page × pageSize × 4 » rechargeait
    // O(page) lignes et transviatait les groupes à cheval sur deux fenêtres.
    // Maintenant :
    //   1. une requête count(DISTINCT groupes) donne le vrai total d'avis ;
    //   2. on ne charge que la fenêtre de lignes nécessaire à la page demandée,
    //      en suréchantillonnant (×6) puis en TRONQUANT le regroupement aux
    //      groupes COMPLETS tombant dans la page — les groupes coupés en fin de
    //      fenêtre sont conservés pour la page suivante grâce à la cohérence de
    //      l'ordre (date desc, id desc déterministe).
    // Une vraie pagination SQL nécessiterait une entité Submission (P2 modèle) :
    // c'est la voie à prendre si le volume dépasse ~500k lignes Reponse.
    const windowSize = page * pageSize * 6;
    const [totalGroupes, brutes] = await Promise.all([
        context.entities.Reponse.groupBy({
            by: ['id_soumission'],
            where: whereClause,
        }).then((g) => g.length),
        context.entities.Reponse.findMany({
            where: whereClause,
            orderBy: [{ date_reponse: 'desc' }, { id: 'desc' }],
            take: windowSize,
            include: {
                guichet: true,
                critere: true,
                service: true,
                analyseIA: true,
                agence: { select: { id: true, nom_agence: true, commune: true } },
                agent: { select: { id: true, username: true, email: true, nom: true, prenom: true } },
            },
        }),
    ]);
    const groupes = regrouperParSoumission(brutes).map((g) => {
        const premiere = g.reponses[0];
        const scores = g.reponses.map((r) => r.score_brut);
        const scoreMin = Math.min(...scores);
        const scoreMoyen = parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2));
        const analyseEffective = g.reponses.find((r) => r.analyseIA)?.analyseIA || premiere.analyseIA || null;
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
            analyseIA: analyseEffective,
            reponses: g.reponses.map((r) => ({
                id: r.id,
                score_brut: r.score_brut,
                critere: r.critere,
                analyseIA: r.analyseIA,
            })),
        };
    });
    const filtered = args.score
        ? groupes.filter((g) => g.reponses.some((r) => r.score_brut === Number(args.score)))
        : groupes;
    const sorted = filtered.sort((a, b) => new Date(b.date_reponse).getTime() - new Date(a.date_reponse).getTime());
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    const hasMore = start + pageSize < totalGroupes;
    // total = nombre d'AVIS (soumissions distinctes), plus le nombre de lignes
    return { avis: paginated, total: totalGroupes, hasMore, page, pageSize };
};
// ============================================================================
// EXPORT AVIS COMPLET (pour CSV — sans pagination, limité à 20 000 lignes)
// ============================================================================
export const exportAvisGroupes = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    // CONFIDENTIALITÉ MÉTIER (RG16/RG17 — Doc 08) : l'export est un chemin de
    // contournement classique — /avis bloqué mais export ouvert = verbatims
    // téléchargeables par la Direction. Même frontière que getReponses :
    // refus serveur explicite, sans exception.
    if (context.user.role === 'DIRECTION') {
        throw new HttpError(403, "L'export des avis détaillés est réservé aux chefs d'agence et auditeurs qualité. La Direction dispose des rapports consolidés.");
    }
    let scopeFilter;
    if (args.id_agence !== undefined) {
        const idAgence = requireNumber(args.id_agence, 'id_agence');
        await assertAgenceAccess(context, context.entities, idAgence, 'agence');
        scopeFilter = { id_agence: idAgence };
    }
    else {
        scopeFilter = await buildAgenceFilter(context, context.entities);
    }
    const whereClause = {
        ...scopeFilter,
        ...(args.id_guichet ? { id_guichet: args.id_guichet } : {}),
        ...(args.id_service ? { id_service: args.id_service } : {}),
    };
    if (args.startDate || args.endDate) {
        whereClause.date_reponse = {};
        if (args.startDate)
            whereClause.date_reponse.gte = new Date(args.startDate);
        if (args.endDate)
            whereClause.date_reponse.lte = new Date(args.endDate);
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
        const scores = g.reponses.map((r) => r.score_brut);
        const scoreMoyen = parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2));
        return {
            id_soumission: g.id_soumission ?? g.cle,
            date_reponse: premiere.date_reponse,
            guichet: premiere.guichet?.nom_guichet || '',
            agence: premiere.agence?.nom_agence || '',
            service: premiere.service?.libelle_service || '',
            agent: premiere.agent ? `${premiere.agent.prenom || ''} ${premiere.agent.nom || ''}`.trim() : '',
            score_moyen: scoreMoyen,
            commentaire: commentairesDeGroupe(g.reponses),
            criteres: g.reponses.map((r) => `${r.critere?.libelle_critere || 'Critère'}:${r.score_brut}`).join(' | '),
        };
    })
        .sort((a, b) => new Date(b.date_reponse).getTime() - new Date(a.date_reponse).getTime());
};
export const getAgentsByAgence = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const idAgence = requireNumber(args.id_agence, 'id_agence');
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    return context.entities.User.findMany({
        where: {
            id_agence: idAgence,
            role: { in: ['AGENT', 'CHEF_AGENCE'] },
        },
        select: { id: true, nom: true, prenom: true, role: true, email: true, telephone: true, actif: true },
        orderBy: [{ actif: 'desc' }, { role: 'asc' }, { nom: 'asc' }],
    });
};
// Liste les agences DE L'ENTREPRISE de l'utilisateur (DIRECTION/QUALITE
// uniquement) — jamais toutes les agences de la plateforme.
export const getAgences = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    if (context.user.role !== 'DIRECTION')
        return [];
    if (!context.user.id_entreprise)
        return [];
    return context.entities.Agence.findMany({
        where: { id_entreprise: context.user.id_entreprise, archive: false },
        select: { id: true, nom_agence: true, commune: true },
        orderBy: { id: 'asc' },
    });
};
export const getAlertes = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const filter = await buildAgenceFilter(context, context.entities);
    const idAgenceClause = filter.id_agence;
    // CONFIDENTIALITÉ MÉTIER (RG17 — Doc 08) : pour la DIRECTION, les alertes
    // ne contiennent JAMAIS la réponse brute imbriquée (verbatim, coordonnées).
    // Chemin de fuite classique : /avis bloqué mais /alertes → reponse → texte.
    // On réduit le payload selon le rôle — le chef d'agence conserve tout.
    const estDirection = context.user.role === 'DIRECTION';
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
            ...(estDirection
                ? { reponse: { select: { id: true, date_reponse: true, score_brut: true } } }
                : { reponse: true }),
        },
    });
};
// Catalogue = socle commun de la plateforme (id_entreprise NULL, ex. seed
// initial) + critères propres à l'entreprise de l'utilisateur. Une
// entreprise ne voit jamais les critères créés par une AUTRE entreprise.
export const getCriteres = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
export const getAgenceCriteres = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);
    const agenceCriteres = await context.entities.AgenceCritere.findMany({
        where: { id_agence: idAgence },
        select: { id_critere: true },
    });
    return agenceCriteres.map((ac) => ac.id_critere);
};
// Même principe que getCriteres : socle commun + services propres à
// l'entreprise de l'utilisateur.
export const getServices = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
// Résolution par code_public OPAQUE (Doc 11 §7) : le QR n'expose jamais
// l'ID séquentiel interne. On accepte aussi l'id numérique pour compatibilité
// avec les QR déjà imprimés — le code devient la voie normale.
export const getFormDefinitionForGuichet = async (args, context) => {
    if (!args.code_public && !args.id_guichet)
        return null;
    // PERFORMANCE QR (Doc 00-INDEX §4, E1) : select explicite au lieu d'include
    // « critere: true » entier. La page publique ne reçoit QUE les champs
    // qu'elle affiche : moins d'octets transférés, moins de sérialisation, et
    // surtout aucune fuite accidentelle de champs internes (id_entreprise,
    // archivage, etc.) sur une route publique sans authentification.
    const guichet = await context.entities.Guichet.findUnique({
        where: args.code_public
            ? { code_public: args.code_public.toUpperCase().trim() }
            : { id: Number(args.id_guichet) },
        select: {
            id: true,
            nom_guichet: true,
            actif: true,
            archive: true,
            id_agence: true,
            services: {
                orderBy: { id: 'asc' },
                select: {
                    id: true,
                    libelle_service: true,
                    criteresServices: {
                        orderBy: { ordre: 'asc' },
                        select: {
                            ordre: true,
                            critere: {
                                select: {
                                    id: true,
                                    libelle_critere: true,
                                    description: true,
                                    type_reponse: true,
                                    options_reponse: true,
                                    obligatoire: true,
                                    archive: true,
                                },
                            },
                        },
                    },
                },
            },
            agence: {
                select: {
                    archive: true,
                    id_entreprise: true,
                    agencesCriteres: {
                        orderBy: { id_critere: 'asc' },
                        select: {
                            id_critere: true,
                            critere: {
                                select: {
                                    id: true,
                                    libelle_critere: true,
                                    description: true,
                                    type_reponse: true,
                                    options_reponse: true,
                                    obligatoire: true,
                                    archive: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    // Un QR code ne doit jamais réactiver une collecte sur un guichet ou une
    // agence retirée du service. Cette query est publique, donc elle constitue
    // la première barrière côté client.
    if (!guichet || !guichet.actif || guichet.archive || guichet.agence.archive)
        return null;
    const brandingTenant = await context.entities.BrandingConfig.findUnique({
        where: { id_entreprise: guichet.agence.id_entreprise },
        select: {
            logo_url: true,
            nom_affiche: true,
            color_primary: true,
            color_secondary: true,
            color_accent: true,
            color_background: true,
            form_title: true,
            form_subtitle: true,
            form_thank_you: true,
            qr_slogan: true,
            hide_yeba_branding: true,
        },
    });
    // Fusion contrôlée : les champs null héritent du thème Yéba (BRANDING).
    // Aucune donnée autre que ces champs ne quitte le serveur.
    const brandConfig = brandingTenant
        ? {
            ...BRANDING,
            logo_url: brandingTenant.logo_url ?? BRANDING.logo_url,
            form_title: brandingTenant.form_title ?? BRANDING.form_title,
            form_subtitle: brandingTenant.form_subtitle ?? BRANDING.form_subtitle,
            form_thank_you: brandingTenant.form_thank_you ?? BRANDING.form_thank_you,
            qr_slogan: brandingTenant.qr_slogan ?? BRANDING.qr_slogan,
            ...(brandingTenant.color_primary ? { color_primary: brandingTenant.color_primary } : {}),
            ...(brandingTenant.color_secondary ? { color_secondary: brandingTenant.color_secondary } : {}),
            ...(brandingTenant.color_accent ? { color_accent: brandingTenant.color_accent } : {}),
            ...(brandingTenant.color_background ? { color_background: brandingTenant.color_background } : {}),
            hide_yeba_branding: brandingTenant.hide_yeba_branding,
        }
        : BRANDING;
    const agencyCriteres = guichet.agence.agencesCriteres
        .map((ac) => ac.critere)
        .filter((c) => c && !c.archive);
    const criteresActifsAgence = new Set(agencyCriteres.map((c) => c.id));
    const criteresDejaRattaches = new Set();
    return {
        guichetName: guichet.nom_guichet,
        id_agence: guichet.id_agence,
        services: guichet.services.map((s) => ({
            id: s.id,
            libelle_service: s.libelle_service,
            criteres: s.criteresServices.filter((cs) => {
                if (cs.critere?.archive === true)
                    return false;
                // Désactiver un critère pour l'agence doit le retirer de tous les
                // formulaires, y compris lorsqu'il était déjà placé dans une opération.
                if (!criteresActifsAgence.has(cs.id_critere))
                    return false;
                if (criteresDejaRattaches.has(cs.id_critere))
                    return false;
                criteresDejaRattaches.add(cs.id_critere);
                return true;
            }).map((cs) => cs.critere),
        })),
        agencyCriteres: agencyCriteres,
        // BRANDING TENANT : fusion contrôlée guichet → entreprise → défaut Yéba
        // (calculée plus haut). Aucune donnée interne ne quitte le serveur.
        brandConfig,
    };
};
// ============================================================================
// Vue "todo" des questions par opération (glisser-déposer)
// ============================================================================
// Alimente le tableau de type Kanban de ConfigurationCriteresPage : une
// colonne par opération (avec ses questions déjà rattachées, triées par
// `ordre`), plus le vivier des questions encore "non assignées" à aucune
// opération.
export const getCriteresParOperation = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
    const activeIds = new Set(agenceCriteres.map((ac) => ac.id_critere));
    const assignedIds = new Set(services.flatMap((s) => s.criteresServices.map((cs) => cs.id_critere)));
    // Les anciennes données pouvaient contenir le même critère dans plusieurs
    // opérations alors que l'éditeur le déplace comme une carte unique. On
    // présente une seule carte (la première opération par ordre stable) pour
    // éviter doublons et déplacements ambigus ; le prochain déplacement remet
    // automatiquement les rattachements en cohérence.
    const criteresDejaPlaces = new Set();
    return {
        operations: services.map((s) => ({
            id: s.id,
            libelle_service: s.libelle_service,
            criteres: s.criteresServices
                .filter((cs) => {
                if (criteresDejaPlaces.has(cs.id_critere))
                    return false;
                criteresDejaPlaces.add(cs.id_critere);
                return true;
            })
                .map((cs) => ({
                ...cs.critere,
                actif: activeIds.has(cs.critere.id),
            })),
        })),
        // Questions encore rattachées à aucune opération : le vivier de gauche
        // dans lequel on pioche pour glisser une question vers une colonne.
        nonAssignees: criteres
            .filter((c) => !assignedIds.has(c.id))
            .map((c) => ({ ...c, actif: activeIds.has(c.id) })),
    };
};
export const getRadarStats = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const scope = await resolveAgenceScope(context, context.entities, args.id_agence);
    const idAgence = scope.id_agence;
    const activeGuichets = await context.entities.Guichet.findMany({
        where: { id_agence: idAgence, actif: true },
    });
    const totalGuichetsCount = activeGuichets.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const assignmentsToday = await context.entities.AffectationGuichet.findMany({
        where: {
            id_guichet: { in: activeGuichets.map((g) => g.id) },
            date_affectation: new Date(todayStr),
        },
        select: { id_guichet: true },
    });
    const uniquePlannedGuichets = new Set(assignmentsToday.map((a) => a.id_guichet)).size;
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
export const getObjectifs = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const scope = await resolveAgenceScope(context, context.entities, args.id_agence);
    const objectifs = await context.entities.Objectif.findMany({
        where: { id_agence: scope.id_agence },
        include: { critere: true },
        orderBy: { id_critere: 'asc' },
    });
    const now = new Date();
    // PERFORMANCE (fix N+1 — point 10 de l'audit) : l'ancienne version lançait
    // UNE requête Reponse PAR objectif. Avec N objectifs c'était N allers-
    // retours sous charge. On charge maintenant les lignes de TOUS les
    // objectifs en UNE requête bornée à l'agence + fenêtres des objectifs,
    // puis on regroupe en mémoire.
    const fenetres = objectifs.map((obj) => ({
        id_critere: obj.id_critere,
        date_reponse: {
            gte: obj.date_debut,
            lte: obj.date_fin < now ? obj.date_fin : now,
        },
    }));
    const reponses = fenetres.length > 0
        ? await context.entities.Reponse.findMany({
            where: {
                id_agence: scope.id_agence,
                OR: fenetres,
            },
            select: {
                id_critere: true,
                date_reponse: true,
                score_brut: true,
                critere: { select: { type_reponse: true, options_reponse: true } },
            },
        })
        : [];
    // Regroupement en mémoire par objectif (critère + fenêtre applicable)
    const repParObjectif = new Map();
    for (const obj of objectifs) {
        const finEffective = obj.date_fin < now ? obj.date_fin : now;
        const lignes = reponses.filter((r) => r.id_critere === obj.id_critere &&
            r.date_reponse >= obj.date_debut && r.date_reponse <= finEffective);
        repParObjectif.set(obj.id, lignes);
    }
    // Un objectif seul ("cible 85%") ne dit rien sans le réalisé en face :
    // on calcule ici le score réellement obtenu sur la période de l'objectif
    // pour que le dashboard affiche directement "Atteint" / "En retard".
    return objectifs.map((obj) => {
        const reponsesObj = repParObjectif.get(obj.id) || [];
        const nb = reponsesObj.length;
        const cible_pct = parseFloat(Number(obj.valeur_cible).toFixed(1));
        let realise_pct = null;
        let ecart = null;
        let statut = 'PAS_DE_DONNEES';
        if (nb > 0) {
            const scores = reponsesObj
                .map((reponse) => scoreNormaliseSur5(reponse))
                .filter((score) => score !== null);
            if (scores.length === 0) {
                return { ...obj, nb_avis: nb, cible_pct, realise_pct, ecart, statut };
            }
            const moyenne = scores.reduce((s, score) => s + score, 0) / scores.length;
            realise_pct = parseFloat(((moyenne / 5) * 100).toFixed(1));
            ecart = parseFloat((realise_pct - cible_pct).toFixed(1));
            statut = ecart >= 0 ? 'ATTEINT' : 'EN_RETARD';
        }
        return { ...obj, nb_avis: nb, cible_pct, realise_pct, ecart, statut };
    });
};
// ============================================================================
// TÂCHES CORRECTIVES (Module 5 — Amélioration)
// ============================================================================
export const getTachesCorrectives = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const filter = await buildAgenceFilter(context, context.entities);
    // CONFIDENTIALITÉ MÉTIER (RG17 — Doc 08) : pour la DIRECTION, la réponse
    // imbriquée dans alerte → reponse ne doit contenir ni verbatim ni
    // coordonnées. Même frontière que getAlertes — le chemin alternatif
    // /taches → alerte → reponse → texte est fermé aussi.
    const estDirection = context.user.role === 'DIRECTION';
    const alertes = await context.entities.Alerte.findMany({
        where: {
            OR: [
                { guichet: { id_agence: filter.id_agence } },
                { reponse: { id_agence: filter.id_agence } },
            ],
        },
        select: { id: true },
    });
    const alerteIds = alertes.map((a) => a.id);
    return context.entities.TacheCorrective.findMany({
        where: { id_alerte: { in: alerteIds }, archive: false },
        orderBy: { date_creation: 'desc' },
        include: {
            alerte: {
                include: {
                    guichet: true,
                    ...(estDirection
                        ? { reponse: { select: { id: true, date_reponse: true, score_brut: true } } }
                        : { reponse: true }),
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
// CONFIDENTIALITÉ (RG16/RG17) : dans les archives, la réponse imbriquée
// expose commentaire_texte à quiconque a include: true. Pour la DIRECTION
// on ne livre que les métadonnées (id, date, score) — jamais le verbatim.
function reponsePourArchives(context) {
    if (context.user.role === 'DIRECTION') {
        return { select: { id: true, date_reponse: true, score_brut: true } };
    }
    return true; // CHEF_AGENCE : accès complet à son périmètre
}
export const getArchives = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
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
            include: { guichet: { include: { agence: { select: { nom_agence: true } } } }, reponse: reponsePourArchives(context) },
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
                alerte: { include: { guichet: { include: { agence: { select: { nom_agence: true } } } }, reponse: reponsePourArchives(context) } },
                responsable: { select: { id: true, nom: true, prenom: true } },
            },
            orderBy: { date_archivage: 'desc' },
        }),
    ]);
    // Les agences archivées ne concernent que la direction/qualité (les chefs
    // d'agence ne gèrent pas le réseau d'agences lui-même).
    const agences = context.user.role === 'DIRECTION'
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
export const getAffectationsDuJour = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
export const getTendanceMensuelle = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
    const moisMap = new Map();
    for (const r of reponses) {
        const d = new Date(r.date_reponse);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!moisMap.has(key))
            moisMap.set(key, []);
        moisMap.get(key).push(r);
    }
    return Array.from(moisMap.entries()).map(([key, reponsesDuMois]) => {
        const [annee, mois] = key.split('-');
        const scoresParAvis = scoreMoyenParAvis(reponsesDuMois);
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
export const getStatsByAgent = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const scope = await resolveAgenceScope(context, context.entities, args?.id_agence);
    const idAgence = scope.id_agence;
    const nbJours = Number.isFinite(args?.nbJours)
        ? Math.min(365, Math.max(1, Math.round(args.nbJours)))
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
            id_agent: { in: agents.map((a) => a.id) },
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
    const reponsesParAgent = new Map();
    for (const r of reponses) {
        if (!r.id_agent)
            continue;
        if (!reponsesParAgent.has(r.id_agent))
            reponsesParAgent.set(r.id_agent, []);
        reponsesParAgent.get(r.id_agent).push(r);
    }
    const stats = agents.map((agent) => {
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
    return stats.filter((s) => s.nb_avis > 0).sort((a, b) => b.score_moyen - a.score_moyen);
};
// ============================================================================
// CLASSEMENT PAR GUICHET (drill-down "où est le problème")
// ============================================================================
// Trié du PIRE au MEILLEUR volontairement : sur un dashboard de pilotage,
// l'utilisateur doit repérer en priorité les points faibles, pas se
// féliciter des meilleurs scores en premier.
export const getStatsByGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const scope = await resolveAgenceScope(context, context.entities, args?.id_agence);
    const nbJours = Number.isFinite(args?.nbJours)
        ? Math.min(365, Math.max(1, Math.round(args.nbJours)))
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
            id_guichet: { in: guichets.map((g) => g.id) },
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
    const reponsesParGuichet = new Map();
    for (const r of reponses) {
        if (!reponsesParGuichet.has(r.id_guichet))
            reponsesParGuichet.set(r.id_guichet, []);
        reponsesParGuichet.get(r.id_guichet).push(r);
    }
    const stats = guichets.map((g) => {
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
    return stats.filter((s) => s.nb_avis > 0).sort((a, b) => a.score_moyen - b.score_moyen);
};
// ============================================================================
// ACTIONS PRIORITAIRES ("quoi faire aujourd'hui" — bandeau haut de dashboard)
// ============================================================================
// Regroupe et priorise ce qui exige une action humaine immédiate : alertes
// jamais traitées + tâches correctives dont l'échéance est dépassée. Un
// dashboard décisionnel doit répondre à "qu'est-ce que je traite en premier"
// avant même d'afficher des courbes.
export const getActionsPrioritaires = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
        alertesNouvelles: alertesNouvelles.map((a) => ({
            id: a.id.toString(),
            message: a.message,
            type_alerte: a.type_alerte,
            date_creation: a.date_creation,
            guichet: a.guichet?.nom_guichet || a.reponse?.critere?.libelle_critere || null,
            gravite: a.type_alerte === 'NOTE_CRITIQUE' || a.type_alerte === 'IA_URGENCE' ? 'HAUTE' : 'MOYENNE',
        })),
        tachesEnRetard: tachesEnRetard.map((t) => ({
            id: t.id.toString(),
            titre: t.titre,
            date_echeance: t.date_echeance,
            responsable: t.responsable ? `${t.responsable.prenom} ${t.responsable.nom}` : 'Non assigné',
            guichet: t.alerte?.guichet?.nom_guichet || null,
            joursRetard: Math.max(0, Math.floor((now.getTime() - new Date(t.date_echeance).getTime()) / (1000 * 60 * 60 * 24))),
        })),
    };
};
// ============================================================================
// KPIs AVEC COMPARAISON DE PÉRIODE (30 derniers jours vs 30 jours précédents)
// ============================================================================
// Un KPI seul ("satisfaction 78%") ne permet aucune décision. Ce qui compte,
// c'est la direction : est-ce mieux ou moins bien qu'avant ?
export const getKPIsPeriode = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const filter = await buildAgenceFilter(context, context.entities);
    // Fenêtre glissante configurable (7 / 30 / 90 jours...) — 30 par défaut
    // pour rester compatible avec les appels existants qui ne passent aucun
    // argument. On borne à [1, 365] pour éviter un scan complet de la table
    // sur une valeur farfelue envoyée par le client.
    const nbJoursDemandes = args?.nbJours;
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
    const calc = (list) => {
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
    const deltaPoints = (a, b) => parseFloat((a - b).toFixed(1));
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
export const getTempsTraitement = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const filter = await buildAgenceFilter(context, context.entities);
    const idAgenceClause = filter.id_agence;
    const nbJoursDemandes = args?.nbJours;
    const nbJours = Number.isFinite(nbJoursDemandes)
        ? Math.min(365, Math.max(1, Math.round(nbJoursDemandes)))
        : 30;
    const now = new Date();
    const debutActuel = new Date(now);
    debutActuel.setDate(debutActuel.getDate() - nbJours);
    const debutPrecedent = new Date(debutActuel);
    debutPrecedent.setDate(debutPrecedent.getDate() - nbJours);
    const dureeMoyenneHeures = (items) => {
        if (items.length === 0)
            return null;
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
    const priseEnChargeActuelle = dureeMoyenneHeures(alertesActuelles.map((a) => ({ debut: new Date(a.date_creation), fin: new Date(a.date_traitement) })));
    const priseEnChargePrecedente = dureeMoyenneHeures(alertesPrecedentes.map((a) => ({ debut: new Date(a.date_creation), fin: new Date(a.date_traitement) })));
    const resolutionActuelle = dureeMoyenneHeures(tachesActuelles.map((t) => ({ debut: new Date(t.date_creation), fin: new Date(t.date_cloture) })));
    const resolutionPrecedente = dureeMoyenneHeures(tachesPrecedentes.map((t) => ({ debut: new Date(t.date_creation), fin: new Date(t.date_cloture) })));
    const deltaHeures = (a, b) => a === null || b === null ? null : parseFloat((a - b).toFixed(1));
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
// COMPARAISON INTER-AGENCES (DIRECTION/QUALITE uniquement)
// Scores de satisfaction par agence sur la période — c'est LA vue qui
// différencie le pilotage d'entreprise du pilotage d'agence : la DIRECTION
// voit quelle agence décroche, le chef d'agence ne voit que la sienne
// (buildAgenceFilter limite de toute façon à son id_agence).
// Règle « avis = 1 soumission » respectée (scoreMoyenParAvis).
// ============================================================================
export const getComparaisonAgences = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    // Réservé aux rôles à portée entreprise — un chef d'agence n'a pas à
    // comparer les autres agences (et buildAgenceFilter le limiterait à la sienne).
    if (context.user.role === 'CHEF_AGENCE' || context.user.role === 'AGENT') {
        throw new HttpError(403, "La comparaison inter-agences est réservée à la Direction et à la Qualité.");
    }
    const nbJoursDemandes = args?.nbJours;
    const nbJours = Number.isFinite(nbJoursDemandes)
        ? Math.min(365, Math.max(1, Math.round(nbJoursDemandes)))
        : 30;
    const debut = new Date();
    debut.setDate(debut.getDate() - nbJours);
    const agences = await context.entities.Agence.findMany({
        where: { id_entreprise: context.user.id_entreprise, archive: false },
        select: { id: true, nom_agence: true, commune: true },
        orderBy: { nom_agence: 'asc' },
    });
    const reponses = await context.entities.Reponse.findMany({
        where: {
            agence: { id_entreprise: context.user.id_entreprise, archive: false },
            date_reponse: { gte: debut },
        },
        select: {
            id: true,
            id_soumission: true,
            score_brut: true,
            date_reponse: true,
            id_agence: true,
            critere: { select: { type_reponse: true, options_reponse: true } },
        },
    });
    // Grouper par agence puis par soumission (score moyen par avis)
    const parAgence = new Map();
    for (const a of agences) {
        parAgence.set(a.id, { nom: a.nom_agence, commune: a.commune ?? '', scoresParAvis: [], nbLignes: 0 });
    }
    const parSoumission = new Map();
    for (const rep of reponses) {
        const cle = rep.id_soumission ?? `_${rep.id}`;
        if (!parSoumission.has(cle))
            parSoumission.set(cle, { id_agence: rep.id_agence, scores: [] });
        const score = scoreNormaliseSur5(rep);
        if (score !== null)
            parSoumission.get(cle).scores.push(score);
    }
    for (const { id_agence, scores } of parSoumission.values()) {
        const agence = parAgence.get(id_agence);
        if (!agence || scores.length === 0)
            continue;
        agence.scoresParAvis.push(scores.reduce((s, v) => s + v, 0) / scores.length);
        agence.nbLignes++;
    }
    const resultats = Array.from(parAgence.entries()).map(([id, a]) => {
        const nbAvis = a.scoresParAvis.length;
        const moyenne = nbAvis > 0 ? a.scoresParAvis.reduce((s, v) => s + v, 0) / nbAvis : null;
        const satisfaits = a.scoresParAvis.filter((v) => v >= 4).length;
        return {
            id_agence: id,
            nom_agence: a.nom,
            commune: a.commune,
            nb_avis: nbAvis,
            score_moyen: moyenne !== null ? parseFloat(moyenne.toFixed(2)) : null,
            taux_satisfaction: nbAvis > 0 ? Math.round((satisfaits / nbAvis) * 100) : null,
        };
    });
    // Tri : meilleures moyennes d'abord (les null en dernier)
    resultats.sort((a, b) => (b.score_moyen ?? -1) - (a.score_moyen ?? -1));
    const avecScores = resultats.filter((r) => r.score_moyen !== null);
    return {
        nb_jours: nbJours,
        agences: resultats,
        meilleure_agence: avecScores[0]?.nom_agence ?? null,
        agence_a_surveiller: avecScores.length > 1 ? avecScores[avecScores.length - 1].nom_agence : null,
        moyenne_globale: avecScores.length > 0
            ? parseFloat((avecScores.reduce((s, r) => s + (r.score_moyen ?? 0), 0) / avecScores.length).toFixed(2))
            : null,
    };
};
// ============================================================================
// HEATMAP DES AVIS PAR JOUR / HEURE
// Répond à "à quel moment mes clients sont-ils le plus mécontents ?" — sert
// à ajuster les effectifs (renfort un vendredi après-midi si c'est le
// créneau qui concentre les mauvaises notes, par ex.). Agrégation simple sur
// Reponse.date_reponse, pas de nouvelle donnée nécessaire.
// ============================================================================
const JOURS_SEMAINE_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const getHeatmapReponses = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const scope = await resolveAgenceScope(context, context.entities, args?.id_agence);
    const nbJoursDemandes = args?.nbJours;
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
    const parSoumission = new Map();
    for (const r of reponses) {
        const cle = r.id_soumission ?? `_${r.id}`;
        if (!parSoumission.has(cle)) {
            parSoumission.set(cle, { date: new Date(r.date_reponse), scores: [] });
        }
        const score = scoreNormaliseSur5(r);
        if (score !== null)
            parSoumission.get(cle).scores.push(score);
    }
    // Grille complète 7 jours x 24h initialisée à zéro, pour que le front
    // n'ait pas à gérer les créneaux sans aucun avis.
    const grille = new Map();
    for (let jour = 0; jour < 7; jour++) {
        for (let heure = 0; heure < 24; heure++) {
            grille.set(`${jour}-${heure}`, { nb: 0, sommeScores: 0, nbScores: 0 });
        }
    }
    for (const { date, scores } of parSoumission.values()) {
        const jour = date.getDay();
        const heure = date.getHours();
        const cellule = grille.get(`${jour}-${heure}`);
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
export const getTacheHistorique = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const idTache = requireNumber(args.id_tache, 'id_tache');
    // Vérifier que la tâche appartient bien à l'agence de l'appelant
    const tache = await context.entities.TacheCorrective.findUnique({
        where: { id: BigInt(idTache) },
        include: { alerte: { include: { guichet: true, reponse: true } } },
    });
    if (!tache)
        throw new HttpError(404, 'Tâche introuvable.');
    // Même règle que updateStatutTache : un profil de gestion peut consulter
    // l'historique de n'importe quelle tâche de son périmètre, un AGENT
    // seulement celui des tâches qui lui sont assignées.
    if (tache.id_responsable !== context.user.id) {
        requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    }
    const idAgence = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
    if (!idAgence)
        throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
    await assertAgenceAccess(context, context.entities, idAgence, 'tâche');
    const historique = await context.entities.TacheCorrectiveHistorique.findMany({
        where: { id_tache: BigInt(idTache) },
        orderBy: { date_action: 'asc' },
        include: {
            auteur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        },
    });
    return historique.map((h) => ({
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
export const getObjectifsParAgence = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
    const agencesIds = agences.map((a) => a.id);
    // PERFORMANCE (fix N+1) : l'ancienne version lançait UNE requête Reponse
    // PAR objectif (agences × objectifs = centaines de round-trips sur une
    // base mature). On charge maintenant les agrégats de TOUTES les agences de
    // l'entreprise en UNE requête groupée, puis on joint en mémoire.
    const objectifs = await context.entities.Objectif.findMany({
        where: { id_agence: { in: agencesIds } },
        include: { critere: true },
        orderBy: { id_critere: 'asc' },
    });
    // Agrégat SQL : { id_agence, id_critere } → moyenne + nombre. Plus aucun
    // chargement de lignes Reponse vers Node — PostgreSQL fait le travail.
    const agregats = await context.entities.Reponse.groupBy({
        by: ['id_agence', 'id_critere'],
        where: {
            id_agence: { in: agencesIds },
            OR: objectifs.map((obj) => ({
                id_critere: obj.id_critere,
                id_agence: obj.id_agence,
                date_reponse: {
                    gte: obj.date_debut,
                    lte: obj.date_fin < now ? obj.date_fin : now,
                },
            })),
        },
        _avg: { score_brut: true },
        _count: { id: true },
    });
    const agregatKey = (idAgence, idCritere) => `${idAgence}:${idCritere}`;
    const agregatMap = new Map(agregats.map((g) => [agregatKey(g.id_agence, g.id_critere), g]));
    return agences.map((agence) => {
        const objectifsAgence = objectifs.filter((obj) => obj.id_agence === agence.id);
        const objectifsAvecStatut = objectifsAgence.map((obj) => {
            const cible_pct = parseFloat(Number(obj.valeur_cible).toFixed(1));
            const g = agregatMap.get(agregatKey(agence.id, obj.id_critere));
            const nb = g?._count?.id ?? 0;
            let realise_pct = null;
            let ecart = null;
            let statut = 'PAS_DE_DONNEES';
            if (nb > 0 && g?._avg?.score_brut != null) {
                const moyenne = g._avg.score_brut;
                realise_pct = parseFloat(((moyenne / 5) * 100).toFixed(1));
                ecart = parseFloat((realise_pct - cible_pct).toFixed(1));
                statut = ecart >= 0 ? 'ATTEINT' : 'EN_RETARD';
            }
            return { ...obj, nb_avis: nb, cible_pct, realise_pct, ecart, statut };
        });
        return {
            agence,
            objectifs: objectifsAvecStatut,
        };
    });
};
// ============================================================================
// RECHERCHE GLOBALE (palette de commandes Ctrl+K)
// Interroge plusieurs entités en une fois (agences, guichets, agents, avis)
// — voir l'analyse UX : ce n'est pas juste un champ texte en façade, c'est
// une vraie requête backend multi-entités, respectant le même périmètre de
// données (RLS) que le reste de l'app.
// ============================================================================
export const getRechercheGlobale = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const q = (args?.q ?? '').trim();
    // Sous 2 caractères, une recherche "contains" sur plusieurs tables ne
    // renvoie que du bruit — on ne lance pas la requête tant que ce n'est pas
    // atteint (protège aussi la base d'un scan sur chaque frappe).
    if (q.length < 2) {
        return { agences: [], guichets: [], agents: [], avis: [] };
    }
    const filter = await buildAgenceFilter(context, context.entities);
    const idAgenceClause = filter.id_agence;
    const contains = { contains: q, mode: 'insensitive' };
    const peutVoirAgences = context.user.role === 'DIRECTION';
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
        agences: agences.map((a) => ({ id: a.id, nom_agence: a.nom_agence, commune: a.commune })),
        guichets: guichets.map((g) => ({
            id: g.id,
            nom_guichet: g.nom_guichet,
            id_agence: g.id_agence,
            nom_agence: g.agence?.nom_agence ?? null,
        })),
        agents: agents.map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, id_agence: u.id_agence })),
        // CONFIDENTIALITÉ MÉTIER (RG17) : la recherche globale est un 4e chemin
        // vers les verbatims (Ctrl+K → "temps d'attente" → avis bruts). Pour la
        // DIRECTION : aucun résultat d'avis, uniquement entités organisationnelles.
        avis: context.user.role === 'DIRECTION'
            ? []
            : avis.map((r) => ({
                id: r.id.toString(),
                commentaire_texte: r.commentaire_texte,
                score_brut: r.score_brut,
                date_reponse: r.date_reponse,
                guichet: r.guichet?.nom_guichet ?? null,
            })),
    };
};
export const getAIStatus = async (_args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const usingDeepseek = process.env.AI_PROVIDER === 'deepseek';
    const hasApiKey = !!((usingDeepseek ? process.env.DEEPSEEK_API_KEY : process.env.OPENROUTER_API_KEY) ?? '').trim();
    const baseUrl = usingDeepseek
        ? process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
        : process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const model = usingDeepseek
        ? process.env.DEEPSEEK_MODEL || 'deepseek-chat'
        : process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';
    const [totalAnalyses, doneAnalyses, pendingAnalyses, failedAnalyses] = await Promise.all([
        context.entities.AnalyseAvisIA.count(),
        context.entities.AnalyseAvisIA.count({ where: { status: 'DONE' } }),
        context.entities.AnalyseAvisIA.count({ where: { status: 'PENDING' } }),
        context.entities.AnalyseAvisIA.count({ where: { status: 'FAILED' } }),
    ]);
    return {
        configured: hasApiKey,
        provider: usingDeepseek ? 'DeepSeek' : 'OpenRouter',
        model,
        baseUrl,
        stats: {
            total: totalAnalyses,
            done: doneAnalyses,
            pending: pendingAnalyses,
            failed: failedAnalyses,
        },
    };
};
// Agrégation des thèmes récurrents sur les avis analysés (valeur entreprise :
// « de quoi se plaignent nos clients ? »). Les thèmes sont stockés en JSON
// dans AnalyseAvisIA.themes ; on les parse et on les compte côté serveur.
export const getThemesStats = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const nbJours = args?.nbJours ?? 90;
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - nbJours);
    // SÉCURITÉ MULTI-TENANT CRITIQUE : les thèmes IA doivent être calculés
    // UNIQUEMENT sur l'entreprise de l'utilisateur. L'ancienne version agrégeait
    // TOUTES les analyses de la plateforme — fuite cross-tenant (les thèmes
    // d'une entreprise remontaient chez une autre). On passe par
    // reponse → agence → id_entreprise via buildAgenceFilter.
    const filter = await buildAgenceFilter(context, context.entities);
    const analyses = await context.entities.AnalyseAvisIA.findMany({
        where: {
            status: 'DONE',
            themes: { not: null },
            processedAt: { gte: depuis },
            reponse: { id_agence: filter.id_agence },
        },
        select: { themes: true },
    });
    const counts = {};
    for (const a of analyses) {
        try {
            const themes = JSON.parse(a.themes);
            if (Array.isArray(themes)) {
                for (const t of themes) {
                    if (typeof t === 'string')
                        counts[t] = (counts[t] || 0) + 1;
                }
            }
        }
        catch {
            // thème mal formé — ignoré
        }
    }
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    const topThemes = Object.entries(counts)
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count);
    return { total, topThemes };
};
