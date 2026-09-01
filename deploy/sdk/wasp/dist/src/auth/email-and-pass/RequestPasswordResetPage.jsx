import React, { useState } from "react";
import { requestPasswordReset } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle, MailCheck, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "../AuthPageLayout";
import { FormField } from "../../client/components/FormField";
import { Input } from "../../client/components/ui/input";
import { Button } from "../../client/components/ui/button";
export function RequestPasswordResetPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sent, setSent] = useState(false);
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setError(err?.message || "Une erreur est survenue. Veuillez réessayer.");
        }
        finally {
            setLoading(false);
        }
    };
    return (<AuthPageLayout eyebrow="Mot de passe oublié" title="Réinitialiser votre mot de passe" subtitle="Indiquez votre e-mail, nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe." footer={<WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
          Retour à la connexion
        </WaspRouterLink>}>
      {sent ? (<div role="status" className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-primary"/>
          <p>
            Si un compte existe pour <span className="font-semibold">{email}</span>, un e-mail
            contenant un lien de réinitialisation vient de vous être envoyé.
          </p>
        </div>) : (<form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (<motion.div role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0"/>
              <span>{error}</span>
            </motion.div>)}

          <FormField label="Adresse e-mail" htmlFor="email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
              <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.ci" className="h-11 pl-10 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40" disabled={loading}/>
            </div>
          </FormField>

          <motion.div whileTap={loading ? undefined : { scale: 0.98 }}>
            <Button type="submit" size="lg" disabled={loading} className="w-full gap-2 rounded-xl btn-glow-gold font-bold h-11">
              {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
            </Button>
          </motion.div>
        </form>)}
    </AuthPageLayout>);
}
//# sourceMappingURL=RequestPasswordResetPage.jsx.map