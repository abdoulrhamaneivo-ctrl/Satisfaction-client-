import React from 'react';
interface RequirePlatformRoleProps {
    children: React.ReactNode;
}
/**
 * GARDE DE PÉRIMÈTRE (Doc 12) : les pages de la console /platform sont
 * réservées aux comptes plateforme (SUPER_ADMIN, SUPPORT).
 * - Non connecté → redirige vers /login (aucun contenu affiché avant).
 * - Connecté sans rôle plateforme → redirige vers /dashboard.
 * - Mot de passe temporaire non changé (mustChangePassword) → redirige vers
 *   /account, comme RequireAuth (FIX 09/2026 : sans ça, un super admin
 *   utilisait toute la console sans jamais changer son mot de passe initial).
 * Miroir de RequireEnterpriseRole : chaque espace a son garde, le serveur
 * restant la seule vraie frontière (requirePlatformRole renvoie 403).
 */
export declare function RequirePlatformRole({ children }: RequirePlatformRoleProps): React.JSX.Element;
export {};
//# sourceMappingURL=RequirePlatformRole.d.ts.map