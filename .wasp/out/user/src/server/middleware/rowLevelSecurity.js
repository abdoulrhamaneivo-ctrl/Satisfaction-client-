// src/server/middleware/rowLevelSecurity.ts
// ============================================================================
// Row-Level Security (RLS) — Isolation multi-tenant Yeba
// ============================================================================
// MODULE UNIQUE ET CANONIQUE pour toutes les vérifications de permission.
// Toute query/action métier DOIT passer par ces helpers — aucune vérification
// de rôle/agence/entreprise ne doit être réécrite à la main ailleurs.
// (Anciennement dupliqué avec src/server/permissions.ts, supprimé : voir
// l'historique du rapport d'audit pour le détail des failles corrigées.)
//
// Hiérarchie des données : Entreprise (tenant) → Agence → Guichet / User.
//
// Portée des rôles :
//   - DIRECTION / QUALITE : toute l'ENTREPRISE (toutes ses agences), jamais
//     la plateforme entière.
//   - CHEF_AGENCE / AGENT : une seule AGENCE.
//
// Architecture :
//   - requireAuth(context)                    → vérifie que l'user est connecté
//   - requireRole(context, roles)              → vérifie le rôle
//   - requireManagementRole(context)           → rôle de gestion (DIRECTION/QUALITE/CHEF_AGENCE)
//   - getEntrepriseAgenceIds(context, entities)→ ids de toutes les agences de l'entreprise de l'user
//   - buildAgenceFilter(context, entities)     → filtre Prisma { id_agence } ou { id_agence: { in: [...] } }
//   - assertAgenceAccess(context, entities, id)→ vérifie qu'un id_agence cible est dans le périmètre
//   - resolveAgenceId(context, entities, id?)  → id d'agence effectif à utiliser (vérifié)
// ============================================================================
import { HttpError } from 'wasp/server';
/** Rôles dont la portée est l'entreprise entière (toutes les agences du tenant). */
const ENTREPRISE_WIDE_ROLES = ['DIRECTION'];
// ─────────────────────────────────────────────
// 1. Authentification
// ─────────────────────────────────────────────
/**
 * Vérifie que le contexte contient un utilisateur connecté et actif.
 * Lève une HttpError 401 si non connecté, 403 si le compte est suspendu.
 *
 * NOTE SaaS : la vérification du STATUT DE L'ENTREPRISE (tenant suspendu/
 * résilié) est faite par `assertEntrepriseActive` (async) — à appeler dans
 * les actions/queries qui y ont accès. requireAuth reste sync par design
 * (perf : pas de requête DB sur chaque appel).
 */
export function requireAuth(context) {
    if (!context.user) {
        throw new HttpError(401, 'Vous devez être connecté pour accéder à cette ressource.');
    }
    if (context.user.actif === false) {
        throw new HttpError(403, 'Votre compte a été suspendu par la direction. Contactez votre administrateur.');
    }
}
/**
 * SAAS — Vérifie que l'ENTREPRISE du compte est active (Doc 11 §3.4 :
 * AUTHENTIFICATION → ENTREPRISE ACTIVE → AGENCE → RESSOURCE).
 * - Compte plateforme (id_entreprise null) : rien à vérifier, no-op.
 * - Entreprise SUSPENDED/CANCELLED : 403 bloquant pour TOUTE opération.
 *
 * À appeler juste après requireAuth dans les actions/queries métier qui ont
 * `Entreprise` dans leurs entities. Cache process-local 60 s par tenant pour
 * éviter une requête DB par appel.
 */
const _statutCache = new Map();
// 10 s : compromis entre protection anti-charge et rapidité d'application
// d'une suspension. Une suspension prend effet au plus tard 10 s après.
const _STATUT_CACHE_TTL_MS = 10_000;
export async function assertEntrepriseActive(context, entities) {
    requireAuth(context);
    const idEntreprise = context.user.id_entreprise;
    if (!idEntreprise)
        return; // compte plateforme ou compte sans tenant — pas de contrôle ici
    const cached = _statutCache.get(idEntreprise);
    const now = Date.now();
    let status;
    if (cached && cached.expires > now) {
        status = cached.status;
    }
    else {
        const entreprise = await entities.Entreprise.findUnique({
            where: { id: idEntreprise },
            select: { status: true },
        });
        if (!entreprise)
            return; // tenant introuvable — laissé aux autres contrôles
        status = entreprise.status;
        _statutCache.set(idEntreprise, { status, expires: now + _STATUT_CACHE_TTL_MS });
    }
    if (status === 'SUSPENDED') {
        throw new HttpError(403, 'Votre abonnement Yeba est suspendu. Contactez votre gestionnaire Yeba pour le réactiver.');
    }
    if (status === 'CANCELLED') {
        throw new HttpError(403, 'Votre abonnement Yeba a été résilié. Contactez votre gestionnaire Yeba.');
    }
    // TRIAL et ACTIVE : accès autorisé
}
// ─────────────────────────────────────────────
// 2. Rôles
// ─────────────────────────────────────────────
/**
 * Vérifie que l'utilisateur possède l'un des rôles autorisés.
 * Lève une HttpError 403 sinon.
 */
