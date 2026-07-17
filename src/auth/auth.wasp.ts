import {
  page,
  route,
  type Auth,
  type AuthMethods,
  type Spec,
} from "@wasp.sh/spec";

import { LoginPage } from "./LoginPage" with { type: "ref" };
import { PostAuthRedirectPage } from "./PostAuthRedirectPage" with { type: "ref" };
import { EmailVerificationPage } from "./email-and-pass/EmailVerificationPage" with { type: "ref" };
import { PasswordResetPage } from "./email-and-pass/PasswordResetPage" with { type: "ref" };
import { RequestPasswordResetPage } from "./email-and-pass/RequestPasswordResetPage" with { type: "ref" };
import {
  getPasswordResetEmailContent,
  getVerificationEmailContent,
} from "./email-and-pass/emails" with { type: "ref" };
import { getEmailUserFields } from "./userSignupFields" with { type: "ref" };

const emailAuthMethod: NonNullable<AuthMethods["email"]> = {
  fromField: {
    name: "CXSAT Abidjan",
    email: "abdoulrhamane.ivo@gmail.com",
  },
  emailVerification: {
    clientRoute: "EmailVerificationRoute",
    getEmailContentFn: getVerificationEmailContent,
  },
  passwordReset: {
    clientRoute: "PasswordResetRoute",
    getEmailContentFn: getPasswordResetEmailContent,
  },
  userSignupFields: getEmailUserFields,
};

// Seule l'authentification par e-mail/mot de passe est activée. Les comptes
// sont créés exclusivement par invitation (action inviteAgent) — il n'y a
// pas d'inscription publique.

// 🔐 Auth out of the box! https://wasp.sh/docs/auth/overview
export const authConfig: Auth = {
  userEntity: "User",
  methods: {
    // NOTE: If you decide to not use email auth, make sure to also delete the related routes below.
    //       (RequestPasswordResetRoute, PasswordResetRoute, EmailVerificationRoute)
    email: emailAuthMethod,
    // usernameAndPassword: usernameAndPasswordAuthMethod,
    // google: googleAuthMethod,
    // gitHub: gitGubAuthMethod,
    // discord: discordAuthMethod,
  },
  onAuthFailedRedirectTo: "/login",
  // Ancienne valeur "/demo-app" : reliquat du template Open SaaS (démo IA)
  // sans rapport avec CXSAT. On route désormais vers une page d'arbitrage
  // qui envoie l'utilisateur vers /dashboard (tous les comptes, y compris
  // le compte CHEF_AGENCE créé par le seed initial, sont déjà rattachés à
  // une agence dès leur création — il n'y a plus d'onboarding à faire).
  onAuthSucceededRedirectTo: "/apres-connexion",
};

export const authSpec: Spec = [
  route("LoginRoute", "/login", page(LoginPage)),
  route("PostAuthRedirectRoute", "/apres-connexion", page(PostAuthRedirectPage)),
  route(
    "RequestPasswordResetRoute",
    "/request-password-reset",
    page(RequestPasswordResetPage),
  ),
  route("PasswordResetRoute", "/password-reset", page(PasswordResetPage)),
  route(
    "EmailVerificationRoute",
    "/email-verification",
    page(EmailVerificationPage),
  ),
];