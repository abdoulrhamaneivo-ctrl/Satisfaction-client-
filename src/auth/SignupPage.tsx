import React, { useState } from "react";
import { signup } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { FormField } from "../client/components/FormField";
import { Input } from "../client/components/ui/input";
import { PasswordInput } from "../client/components/ui/password-input";
import { Button } from "../client/components/ui/button";

export function SignupPage() {
  useRedirectIfLoggedIn();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prenom.trim()) return setError("Le prénom est requis.");
    if (!nom.trim()) return setError("Le nom est requis.");
    if (!email.trim()) return setError("L'adresse e-mail est requise.");
    if (!password) return setError("Le mot de passe est requis.");
    if (password.length < 8) {
      return setError("Le mot de passe doit contenir au moins 8 caractères.");
    }
    if (password !== confirmation) {
      return setError("Les deux mots de passe ne correspondent pas.");
    }

    setLoading(true);
    try {
      await signup({ email, password, prenom, nom });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthPageLayout
        eyebrow="Nouveau compte"
        title="Vérifiez votre boîte mail"
        subtitle="Un e-mail de confirmation vient de vous être envoyé pour sécuriser votre compte."
        footer={
          <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline">
            Retour à la connexion
          </WaspRouterLink>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            Votre compte a été créé avec succès. Cliquez sur le lien reçu par e-mail à
            l'adresse <span className="font-semibold">{email}</span> pour l'activer, puis
            connectez-vous.
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      eyebrow="Nouveau compte"
      title="Créer votre compte CXSAT"
      subtitle="Configurez votre entreprise en quelques minutes et commencez à mesurer la satisfaction de vos clients."
      footer={
        <span>
          Vous avez déjà un compte ?{" "}
          <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline">
            Se connecter
          </WaspRouterLink>
        </span>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Prénom" htmlFor="prenom" required>
            <Input
              id="prenom"
              name="prenom"
              autoComplete="given-name"
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Jean-Luc"
              className="h-11"
              disabled={loading}
            />
          </FormField>
          <FormField label="Nom" htmlFor="nom" required>
            <Input
              id="nom"
              name="nom"
              autoComplete="family-name"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Kouamé"
              className="h-11"
              disabled={loading}
            />
          </FormField>
        </div>

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

        <FormField label="Mot de passe" htmlFor="password" hint="8 caractères minimum." required>
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
            {loading ? "Création du compte..." : "Créer mon compte"}
          </Button>
        </motion.div>
      </form>
    </AuthPageLayout>
  );
}
