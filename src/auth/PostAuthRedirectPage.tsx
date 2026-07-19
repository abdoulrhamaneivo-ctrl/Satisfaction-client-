import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import { AmbientBackground } from "../client/components/AmbientBackground";
import { LoadingSpinner } from "../admin/layout/LoadingSpinner";

/**
 * Page technique (invisible pour l'utilisateur) qui arbitre la destination
 * après connexion. En déploiement mono-agence, tout compte est déjà
 * rattaché à une agence dès sa création (compte CHEF_AGENCE créé par le
 * seed initial, ou compte AGENT/QUALITE créé par inviteAgent) : il n'y a
 * plus d'écran d'onboarding à traverser, on va directement au tableau de
 * bord.
 *
 * Corrige le comportement précédent qui redirigeait systématiquement
 * vers /demo-app (page de démonstration IA héritée du modèle Open SaaS,
 * sans rapport avec la plateforme Yeba).
 */
export function PostAuthRedirectPage() {
  const { data: user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  return (
    <AmbientBackground className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </AmbientBackground>
  );
}
