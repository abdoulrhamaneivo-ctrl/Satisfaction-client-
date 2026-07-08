import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";

/**
 * Redirige un utilisateur déjà connecté qui atterrit sur une page publique
 * (connexion, inscription...) vers l'endroit pertinent de l'application :
 *  - vers l'onboarding s'il n'a pas encore configuré son entreprise/agence,
 *  - vers le tableau de bord sinon.
 *
 * Remplace l'ancien comportement qui renvoyait systématiquement vers
 * "/demo-app" (page de démonstration IA du template Open SaaS, sans lien
 * avec la plateforme CXSAT).
 */
export function useRedirectIfLoggedIn() {
  const { data: user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const aDejaUneAgence = Boolean((user as any).id_agence);
    navigate(aDejaUneAgence ? "/dashboard" : "/onboarding");
  }, [user, navigate]);
}
