import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => ({
  subject: "Vérifiez votre adresse e-mail",
  text: `Cliquez sur le lien ci-dessous pour vérifier votre adresse e-mail : ${verificationLink}`,
  html: `
        <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse e-mail</p>
        <a href="${verificationLink}">Vérifier mon e-mail</a>
    `,
});

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => ({
  subject: "Réinitialisation de votre mot de passe",
  text: `Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe : ${passwordResetLink}`,
  html: `
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe</p>
        <a href="${passwordResetLink}">Réinitialiser mon mot de passe</a>
    `,
});
