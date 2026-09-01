export interface WaspContext {
    user?: {
        id: string;
        email?: string | null;
        role?: string | null;
        id_agence?: number | null;
        id_entreprise?: number | null;
        isAdmin?: boolean;
        actif?: boolean;
    } | null;
    entities: Record<string, any>;
}
export type YebaRole = 'DIRECTION' | 'QUALITE' | 'CHEF_AGENCE' | 'AGENT';
/**
 * Vérifie que le contexte contient un utilisateur connecté et actif.
 * Lève une HttpError 401 si non connecté, 403 si le compte est suspendu.
 *
 * NOTE SaaS : la vérification du STATUT DE L'ENTREPRISE (tenant suspendu/
 * résilié) est faite par `assertEntrepriseActive` (async) — à appeler dans
 * les actions/queries qui y ont accès. requireAuth reste sync par design
 * (perf : pas de requête DB sur chaque appel).
 */
export declare function requireAuth(context: WaspContext): asserts context is WaspContext & {
    user: NonNullable<WaspContext['user']>;
};
export declare function assertEntrepriseActive(context: WaspContext, entities: any): Promise<void>;
/**
 * Vérifie que l'utilisateur possède l'un des rôles autorisés.
 * Lève une HttpError 403 sinon.
 */
export declare function requireRole(context: WaspContext, roles: YebaRole[]): void;
/**
 * Vérifie que l'utilisateur est administrateur de la plateforme (indépendant
 * des rôles métier Yeba — réservé aux opérations propres à l'éditeur SaaS,
 * ex. tarification globale).
 */
export declare function requireAdmin(context: WaspContext): void;
/**
 * Vérifie auth + rôle de gestion (DIRECTION, QUALITE, CHEF_AGENCE).
 */
export declare function requireManagementRole(context: WaspContext): void;
/**
 * Retourne la liste des ids d'agence appartenant à l'entreprise de l'utilisateur.
 * Nécessite `entities.Agence` dans le contexte de l'action/query appelante.
 */
export declare function getEntrepriseAgenceIds(context: WaspContext, entities: any): Promise<number[]>;
/**
 * Vérifie que l'utilisateur est rattaché à une agence.
 * - CHEF_AGENCE / AGENT : retourne leur unique id_agence.
 * - DIRECTION / QUALITE : n'ont pas de notion d'agence unique → lève une erreur ;
 *   utiliser buildAgenceFilter/getEntrepriseAgenceIds pour leur portée entreprise.
 */
export declare function requireAgence(context: WaspContext): number;
/**
 * Construit le filtre Prisma pour isoler les données au niveau `id_agence` :
 * - DIRECTION / QUALITE : `{ id_agence: { in: [...toutes les agences de l'entreprise] } }`
 *   (jamais `{}` — sinon fuite de données entre entreprises clientes du SaaS).
 * - Autres rôles : `{ id_agence: <idAgenceUtilisateur> }`
 *
 * Nécessite `entities.Agence` déclaré dans l'action/query appelante.
 */
export declare function buildAgenceFilter(context: WaspContext, entities: any): Promise<{
    id_agence: number | {
        in: number[];
    };
}>;
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
export declare function assertAgenceAccess(context: WaspContext, entities: any, recordIdAgence: number, resourceName?: string): Promise<void>;
/**
 * Vérifie que l'utilisateur peut gérer la cible `targetAgenceId` (alias
 * sémantique de assertAgenceAccess pour les opérations d'écriture/gestion).
 */
export declare function assertCanManageAgence(context: WaspContext, entities: any, targetAgenceId: number): Promise<void>;
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
export declare function resolveAgenceId(context: WaspContext, entities: any, overrideIdAgence?: number): Promise<number>;
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
export declare function resolveAgenceScope(context: WaspContext, entities: any, overrideIdAgence?: number): Promise<{
    id_agence: number | {
        in: number[];
    };
}>;
export type PlatformRole = 'SUPER_ADMIN' | 'SUPPORT' | 'NONE';
/**
 * Vérifie le rôle ÉDITEUR de l'utilisateur (Yeba Platform), indépendamment
 * des rôles métier. À utiliser sur TOUTE query/action de la console
 * /platform. Le front n'est jamais la protection : cette fonction EST la
 * barrière.
 * - SUPER_ADMIN : lecture + écriture (console complète).
 * - SUPPORT : lecture seule — les actions d'écriture de la console exigent
 *   explicitement ['SUPER_ADMIN'].
 */
export declare function requirePlatformRole(context: WaspContext, roles: PlatformRole[]): void;
/**
 * Raccourci : l'appelant est un SUPER_ADMIN (console complète).
 * Ne vérifie PAS le rôle métier — les deux mondes sont séparés.
 */
export declare function requireSuperAdmin(context: WaspContext): void;
/**
 * Vérifie que l'ENTREPRISE du compte est active (SaaS). Appelé par
 * requireAuth pour bloquer globalement un tenant suspendu/résilié —
 * Doc 11 §3.4 : AUTHENTIFICATION → PLATFORM ROLE → ENTREPRISE ACTIVE → ...
 *
 * @returns true si une vérification d'entreprise a été effectuée (compte
 * client), false si compte plateforme (id_entreprise = null, hors tenant).
 * Les erreurs sont SILENCIEUSES (return false) : requireAuth décide.
 */
export declare function verifierEntrepriseActive(context: WaspContext, entities: any): Promise<boolean>;
//# sourceMappingURL=rowLevelSecurity.d.ts.map