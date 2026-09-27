/**
 * Crée le compte SUPER_ADMIN plateforme (opération ponctuelle).
 * Usage: SUPER_EMAIL=... node scripts/creer-superadmin.ts
 *
 * - Idempotent : si l'email existe déjà en SUPER_ADMIN, on s'assure juste
 *   des champs (actif, isAdmin, scope plateforme NULL) sans toucher au
 *   mot de passe. Si l'email existe en NON super-admin : ABANDON (jamais
 *   de détournement d'un compte tenant).
 * - Le mot de passe posé ici est ALÉATOIRE (jamais celui d'exploitation) :
 *   passe ensuite par `scripts/reset-superadmin-password.ts` avec le vrai
 *   mot de passe via SUPER_PASS (env, jamais loggé, jamais en argument).
 * - Ne loggue AUCUN secret (email + ids seulement).
 */
import { PrismaClient } from '@prisma/client';
import { Argon2id } from 'oslo/password';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPER_EMAIL || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('ABANDON: SUPER_EMAIL manquant ou invalide.');
    process.exit(1);
  }

  const existant: any = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    if (existant.platformRole !== 'SUPER_ADMIN') {
      console.error(`ABANDON: ${email} existe déjà en ${existant.platformRole} — refus de le promouvoir ici.`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { id: existant.id },
      data: { actif: true, isAdmin: true, id_agence: null, id_entreprise: null, mustChangePassword: false },
    });
    console.log(`OK: SUPER_ADMIN ${email} déjà présent (id=${existant.id}) — champs vérifiés, mot de passe inchangé.`);
    return;
  }

  const userId = crypto.randomUUID();
  const authId = crypto.randomUUID();
  // Mot de passe jetable : seul `reset-superadmin-password.ts` pose le vrai.
  const jetable = crypto.randomBytes(18).toString('base64url');
  const hashed = await new Argon2id().hash(jetable);

  await prisma.user.create({
    data: {
      id: userId,
      email,
      username: email,
      // Rôle métier le plus faible : un compte plateforme ne doit passer
      // AUCUN requireRole tenant. L'accès plateforme vient de platformRole.
      role: 'AGENT',
      platformRole: 'SUPER_ADMIN',
      isAdmin: true,
      actif: true,
      mustChangePassword: false,
      id_agence: null,
      id_entreprise: null,
    },
  });
  await prisma.auth.create({ data: { id: authId, userId } });
  await prisma.authIdentity.create({
    data: {
      providerName: 'email',
      providerUserId: email,
      providerData: JSON.stringify({
        hashedPassword: hashed,
        isEmailVerified: true,
        emailVerificationSentAt: null,
        passwordResetSentAt: null,
      }),
      authId,
    },
  });
  console.log(`OK: SUPER_ADMIN ${email} créé (user=${userId}). Mot de passe jetable — passe par reset-superadmin-password.ts.`);
}

main()
  .catch((e) => {
    console.error('ERREUR création super-admin:', e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