export function requireRole(context, roles) {
    requireAuth(context);
    const userRole = context.user.role;
    if (!userRole || !roles.includes(userRole)) {
        throw new HttpError(403, `Accès réservé aux profils : ${roles.join(', ')}.`);
    }
}
/**
 * Vérifie que l'utilisateur est administrateur de la plateforme (indépendant
 * des rôles métier Yeba — réservé aux opérations propres à l'éditeur SaaS,
 * ex. tarification globale).
 */
export function requireAdmin(context) {
    requireAuth(context);
    if (!context.user.isAdmin) {
        throw new HttpError(403, 'Accès réservé aux administrateurs Yeba.');
    }
}
/**
 * Vérifie auth + rôle de gestion (DIRECTION, QUALITE, CHEF_AGENCE).
 */
export function requireManagementRole(context) {
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
}
// ─────────────────────────────────────────────
// 3. Isolation par entreprise + agence (RLS)
// ─────────────────────────────────────────────
/**
 * Retourne la liste des ids d'agence appartenant à l'entreprise de l'utilisateur.
 * Nécessite `entities.Agence` dans le contexte de l'action/query appelante.
 */
export async function getEntrepriseAgenceIds(context, entities) {
    requireAuth(context);
    const { id_entreprise } = context.user;
    if (!id_entreprise) {
        throw new HttpError(400, "Votre compte n'est rattaché à aucune entreprise. Contactez l'administrateur technique de Yeba.");
    }
    const agences = await entities.Agence.findMany({
        where: { id_entreprise },
        select: { id: true },
    });
    return agences.map((a) => a.id);
}
/**
 * Vérifie que l'utilisateur est rattaché à une agence.
 * - CHEF_AGENCE / AGENT : retourne leur unique id_agence.
 * - DIRECTION / QUALITE : n'ont pas de notion d'agence unique → lève une erreur ;
 *   utiliser buildAgenceFilter/getEntrepriseAgenceIds pour leur portée entreprise.
 */
export function requireAgence(context) {
    requireAuth(context);
    const { id_agence } = context.user;
    if (!id_agence) {
        throw new HttpError(400, "Votre compte n'est pas rattaché à une agence. Contactez votre Chef d'Agence ou l'administrateur technique de Yeba.");
    }
    return id_agence;
}
/**
 * Construit le filtre Prisma pour isoler les données au niveau `id_agence` :
 * - DIRECTION / QUALITE : `{ id_agence: { in: [...toutes les agences de l'entreprise] } }`
 *   (jamais `{}` — sinon fuite de données entre entreprises clientes du SaaS).
 * - Autres rôles : `{ id_agence: <idAgenceUtilisateur> }`
 *
 * Nécessite `entities.Agence` déclaré dans l'action/query appelante.
 */
export async function buildAgenceFilter(context, entities) {
    requireAuth(context);
    const role = context.user.role;
    if (role && ENTREPRISE_WIDE_ROLES.includes(role)) {
        const agenceIds = await getEntrepriseAgenceIds(context, entities);
        return { id_agence: { in: agenceIds } };
    }
    return { id_agence: requireAgence(context) };
}
/**
 * Vérifie qu'un enregistrement cible appartient bien au périmètre de
 * l'utilisateur (son agence, ou une agence de son entreprise pour
 * DIRECTION/QUALITE). À utiliser AVANT toute lecture/modification d'un
 * enregistrement identifié par son `id_agence`.
 *
 * `recordIdAgence` doit toujours être une valeur explicitement fournie et
 * validée en amont (jamais `undefined` silencieusement accepté) : c'est
 * l'appelant qui doit garantir que l'id existe avant d'appeler cette fonction.
 */
export async function assertAgenceAccess(context, entities, recordIdAgence, resourceName = 'ressource') {
    requireAuth(context);
    if (recordIdAgence === undefined || recordIdAgence === null || Number.isNaN(recordIdAgence)) {
        throw new HttpError(400, `Identifiant d'agence manquant ou invalide pour cette ${resourceName}.`);
    }
    const role = context.user.role;
    const { id_agence } = context.user;
    if (role && ENTREPRISE_WIDE_ROLES.includes(role)) {
        const agenceIds = await getEntrepriseAgenceIds(context, entities);
        if (!agenceIds.includes(recordIdAgence)) {
            throw new HttpError(403, `Accès refusé : cette ${resourceName} appartient à une autre entreprise.`);
        }
        return;
    }
    if (id_agence !== recordIdAgence) {
        throw new HttpError(403, `Accès refusé : cette ${resourceName} appartient à une autre agence.`);
    }
}
/**
 * Vérifie que l'utilisateur peut gérer la cible `targetAgenceId` (alias
 * sémantique de assertAgenceAccess pour les opérations d'écriture/gestion).
 */
