import React from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { MailCheck } from "lucide-react";
import { AuthPageLayout } from "../AuthPageLayout";

/**
 * ANCIEN flux Wasp (désactivé 09/2026) : cette page consommait des tokens
 * émis par le reset INTERNE Wasp, envoyé par SMTP — bloqué depuis Render
 * (timeout systématique). Le flux actuel passe par « Mot de passe oublié »
 * → e-mail Brevo HTTP → /account/activate (définition directe).
 * Cette page ne sert que de garde-fou pour les vieux liens/bookmarks.
 */
export function PasswordResetPage() {
  return (
    <AuthPageLayout
      eyebrow="Mot de passe oublié"
      title="Ce lien n'est plus utilisé"
      subtitle="Demandez un nouveau lien : vous recevrez un e-mail pour définir directement votre mot de passe."
      footer={
        <WaspRouterLink
          to={routes.LoginRoute.to}
          className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
        >
          Retour à la connexion
        </WaspRouterLink>
      }
    >
      <div role="status" className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          Les liens de réinitialisation ont changé de format.{" "}
          <WaspRouterLink
            to={routes.RequestPasswordResetRoute.to}
            className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            Demandez un nouveau lien ici
          </WaspRouterLink>
          , valable 24 h.
        </p>
      </div>
    </AuthPageLayout>
  );
}
