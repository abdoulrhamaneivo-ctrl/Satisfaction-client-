import React, { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { FormField } from "../client/components/FormField";
import { Input } from "../client/components/ui/input";
import { PasswordInput } from "../client/components/ui/password-input";
import { Button } from "../client/components/ui/button";

export function LoginPage() {
  useRedirectIfLoggedIn();

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    if (!password) {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      // La redirection définitive (onboarding vs tableau de bord) est
      // ensuite arbitrée par useRedirectIfLoggedIn / les pages elles-mêmes.
      navigate("/apres-connexion");
    } catch (err: any) {
      setError(
        err?.message === "Invalid credentials"
          ? "E-mail ou mot de passe incorrect."
          : err?.message || "Une erreur est survenue lors de la connexion.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Espace client"
      title="Connexion à votre espace"
      subtitle="Retrouvez votre tableau de bord de satisfaction client et suivez vos agences en temps réel."
      footer={
        <>
          <span>
            Pas encore de compte ?{" "}
            <WaspRouterLink to={routes.SignupRoute.to} className="font-semibold text-primary underline">
              Créer un compte
            </WaspRouterLink>
          </span>
          <br />
          <span>
            Mot de passe oublié ?{" "}
            <WaspRouterLink
              to={routes.RequestPasswordResetRoute.to}
              className="font-semibold text-primary underline"
            >
              Réinitialiser
            </WaspRouterLink>
          </span>
        </>
      }
    >
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

        <FormField label="Mot de passe" htmlFor="password" required>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11"
            disabled={loading}
          />
        </FormField>

        <motion.div whileTap={{ scale: 0.98 }}>
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </motion.div>
      </form>
    </AuthPageLayout>
  );
}
