import React, { useState } from "react";
import { requestPasswordReset } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "../AuthPageLayout";
import { FormField } from "../../client/components/FormField";
import { Input } from "../../client/components/ui/input";
import { Button } from "../../client/components/ui/button";

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Mot de passe oublié"
      title="Réinitialiser votre mot de passe"
      subtitle="Indiquez votre e-mail, nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe."
      footer={
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline">
          Retour à la connexion
        </WaspRouterLink>
      }
    >
      {sent ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            Si un compte existe pour <span className="font-semibold">{email}</span>, un e-mail
            contenant un lien de réinitialisation vient de vous être envoyé.
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <FormField label="Adresse e-mail" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.ci"
              className="h-11"
              disabled={loading}
            />
          </FormField>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
            </Button>
          </motion.div>
        </form>
      )}
    </AuthPageLayout>
  );
}
