import React from "react";
/**
 * ANCIEN flux Wasp (désactivé 09/2026) : cette page consommait des tokens
 * émis par le reset INTERNE Wasp, envoyé par SMTP — bloqué depuis Render
 * (timeout systématique). Le flux actuel passe par « Mot de passe oublié »
 * → e-mail Brevo HTTP → /account/activate (définition directe).
 * Cette page ne sert que de garde-fou pour les vieux liens/bookmarks.
 */
export declare function PasswordResetPage(): React.JSX.Element;
