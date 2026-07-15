import { type EmailSender } from "@wasp.sh/spec";

/**
 * Configuration de l'envoi d'emails via Brevo (ex Sendinblue).
 *
 * Variables d'environnement requises :
 *   SMTP_HOST=smtp-relay.brevo.com
 *   SMTP_PORT=587
 *   SMTP_USERNAME=<email_brevo>
 *   SMTP_PASSWORD=<api_key_brevo>
 *
 * Note: Wasp attend bien SMTP_USERNAME, pas SMTP_USER.
 * L'adresse here doit être identique à celle de auth.wasp.ts -> fromField.email
 * et être validée dans votre compte Brevo.
 */
export const emailSender: EmailSender = {
  provider: "SendGrid",
  defaultFrom: {
    name: "CXSAT",
    email: "abdoulrhamane.ivo@gmail.com",
  },
};
