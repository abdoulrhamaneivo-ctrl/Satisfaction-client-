import React, { ReactNode } from "react";
interface AuthPageLayoutProps {
    eyebrow: string;
    title: ReactNode;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
}
/**
 * Habillage commun des pages d'authentification (connexion, mot de passe
 * oublié, réinitialisation, vérification e-mail) — panneau de marque +
 * panneau de formulaire — pour une expérience cohérente sur toute la
 * plateforme Yeba.
 */
export declare function AuthPageLayout({ eyebrow, title, subtitle, children, footer }: AuthPageLayoutProps): React.JSX.Element;
export {};
