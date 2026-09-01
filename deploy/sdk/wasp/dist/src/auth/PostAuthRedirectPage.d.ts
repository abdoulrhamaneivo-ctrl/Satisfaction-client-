import React from "react";
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
export declare function PostAuthRedirectPage(): React.JSX.Element;
//# sourceMappingURL=PostAuthRedirectPage.d.ts.map