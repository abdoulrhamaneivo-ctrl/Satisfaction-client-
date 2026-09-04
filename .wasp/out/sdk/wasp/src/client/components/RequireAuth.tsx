import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { logout, useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Protège les pages de l'espace applicatif Yeba.
 * - Si l'utilisateur n'est pas connecté → redirige vers /login
 * - Si le compte a été suspendu/désactivé par la direction → déconnecte et
 *   redirige vers /login (au lieu de laisser un accès fantôme).
 * - Si le compte doit changer son mot de passe (mustChangePassword) →
 *   redirige vers /account, seule page accessible tant que ce n'est pas
 *   fait. Concerne uniquement le tout premier compte créé par le seed
 *   (mot de passe généré affiché en clair en console, donc directement
 *   utilisable — contrairement aux comptes invités qui doivent de toute
 *   façon passer par "mot de passe oublié" avant de pouvoir se connecter).
 * - Pendant le chargement → spinner discret
 * - Connecté et actif → affiche les enfants normalement
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { data: user, isLoading } = useAuth();
  const location = useLocation();
  const isSuspended = Boolean(user) && (user as any).actif === false;
  const mustChangePassword = Boolean(user) && (user as any).mustChangePassword === true;

  useEffect(() => {
    if (isSuspended) {
      logout();
    }
  }, [isSuspended]);

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Vérification de l'accès…</p>
        </div>
      </div>
    );
  }

  if (!isLoading && (!user || isSuspended)) {
    return <Navigate to={routes.LoginRoute.to} replace />;
  }

  if (mustChangePassword && location.pathname !== routes.AccountRoute.to) {
    return <Navigate to={routes.AccountRoute.to} replace />;
  }

  return <>{children}</>;
}