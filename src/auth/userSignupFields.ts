import { defineUserSignupFields } from "wasp/auth/providers/types";
import { env } from "wasp/server";
import { z } from "zod";

function isAdminEmail(email: string): boolean {
  return env.ADMIN_EMAILS.includes(email);
}

const emailDataSchema = z.object({
  email: z.string(),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
});

export const getEmailUserFields = defineUserSignupFields({
  email: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  username: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  nom: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.nom;
  },
  prenom: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.prenom;
  },
  isAdmin: (data) => {
    const emailData = emailDataSchema.parse(data);
    return isAdminEmail(emailData.email);
  },
});