export async function assertCanManageAgence(context, entities, targetAgenceId) {
    return assertAgenceAccess(context, entities, targetAgenceId, "agence");
}
/**
 * Retourne l'id d'agence effectif à utiliser pour une requête, en le
 * VÉRIFIANT systématiquement (jamais un simple `??` non contrôlé) :
 * - Si `overrideIdAgence` est fourni : vérifie qu'il est dans le périmètre de
 *   l'utilisateur (sa propre agence, ou une agence de son entreprise pour
 *   DIRECTION/QUALITE) via assertAgenceAccess, puis le retourne.
 * - Sinon : retourne l'agence de l'utilisateur (erreur si DIRECTION/QUALITE
 *   sans agence de rattachement et sans override — elles doivent alors
 *   préciser explicitement l'agence visée).
 */
export async function resolveAgenceId(context, entities, overrideIdAgence) {
    requireAuth(context);
    if (overrideIdAgence !== undefined && overrideIdAgence !== null) {
        await assertAgenceAccess(context, entities, overrideIdAgence);
        return overrideIdAgence;
    }
    return requireAgence(context);
}
/**
 * Version "scope" de resolveAgenceId : au lieu de forcer une agence unique,
 * retourne un filtre Prisma compatible avec les deux cas :
 * - `overrideIdAgence` fourni (drill-down explicite) → `{ id_agence: <id> }`
 *   après vérification d'accès.
 * - Sinon → `buildAgenceFilter` : agence unique pour CHEF_AGENCE/AGENT, ou
 *   `{ id_agence: { in: [...] } }` pour TOUTES les agences de l'entreprise
 *   si DIRECTION/QUALITE.
 *
 * À utiliser à la place de `resolveAgenceId` dans toute query dont le
 * résultat doit être consultable par DIRECTION/QUALITE au niveau entreprise
 * (dashboards, statistiques agrégées). `resolveAgenceId` reste adapté aux
 * écrans nécessairement rattachés à une agence précise (planning du jour,
 * gestion des agents d'une agence, etc.).
 */
export async function resolveAgenceScope(context, entities, overrideIdAgence) {
    requireAuth(context);
    if (overrideIdAgence !== undefined && overrideIdAgence !== null) {
        await assertAgenceAccess(context, entities, overrideIdAgence);
        return { id_agence: overrideIdAgence };
    }
    return buildAgenceFilter(context, entities);
}
/**
 * Vérifie le rôle ÉDITEUR de l'utilisateur (Yeba Platform), indépendamment
 * des rôles métier. À utiliser sur TOUTE query/action de la console
 * /platform. Le front n'est jamais la protection : cette fonction EST la
 * barrière.
 * - SUPER_ADMIN : lecture + écriture (console complète).
 * - SUPPORT : lecture seule — les actions d'écriture de la console exigent
 *   explicitement ['SUPER_ADMIN'].
 */
export function requirePlatformRole(context, roles) {
    requireAuth(context);
    const platformRole = (context.user.platformRole ?? 'NONE');
    if (!roles.includes(platformRole)) {
        throw new HttpError(403, 'Accès réservé à la console Yeba Platform.');
    }
}
/**
 * Raccourci : l'appelant est un SUPER_ADMIN (console complète).
 * Ne vérifie PAS le rôle métier — les deux mondes sont séparés.
 */
export function requireSuperAdmin(context) {
    requirePlatformRole(context, ['SUPER_ADMIN']);
}
/**
 * Vérifie que l'ENTREPRISE du compte est active (SaaS). Appelé par
 * requireAuth pour bloquer globalement un tenant suspendu/résilié —
 * Doc 11 §3.4 : AUTHENTIFICATION → PLATFORM ROLE → ENTREPRISE ACTIVE → ...
 *
 * @returns true si une vérification d'entreprise a été effectuée (compte
 * client), false si compte plateforme (id_entreprise = null, hors tenant).
 * Les erreurs sont SILENCIEUSES (return false) : requireAuth décide.
 */
export async function verifierEntrepriseActive(context, entities) {
    const { id_entreprise } = (context.user ?? {});
    if (!id_entreprise)
        return false; // compte plateforme ou anomalie — pas de contrôle tenant ici
    const entreprise = await entities.Entreprise.findUnique({
        where: { id: id_entreprise },
        select: { status: true },
    });
    if (!entreprise)
        return false; // entreprit disparue : laissé aux autres contrôles
    if (entreprise.status === 'SUSPENDED') {
        throw new HttpError(403, 'Votre abonnement Yeba est suspendu. Contactez votre gestionnaire Yeba pour le réactiver.');
    }
    if (entreprise.status === 'CANCELLED') {
        throw new HttpError(403, 'Votre abonnement Yeba a été résilié. Contactez votre gestionnaire Yeba.');
    }
    // TRIAL et ACTIVE : accès autorisé
    return true;
}
