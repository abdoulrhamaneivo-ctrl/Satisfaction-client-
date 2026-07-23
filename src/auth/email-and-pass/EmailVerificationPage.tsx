import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { verifyEmail } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AuthPageLayout } from "../AuthPageLayout";

export function EmailVerificationPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  const [status, setStatus] = useState<"chargement" | "succes" | "erreur">("chargement");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus("erreur");
        setMessage("Le lien est invalide ou incomplet. Merci de reprendre le lien reçu par e-mail.");
        return;
      }
      try {
        await verifyEmail({ token });
        setStatus("succes");
      } catch (err: any) {
        setStatus("erreur");
        setMessage(err?.message || "La vérification a échoué. Le lien a peut-être expiré.");
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthPageLayout
      eyebrow="Vérification e-mail"
      title="Vérification de votre e-mail"
      subtitle="Cette étape confirme votre adresse e-mail et sécurise votre compte Yeba."
      footer={
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-primary underline">
          Aller à la connexion
        </WaspRouterLink>
      }
    >
      {status === "chargement" && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground">
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
          <p>Vérification de votre adresse e-mail en cours...</p>
        </div>
      )}

      {status === "succes" && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>Votre e-mail a bien été vérifié. Vous pouvez maintenant vous connecter.</p>
        </div>
      )}

      {status === "erreur" && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </AuthPageLayout>
  );
}
