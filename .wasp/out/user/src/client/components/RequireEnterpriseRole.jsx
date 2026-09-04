import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'wasp/client/auth';
/**
 * GARDE DE PÉRIMÈTRE (Doc 12) : les pages de l'espace ENTREPRISE (dashboard,
 * avis, critères, guichets, planning, alertes, archives, admin) sont réservées
 * aux comptes avec un rôle métier (DIRECTION, CHEF_AGENCE, QUALITE, AGENT).
 * Les comptes PLATEFORME (SUPER_ADMIN, SUPPORT, role=null) n'ont AUCUN
 * périmètre entreprise : ils sont redirigés vers /platform, leur seul espace.
 * Double protection : le serveur refuse aussi (assertEntrepriseActive +
 * requireRole renvoient 403), mais le front doit guider l'utilisateur au
 * bon endroit au lieu d'afficher des écrans vides ou erreurs.
 */
export function RequireEnterpriseRole({ children }) {
    const { data: user, isLoading } = useAuth();
    const location = useLocation();
    if (isLoading && !user) {
        return (<div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"/>
          <p className="text-sm text-muted-foreground">Vérification de l'accès…</p>
        </div>
      </div>);
    }
    const platformRole = user?.platformRole;
    const isPlatformAccount = platformRole === 'SUPER_ADMIN' || platformRole === 'SUPPORT';
    if (isPlatformAccount) {
        return <Navigate to="/platform" replace state={{ from: location.pathname }}/>;
    }
    return <>{children}</>;
}
