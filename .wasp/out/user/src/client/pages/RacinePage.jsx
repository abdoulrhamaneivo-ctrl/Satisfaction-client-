import { Navigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
/**
 * RacinePage — la landing marketing a été retirée (décision Ivo : le parcours
 * client passe uniquement par le scan du QR code /q/:guichetId).
 * La racine redirige donc selon l'état de connexion :
 *   - utilisateur connecté  → /dashboard
 *   - visiteur (équipes)    → /login
 */
export function RacinePage() {
    const { data: user, isLoading } = useAuth();
    if (isLoading) {
        return (<div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Chargement…</div>
      </div>);
    }
    return <Navigate to={user ? routes.DashboardRoute.to : routes.LoginRoute.to} replace/>;
}
