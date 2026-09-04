// src/user/accountsActions.ts
//
// Actions du compte personnel (page "Paramètres du compte") : modification
// des informations de profil, changement d'e-mail et changement de mot de
// passe. Distinctes des actions d'administration (inviteAgent, etc.) —
// celles-ci n'agissent JAMAIS que sur le compte de l'utilisateur connecté
// lui-même (context.user.id), jamais sur un id fourni par le client.

import { HttpError, prisma } from 'wasp/server';
import { type User } from 'wasp/entities';
import {
  createProviderId,
  findAuthIdentity,
  updateAuthIdentityProviderData,
  getProviderDataWithPassword,
} from 'wasp/server/auth';
import { Argon2id } from 'oslo/password';
import * as z from 'zod';
import { requireAuth } from '../server/middleware/rowLevelSecurity';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';

// ─────────────────────────────────────────────
// 1. Modifier le profil (nom, prénom, téléphone)
// ─────────────────────────────────────────────

const updateProfileSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis.').max(100),
  prenom: z.string().trim().min(1, 'Le prénom est requis.').max(100),
  telephone: z.string().trim().max(30).optional(),
});

export const updateProfile = async (rawArgs: unknown, context: any): Promise<User> => {
  requireAuth(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateProfileSchema, rawArgs);

  return context.entities.User.update({
    where: { id: context.user.id },
    data: {
      nom: args.nom,
      prenom: args.prenom,
      telephone: args.telephone,
    },
  });
};

// ─────────────────────────────────────────────
// 2. Changer le mot de passe (nécessite l'ancien)
// ─────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis.'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.'),
});

export const changePassword = async (rawArgs: unknown, context: any): Promise<{ success: true }> => {
  requireAuth(context);
  const args = ensureArgsSchemaOrThrowHttpError(changePasswordSchema, rawArgs);

  if (!context.user.email) {
    throw new HttpError(400, "Ce compte n'a pas d'adresse e-mail associée.");
  }

  const providerId = createProviderId('email', context.user.email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new HttpError(404, "Identifiant de connexion introuvable pour ce compte.");
  }

  // Vérifie le mot de passe actuel avant d'autoriser le changement — sans
  // cette étape, n'importe qui avec une session active pourrait changer le
  // mot de passe d'un compte volé/laissé ouvert sans jamais le connaître.
  const providerData = getProviderDataWithPassword<'email'>(authIdentity.providerData);
  const argon2id = new Argon2id();
  const motDePasseValide = await argon2id.verify(providerData.hashedPassword, args.currentPassword);
  if (!motDePasseValide) {
    throw new HttpError(401, 'Mot de passe actuel incorrect.');
  }

  await updateAuthIdentityProviderData(providerId, providerData, {
    hashedPassword: args.newPassword,
  });

  // Une fois le mot de passe changé volontairement, la contrainte de
  // changement obligatoire (premier compte du seed) n'a plus lieu d'être.
  await context.entities.User.update({
    where: { id: context.user.id },
    data: { mustChangePassword: false },
  });

  return { success: true };
};

// ─────────────────────────────────────────────
// 3. Changer l'adresse e-mail (nécessite le mot de passe)
// ─────────────────────────────────────────────

const changeEmailSchema = z.object({
  newEmail: z.string().trim().email("Adresse e-mail invalide."),
  currentPassword: z.string().min(1, 'Mot de passe requis pour confirmer ce changement.'),
});

export const changeEmail = async (rawArgs: unknown, context: any): Promise<User> => {
  requireAuth(context);
  const args = ensureArgsSchemaOrThrowHttpError(changeEmailSchema, rawArgs);

  if (!context.user.email) {
    throw new HttpError(400, "Ce compte n'a pas d'adresse e-mail associée.");
  }
  const nouvelEmail = args.newEmail.toLowerCase();
  if (nouvelEmail === context.user.email.toLowerCase()) {
    return context.entities.User.findUniqueOrThrow({ where: { id: context.user.id } });
  }

  const providerId = createProviderId('email', context.user.email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new HttpError(404, "Identifiant de connexion introuvable pour ce compte.");
  }

  // Confirmation par mot de passe : changer l'e-mail change l'identifiant de
  // connexion — une simple session active ne doit pas suffire (ex. poste
  // partagé, session oubliée ouverte).
  const providerData = getProviderDataWithPassword<'email'>(authIdentity.providerData);
  const argon2id = new Argon2id();
  const motDePasseValide = await argon2id.verify(providerData.hashedPassword, args.currentPassword);
  if (!motDePasseValide) {
    throw new HttpError(401, 'Mot de passe incorrect.');
  }

  const dejaUtilise = await context.entities.User.findFirst({
    where: { email: nouvelEmail, id: { not: context.user.id } },
  });
  if (dejaUtilise) {
    throw new HttpError(409, 'Cette adresse e-mail est déjà utilisée par un autre compte.');
  }

  // L'e-mail est à la fois une donnée du User ET l'identifiant unique de
  // l'AuthIdentity (providerUserId) pour la méthode "email". Les deux
  // doivent changer ensemble, dans une transaction, sinon le compte se
  // retrouve dans un état incohérent (connectable avec un e-mail affiché
  // différent de celui qu'il faut taper pour se connecter).
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({ where: { id: context.user.id }, data: { email: nouvelEmail } }),
    prisma.authIdentity.update({
      where: {
        providerName_providerUserId: {
          providerName: 'email',
          providerUserId: context.user.email,
        },
      },
      data: { providerUserId: nouvelEmail },
    }),
  ]);

  return updatedUser;
};