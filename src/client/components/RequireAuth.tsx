import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Protège les pages de l'espace applicatif CXSAT.
 * - Si l'utilisateur n'est pas connecté → redirige vers /login
 * - Pendant le chargement → spinner discret
 * - Connecté → affiche les enfants normalement
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { data: user, isLoading } = useAuth();

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

  if (!isLoading && !user) {
    return <Navigate to={routes.LoginRoute.to} replace />;
  }

  return <>{children}</>;
}
