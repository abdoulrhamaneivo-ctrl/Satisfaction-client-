import { type EmailSender } from "@wasp.sh/spec";

/**
 * Envoi d'emails via Brevo (ex Sendinblue) en SMTP — offre gratuite
 * (300 emails/jour), pas de clé SendGrid payante requise.
 *
 * Variables d'environnement requises (.env.server en dev, dashboard
 * Render en prod) :
 *   SMTP_HOST=smtp-relay.brevo.com
 *   SMTP_PORT=587
 *   SMTP_USERNAME=<email de connexion Brevo>
 *   SMTP_PASSWORD=<clé SMTP Brevo> (console Brevo → SMTP & API → clés SMTP,
 *     commence par « xsmtpsib- », CE N'EST PAS le mot de passe du compte)
 *
 * Note: Wasp attend bien SMTP_USERNAME, pas SMTP_USER.
 * L'adresse ci-dessous doit être identique à celle de auth.wasp.ts ->
 * fromField et être déclarée comme expéditeur vérifié dans le compte
 * Brevo (Expéditeurs → Ajouter), sinon Brevo rejette l'envoi.
 */
export const emailSender: EmailSender = {
  provider: "SMTP",
  defaultFrom: {
    name: "Yeba",
    email: "abdoulrhamane.ivo@gmail.com",
  },
};
