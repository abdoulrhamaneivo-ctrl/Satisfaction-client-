import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import { AmbientBackground } from "../client/components/AmbientBackground";
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
        if (isLoading)
            return;
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }
        // Routage par périmètre (Doc 12) : les comptes PLATEFORME (SUPER_ADMIN /
        // SUPPORT) atterrissent dans la console /platform — leur espace de
        // gestion des entreprises et abonnements. Les comptes entreprise
        // (DIRECTION/CHEF_AGENCE/QUALITE/AGENT) vont au tableau de bord métier.
        const platformRole = user?.platformRole;
        if (platformRole === 'SUPER_ADMIN' || platformRole === 'SUPPORT') {
            navigate("/platform", { replace: true });
            return;
        }
        navigate("/dashboard", { replace: true });
    }, [user, isLoading, navigate]);
    return (<AmbientBackground className="flex min-h-screen items-center justify-center">
      {/* Spinner inline — l'ancien composant venait du dashboard admin (admin/
            layout) retiré lors du durcissement P2 (suppression du double
            système isAdmin vs platformRole). */}
      <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" role="status" aria-label="Chargement"/>
    </AmbientBackground>);
}
