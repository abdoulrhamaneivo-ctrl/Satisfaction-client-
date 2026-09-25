// ============================================================================
// Migration de données C6a (J+7) : rechiffrement des secrets TOTP (User.totp_secret)
// ============================================================================
// Contexte : avant C6a, les secrets étaient chiffrés avec JWT_SECRET (avec en
// plus un fallback 'DEVJWTSECRET'). Depuis C6a, le chiffrement utilise la clé
// dédiée TOTP_ENCRYPTION_KEY. Ce script rechiffre chaque ligne existante avec
// la clé primaire — aucune modification de schéma (totp_secret reste TEXT,
// `wasp db migrate-dev` n'a donc rien à générer).
//
// Pré-requis d'env : DATABASE_URL + nouvelle TOTP_ENCRYPTION_KEY (+ les clés
// previous / JWT_SECRET* nécessaires au déchiffrement des lignes historiques).
//
// Usage (Node ≥ 22.18, exécution directe sans build) :
//   1. Dry-run (recommandé d'abord) :
//        set -a; source .env.server; set +a
//        node src/server/scripts/rotationCleTotp.ts
//   2. Appliquer :
//        node src/server/scripts/rotationCleTotp.ts --appliquer
//
// Procédure de rotation complète :
//   a. Générer la nouvelle clé : openssl rand -hex 32
//   b. Poser TOTP_ENCRYPTION_KEY=<nouvelle> + TOTP_ENCRYPTION_KEY_PREVIOUS=<ancienne>
//      (ou conserver JWT_SECRET=<ancien> pour les lignes pré-C6a).
//   c. Dry-run puis --appliquer ce script.
//   d. Vérifier : 0 ligne « à rechiffrer », 0 échec.
//   e. Retirer les clés *_PREVIOUS (et l'héritage JWT_SECRET une fois migré).
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { chiffrerSecretTotp, dechiffrerSecretTotpAvecStatut } from '../totp';

const APPLIQUER = process.argv.includes('--appliquer');

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const comptes = await prisma.user.findMany({
      where: { totp_secret: { not: null } },
      select: { id: true, totp_secret: true },
    });
    console.log(`[rotation-totp] ${comptes.length} compte(s) avec totp_secret. Mode : ${APPLIQUER ? 'APPLIQUER' : 'dry-run'}.`);

    let dejaAJour = 0;
    let rechiffres = 0;
    const echecs: Array<{ id: string; erreur: string }> = [];

    for (const compte of comptes) {
      const stocke = compte.totp_secret as string;
      let statut;
      try {
        statut = dechiffrerSecretTotpAvecStatut(stocke);
      } catch (e) {
        // Aucune clé configurée ne déchiffre : action manuelle requise
        // (clé perdue ou données altérées) — ne jamais effacer la ligne.
        echecs.push({ id: compte.id, erreur: e instanceof Error ? e.message : String(e) });
        console.error(`[rotation-totp] ÉCHEC déchiffrement user=${compte.id} (ligne conservée telle quelle).`);
        continue;
      }
      if (!statut.doitRechiffrer) {
        dejaAJour++;
        continue;
      }
      console.log(`[rotation-totp] user=${compte.id} déchiffré via ${statut.cleUtilisee} → rechiffrement requis.`);
      if (APPLIQUER) {
        await prisma.user.update({
          where: { id: compte.id },
          data: { totp_secret: chiffrerSecretTotp(statut.secret) },
        });
        rechiffres++;
      }
    }

    const aRechiffrer = comptes.length - dejaAJour - echecs.length - rechiffres;
    console.log(
      `[rotation-totp] Résultat : ${dejaAJour} déjà à jour, ` +
        (APPLIQUER
          ? `${rechiffres} rechiffré(s), ${echecs.length} échec(s).`
          : `${comptes.length - dejaAJour - echecs.length} à rechiffrer (relancez avec --appliquer), ${echecs.length} échec(s).`)
    );
    if (!APPLIQUER && aRechiffrer > 0) {
      console.log('[rotation-totp] Dry-run : aucune écriture effectuée.');
    }
    if (echecs.length > 0) {
      console.error(`[rotation-totp] ${echecs.length} ligne(s) NON migrable(s) — voir ci-dessus, intervention manuelle requise.`);
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[rotation-totp] Erreur fatale :', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
