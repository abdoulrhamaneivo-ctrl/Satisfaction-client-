import React, { useState } from "react";
import { useLocation } from "react-router";
import { resetPassword } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "../AuthPageLayout";
import { FormField } from "../../client/components/FormField";
import { PasswordInput } from "../../client/components/ui/password-input";
import { Button } from "../../client/components/ui/button";

export function PasswordResetPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Le lien est invalide ou incomplet. Merci de reprendre le lien reçu par e-mail.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ password, token });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Nouveau mot de passe"
      title="Choisir un nouveau mot de passe"
      subtitle="Définissez un nouveau mot de passe sécurisé pour votre compte CXSAT."
      footer={
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline">
          Retour à la connexion
        </WaspRouterLink>
      }
    >
      {success ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</p>
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

          <FormField label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum." required>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
              disabled={loading}
            />
          </FormField>

          <FormField label="Confirmer le mot de passe" htmlFor="confirmation" required>
            <PasswordInput
              id="confirmation"
              name="confirmation"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="••••••••"
              className="h-11"
              disabled={loading}
            />
          </FormField>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </Button>
          </motion.div>
        </form>
      )}
    </AuthPageLayout>
  );
}
