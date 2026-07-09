import { type EmailSender } from "@wasp.sh/spec";

/**
 * Configuration de l'envoi d'emails via Brevo (ex Sendinblue).
 *
 * Variables d'environnement à configurer sur Railway :
 *   SMTP_HOST=smtp-relay.brevo.com
 *   SMTP_PORT=587
 *   SMTP_USERNAME=<votre_email_brevo>
 *   SMTP_PASSWORD=<votre_api_key_brevo>
 *
 * Pour obtenir l'API key : https://account.brevo.com/settings > SMTP & API
 */
export const emailSender: EmailSender = {
  provider: "SMTP",
  defaultFrom: {
    name: "CXSAT",
    email: "abdoulrhamane.ivo@gmail.com",
  },
};
