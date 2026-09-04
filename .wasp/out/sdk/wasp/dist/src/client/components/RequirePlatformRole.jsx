import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
/**
 * GARDE DE PÉRIMÈTRE (Doc 12) : les pages de la console /platform sont
 * réservées aux comptes plateforme (SUPER_ADMIN, SUPPORT).
 * - Non connecté → redirige vers /login (aucun contenu affiché avant).
 * - Connecté sans rôle plateforme → redirige vers /dashboard.
 * Miroir de RequireEnterpriseRole : chaque espace a son garde, le serveur
 * restant la seule vraie frontière (requirePlatformRole renvoie 403).
 */
export function RequirePlatformRole({ children }) {
    const { data: user, isLoading } = useAuth();
    if (isLoading && !user) {
        return (<div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"/>
          <p className="text-sm text-muted-foreground">Vérification de l'accès…</p>
        </div>
      </div>);
    }
    if (!user) {
        return <Navigate to={routes.LoginRoute.to} replace/>;
    }
    const platformRole = user?.platformRole;
    if (platformRole !== 'SUPER_ADMIN' && platformRole !== 'SUPPORT') {
        return <Navigate to={routes.DashboardRoute.to} replace/>;
    }
    return <>{children}</>;
}
//# sourceMappingURL=RequirePlatformRole.jsx.map