import * as z from "zod";
// SAAS (Doc 11 §3.3) : ADMIN_EMAILS ne crée plus de super admin (le champ
// isAdmin n'est plus dérivé de l'inscription — voir userSignupFields.ts).
// La variable reste acceptée pour compatibilité avec l'existant (Railway),
// mais n'a PLUS AUCUN EFFET sur les droits. Le premier SUPER_ADMIN vient du
// seed ; les suivants d'une invitation SUPER_ADMIN.
export const authEnvSchema = z.object({
    ADMIN_EMAILS: z
        .string()
        .default("")
        .transform((val) => val
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)),
});
