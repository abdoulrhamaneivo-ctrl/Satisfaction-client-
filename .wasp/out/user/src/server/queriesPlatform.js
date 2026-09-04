// src/server/queriesPlatform.ts
// ============================================================================
// Queries SaaS — Console Yeba Platform (Doc 12). Agrégats et méta-données
// UNIQUEMENT : aucune query ne renvoie de verbatim ni de coordonnée client
// (Doc 11 §7 — la protection est l'absence d'API).
// Toutes exigent requirePlatformRole : SUPER_ADMIN ou SUPPORT en lecture.
// ============================================================================
import { HttpError } from 'wasp/server';
import { requirePlatformRole } from './middleware/rowLevelSecurity';
const PAGE_SIZE = 20;
// ─────────────────────────────────────────────
// getPlatformOverview — KPI globaux de la console
// ─────────────────────────────────────────────
export const getPlatformOverview = async (_args, context) => {
    requirePlatformRole(context, ['SUPER_ADMIN', 'SUPPORT']);
    // MÉTRIQUE MÉTIER (audit P3) : « avis collectés » = nombre de SOUMISSIONS
    // (id_soumission distincts), PAS de lignes Reponse. Un questionnaire à
    // 5 critères produit 5 lignes Reponse pour 1 seul avis — compter les lignes
    // surcomptait ×5. groupBy + count des groupes = COUNT(DISTINCT) équivalent
    // sans requête SQL brute.
    const [total, parStatut, totalUsers, soumissionnaires, recentes] = await Promise.all([
        context.entities.Entreprise.count(),
        context.entities.Entreprise.groupBy({ by: ['status'], _count: true }),
        context.entities.User.count({ where: { id_entreprise: { not: null } } }),
        context.entities.Reponse.groupBy({ by: ['id_soumission'] }),
        context.entities.Entreprise.findMany({
            orderBy: { date_creation_compte: 'desc' },
            take: 5,
            select: {
                id: true, nom_entreprise: true, nom_court: true, status: true, plan: true,
                date_creation_compte: true, email_administratif: true,
            },
        }),
    ]);
    const parStatutMap = {};
    for (const g of parStatut)
        parStatutMap[g.status] = g._count;
    // Évolution des créations d'entreprises sur 12 mois — agrégation
    // PostgreSQL (GROUP BY mois via groupBy sur les champs date n'existant
    // pas nativement, on ne ramène QUE les dates, payload minimal, et le
    // bucketing mensuel reste O(12) côté Node sur des entiers de dates).
    const depuis12Mois = new Date();
    depuis12Mois.setMonth(depuis12Mois.getMonth() - 11);
    depuis12Mois.setDate(1);
    depuis12Mois.setHours(0, 0, 0, 0);
    const creations = await context.entities.Entreprise.findMany({
        where: { date_creation_compte: { gte: depuis12Mois } },
        select: { date_creation_compte: true },
    });
    const evolution = [];
    const cursor = new Date(depuis12Mois);
    for (let i = 0; i < 12; i++) {
        const label = cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const debut = new Date(cursor);
        const fin = new Date(cursor);
        fin.setMonth(fin.getMonth() + 1);
        evolution.push({
            mois: label,
            count: creations.filter((c) => c.date_creation_compte >= debut && c.date_creation_compte < fin).length,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return {
        entreprises_total: total,
        entreprises_actives: (parStatutMap['ACTIVE'] ?? 0) + (parStatutMap['TRIAL'] ?? 0),
        entreprises_suspendues: parStatutMap['SUSPENDED'] ?? 0,
        utilisateurs: totalUsers,
        avis_collectes: soumissionnaires.length, // soumissions distinctes, pas lignes
        evolution,
        recentes,
    };
};
// ─────────────────────────────────────────────
// getPlatformEntreprises — liste filtrable/paginée
// ─────────────────────────────────────────────
export const getPlatformEntreprises = async (args, context) => {
    requirePlatformRole(context, ['SUPER_ADMIN', 'SUPPORT']);
    const where = {};
    if (args.search?.trim()) {
        const q = args.search.trim();
        where.OR = [
            { nom_entreprise: { contains: q, mode: 'insensitive' } },
            { nom_court: { contains: q, mode: 'insensitive' } },
            { email_administratif: { contains: q, mode: 'insensitive' } },
        ];
    }
    if (args.status && ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].includes(args.status)) {
        where.status = args.status;
    }
    if (args.plan && ['STARTER', 'BUSINESS', 'ENTERPRISE'].includes(args.plan)) {
        where.plan = args.plan;
    }
    const entreprises = await context.entities.Entreprise.findMany({
        where,
        orderBy: { date_creation_compte: 'desc' },
        take: PAGE_SIZE + 1,
        ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
        select: {
            id: true,
            nom_entreprise: true,
            nom_court: true,
            email_administratif: true,
            status: true,
            plan: true,
            date_creation_compte: true,
            limite_agences: true,
            limite_utilisateurs: true,
            _count: { select: { agences: true, utilisateurs: true } },
        },
    });
    const hasMore = entreprises.length > PAGE_SIZE;
    const page = hasMore ? entreprises.slice(0, PAGE_SIZE) : entreprises;
    return {
        entreprises: page,
        hasMore,
        nextCursor: hasMore ? page[page.length - 1].id : null,
    };
};
// ─────────────────────────────────────────────
// getPlatformEntreprise — détail d'un tenant
// ─────────────────────────────────────────────
export const getPlatformEntreprise = async (args, context) => {
    requirePlatformRole(context, ['SUPER_ADMIN', 'SUPPORT']);
    const entreprise = await context.entities.Entreprise.findUnique({
        where: { id: args.id },
        select: {
            id: true,
            nom_entreprise: true,
            nom_court: true,
            email_administratif: true,
            telephone: true,
            pays: true,
            status: true,
            plan: true,
            date_creation_compte: true,
            date_debut_abonnement: true,
            limite_agences: true,
            limite_utilisateurs: true,
            limite_guichets: true,
            suspendue_le: true,
            motif_suspension: true,
            _count: { select: { agences: true, utilisateurs: true } },
        },
    });
    if (!entreprise)
        throw new HttpError(404, 'Entreprise introuvable.');
    // Comptage guichets via agences (relation Guichet→Agence)
    const agencesIds = await context.entities.Agence.findMany({
        where: { id_entreprise: args.id },
        select: { id: true },
    });
    const totalGuichets = await context.entities.Guichet.count({
        where: { id_agence: { in: agencesIds.map((a) => a.id) } },
    });
    // Admin principal (premier DIRECTION)
    const admin = await context.entities.User.findFirst({
        where: { id_entreprise: args.id, role: 'DIRECTION' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, nom: true, prenom: true, mustChangePassword: true, createdAt: true },
    });
    // Volume d'avis (MÉTRIQUE MÉTIER P3 : soumissions distinctes — voir
    // getPlatformOverview pour la justification ; Reponse.count() surcomptait
    // chaque critère comme un avis).
    const soumissions = await context.entities.Reponse.groupBy({
        by: ['id_soumission'],
        where: { id_agence: { in: agencesIds.map((a) => a.id) } },
    });
    const totalAvis = soumissions.length;
    // Invitation active pour l'admin ? (jamais activé)
    let invitationActive = false;
    if (admin?.mustChangePassword) {
        const inv = await context.entities.Invitation.findFirst({
            where: { id_user: admin.id, used_at: null, expires_at: { gt: new Date() } },
            select: { id: true },
        });
        invitationActive = !!inv;
    }
    // Activité récente (audit)
    const activite = await context.entities.AuditLog.findMany({
        where: { entreprise_id: args.id },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: { id: true, action: true, resource: true, created_at: true, actor_role: true, details: true },
    });
    return { ...entreprise, total_guichets: totalGuichets, total_avis: totalAvis, admin, invitation_active: invitationActive, activite };
};
// ─────────────────────────────────────────────
// getPlatformAudit — journal filtrable
// ─────────────────────────────────────────────
export const getPlatformAudit = async (args, context) => {
    requirePlatformRole(context, ['SUPER_ADMIN', 'SUPPORT']);
    const where = {};
    if (args.entreprise_id)
        where.entreprise_id = args.entreprise_id;
    if (args.action)
        where.action = args.action;
    const logs = await context.entities.AuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: PAGE_SIZE + 1,
        ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
        select: {
            id: true, action: true, resource: true, resource_id: true,
            actor_role: true, entreprise_id: true, details: true, ip: true, created_at: true,
            acteur: { select: { email: true, nom: true, prenom: true } },
        },
    });
    const hasMore = logs.length > PAGE_SIZE;
    const page = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
    return { logs: page, hasMore, nextCursor: hasMore ? page[page.length - 1].id : null };
};
// ─────────────────────────────────────────────
// getPlatformMe — identité platform du connecté (garde front PlatformShell)
// ─────────────────────────────────────────────
export const getPlatformMe = async (_args, context) => {
    requirePlatformRole(context, ['SUPER_ADMIN', 'SUPPORT']);
    return {
        platformRole: context.user.platformRole,
        email: context.user.email,
        nom: context.user.nom,
        prenom: context.user.prenom,
    };
};
