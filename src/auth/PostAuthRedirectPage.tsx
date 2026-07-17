import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import { AmbientBackground } from "../client/components/AmbientBackground";
import { LoadingSpinner } from "../admin/layout/LoadingSpinner";

/**
 * Page technique (invisible pour l'utilisateur) qui arbitre la
 * destination après connexion :
 *  - Utilisateur sans agence rattachée  -> /onboarding (configuration initiale)
 *  - Utilisateur déjà configuré         -> /dashboard (tableau de bord)
 *
 * Corrige le comportement précédent qui redirigeait systématiquement
 * vers /demo-app (page de démonstration IA héritée du modèle Open SaaS,
 * sans rapport avec la plateforme CXSAT).
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

    const aDejaUneAgence = Boolean((user as any).id_agence);
    navigate(aDejaUneAgence ? "/dashboard" : "/onboarding", { replace: true });
  }, [user, isLoading, navigate]);

  return (
    <AmbientBackground className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </AmbientBackground>
  );
}
