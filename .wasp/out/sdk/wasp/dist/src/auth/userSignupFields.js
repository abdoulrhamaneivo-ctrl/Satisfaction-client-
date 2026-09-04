import { defineUserSignupFields } from "wasp/auth/providers/types";
import { z } from "zod";
// SAAS (Doc 11 §3.3) : AUCUN champ de privilège n'est dérivé de l'inscription.
// - isAdmin n'est plus posé ici (l'ancien ADMIN_EMAILS fabriquait des admins
//   depuis une simple liste de config — faille si la config fuit).
// - platformRole = 'NONE' par défaut en base (migration) ; un SUPER_ADMIN ne
//   peut naître QUE du seed initial ou d'une invitation émise par un
//   SUPER_ADMIN existant (action inviterSuperAdmin, console /platform).
// - Les comptes clients (DIRECTION etc.) sont créés par creerEntreprise /
//   inviteAgent, jamais par inscription publique.
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
});
//# sourceMappingURL=userSignupFields.js.map