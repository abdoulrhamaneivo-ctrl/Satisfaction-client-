/**
 * Reset mot de passe SUPER_ADMIN (hors contexte Wasp server).
 * Usage: SUPER_EMAIL=... SUPER_PASS=... npx tsx scripts/reset-superadmin-password.ts
 * Hash Argon2id via oslo (mêmes params que Wasp : m=19456,t=2,p=1).
 */
import { PrismaClient } from '@prisma/client';
import { Argon2id } from 'oslo/password';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_EMAIL || 'abdoulivo5@gmail.com';
  const plain = process.env.SUPER_PASS;
  if (!plain || plain.length < 8) {
    console.error('ABANDON: SUPER_PASS manquant ou < 8 caractères.');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`ABANDON: aucun User avec email=${email}`);
    process.exit(1);
  }
  if (user.platformRole !== 'SUPER_ADMIN') {
    console.error(`ABANDON: ${email} n'est pas SUPER_ADMIN (platformRole=${user.platformRole}).`);
    process.exit(1);
  }
  const identity = await prisma.authIdentity.findUnique({
    where: { providerName_providerUserId: { providerName: 'email', providerUserId: email } },
  });
  if (!identity) {
    console.error('ABANDON: AuthIdentity email introuvable.');
    process.exit(1);
  }
  const argon2id = new Argon2id();
  const hashed = await argon2id.hash(plain);
  const data = JSON.parse(identity.providerData);
  data.hashedPassword = hashed;
  data.isEmailVerified = true;
  await prisma.authIdentity.update({
    where: { providerName_providerUserId: { providerName: 'email', providerUserId: email } },
    data: { providerData: JSON.stringify(data) },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { mustChangePassword: false },
  });
  // Vérif immédiate du hash
  const ok = await argon2id.verify(hashed, plain);
  console.log(`OK: mot de passe mis à jour pour ${email} (vérif hash: ${ok})`);
}

main()
  .catch((e) => {
    console.error('ERREUR reset password:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
