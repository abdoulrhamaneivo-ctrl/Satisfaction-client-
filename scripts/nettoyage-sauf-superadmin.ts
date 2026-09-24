/**
 * Nettoyage base Yeba — garde UNIQUEMENT les comptes SUPER_ADMIN (+ leur Auth).
 * Usage:
 *   npx tsx scripts/nettoyage-sauf-superadmin.ts --dry-run   # compte seulement (défaut, sans danger)
 *   CONFIRM=OUI npx tsx scripts/nettoyage-sauf-superadmin.ts --execute  # SUPPRESSION RÉELLE
 *
 * Pré-requis: DATABASE_URL défini (.env.server sourcé ou exporté).
 * Ne touche JAMAIS à: _prisma_migrations, tables pgboss.*, ni aux Users
 * avec platformRole='SUPER_ADMIN' (ni leur Auth/AuthIdentity/Session).
 * Ordre feuille→racine pour respecter les FK (Prisma, pas de TRUNCATE brutal).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const CONFIRM = process.env.CONFIRM === 'OUI';

async function counts() {
  const c: Record<string, number> = {};
  c.superAdmins = await prisma.user.count({ where: { platformRole: 'SUPER_ADMIN' } });
  c.autresUsers = await prisma.user.count({ where: { NOT: { platformRole: 'SUPER_ADMIN' } } });
  c.entreprises = await prisma.entreprise.count();
  c.agences = await prisma.agence.count();
  c.guichets = await prisma.guichet.count();
  c.reponses = await prisma.reponse.count();
  c.alertes = await prisma.alerte.count();
  c.taches = await prisma.tacheCorrective.count();
  c.historiquesTaches = await prisma.tacheCorrectiveHistorique.count();
  c.analysesIA = await prisma.analyseAvisIA.count();
  c.affectations = await prisma.affectationGuichet.count();
  c.modelesHoraires = await prisma.modeleHoraire.count();
  c.invitations = await prisma.invitation.count();
  c.auditLogs = await prisma.auditLog.count();
  c.files = await prisma.file.count();
  c.objectifs = await prisma.objectif.count();
  c.statistiques = await prisma.statistiquesMensuelles.count();
  c.votesAntiRejeu = await prisma.voteAntiRejeu.count();
  c.criteres = await prisma.critere.count();
  c.services = await prisma.service.count();
  c.canaux = await prisma.canal.count();
  c.brandings = await prisma.brandingConfig.count();
  c.sessions = await prisma.session.count();
  return c;
}

async function main() {
  console.log('── Yeba nettoyage (sauf SUPER_ADMIN) ──');
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (destructif)' : 'DRY-RUN (lecture seule)'}`);

  const supers = await prisma.user.findMany({
    where: { platformRole: 'SUPER_ADMIN' },
    select: { id: true, email: true, username: true, actif: true, isAdmin: true },
  });
  console.log(`SUPER_ADMIN trouvés: ${supers.length}`);
  for (const s of supers) console.log(`  - ${s.email ?? s.username ?? s.id} (id=${s.id}, actif=${s.actif}, isAdmin=${s.isAdmin})`);

  if (supers.length === 0) {
    console.error('ABANDON: aucun SUPER_ADMIN en base — refus de nettoyer (risque de lock-out total).');
    process.exit(1);
  }

  const avant = await counts();
  console.table(avant);

  if (!EXECUTE) {
    console.log('\nDry-run terminé, aucune suppression. Relance avec --execute + CONFIRM=OUI pour nettoyer.');
    return;
  }
  if (!CONFIRM) {
    console.error('ABANDON: --execute exige CONFIRM=OUI (ex. CONFIRM=OUI npx tsx ... --execute).');
    process.exit(1);
  }

  const superIds = supers.map((s) => s.id);

  // Ordre feuille → racine. Auth/Session des autres users partent via cascade
  // du delete User, mais on nettoie explicitement Invitations/Audit/File avant.
  // Le SUPER_ADMIN hérité du seed mono-opérateur pointe vers agence/entreprise
  // (id_agence=1, id_entreprise=1) : on le détache (scope plateforme, NULL)
  // AVANT de supprimer Agences/Entreprises, sinon les DELETE violent la FK.
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: { in: superIds } },
      data: { id_agence: null, id_entreprise: null },
    });
    await tx.tacheCorrectiveHistorique.deleteMany({});
    await tx.tacheCorrective.deleteMany({});
    await tx.alerte.deleteMany({});
    await tx.analyseAvisIA.deleteMany({});
    await tx.reponse.deleteMany({});
    await tx.voteAntiRejeu.deleteMany({});
    await tx.statistiquesMensuelles.deleteMany({});
    await tx.affectationGuichet.deleteMany({});
    await tx.modeleHoraire.deleteMany({});
    await tx.objectif.deleteMany({});
    await tx.agenceCritere.deleteMany({});
    await tx.critereService.deleteMany({});
    // Table de jonction implicite Guichet↔Service (nom Prisma par défaut)
    await tx.$executeRawUnsafe('DELETE FROM "_GuichetToService"').catch(() => {});
    await tx.invitation.deleteMany({});
    await tx.auditLog.deleteMany({});
    await tx.file.deleteMany({});
    await tx.logs.deleteMany({});
    await tx.brandingConfig.deleteMany({});
    await tx.guichet.deleteMany({});
    await tx.agence.deleteMany({});
    await tx.service.deleteMany({});
    await tx.critere.deleteMany({});
    // Canal: référencé par Reponse (déjà vide) → supprimable. Recréé par le seed.
    await tx.canal.deleteMany({});
    await tx.entreprise.deleteMany({});
    // Sessions/Auth des comptes supprimés : le delete User cascade vers Auth
    // (Auth.userId → User onDelete Cascade → AuthIdentity/Session), mais on
    // purge d'abord les sessions orphelines par sécurité.
    const autres = await tx.user.findMany({
      where: { id: { notIn: superIds } },
      select: { id: true },
    });
    const autresIds = autres.map((u) => u.id);
    if (autresIds.length > 0) {
      await tx.session.deleteMany({ where: { userId: { in: autresIds } } });
      const auths = await tx.auth.findMany({
        where: { userId: { in: autresIds } },
        select: { id: true },
      });
      const authIds = auths.map((a) => a.id);
      if (authIds.length > 0) {
        await tx.authIdentity.deleteMany({ where: { authId: { in: authIds } } });
        await tx.session.deleteMany({ where: { userId: { in: authIds } } }).catch(() => {});
        await tx.auth.deleteMany({ where: { id: { in: authIds } } });
      }
      const del = await tx.user.deleteMany({ where: { id: { in: autresIds } } });
      console.log(`Users non-super-admin supprimés: ${del.count}`);
    } else {
      console.log('Aucun autre user à supprimer.');
    }
  }, { timeout: 120000, maxWait: 30000 });

  console.log('\n── Après nettoyage ──');
  console.table(await counts());
  console.log('OK: seuls les SUPER_ADMIN (+ leur Auth) subsistent. Relance le seed si besoin: wasp db seed');
}

main()
  .catch((e) => {
    console.error('ERREUR nettoyage:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
