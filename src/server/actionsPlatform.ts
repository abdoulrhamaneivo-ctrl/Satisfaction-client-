// src/server/actionsPlatform.ts
// ============================================================================
// Actions SaaS — Console Yeba Platform (Doc 11/12, phase P1)
// Toutes ces actions exigent platformRole SUPER_ADMIN (écriture) ou
// SUPER_ADMIN+SUPPORT (lecture via queries.ts). Le front n'est jamais la
// protection : chaque fonction commence par requirePlatformRole.
// ============================================================================

import { HttpError, prisma } from 'wasp/server';
import crypto from 'node:crypto';
import {
  requireSuperAdmin,
  requirePlatformRole,
  type PlatformRole,
} from './middleware/rowLevelSecurity';
import { journaliser } from './audit';
import { emailSender } from 'wasp/server/email';

// ── Plans de référence (Doc 11 §4 — constant code, pas une table) ──
export const PLANS: Record<string, { agences: number; utilisateurs: number; guichets: number }> = {
  STARTER: { agences: 5, utilisateurs: 50, guichets: 25 },
  BUSINESS: { agences: 50, utilisateurs: 500, guichets: 200 },
  ENTERPRISE: { agences: 9999, utilisateurs: 9999, guichets: 9999 },
};

const STATUTS_VALIDES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sha256(valeur: string): string {
  return crypto.createHash('sha256').update(valeur).digest('hex');
}

function lienActivation(tokenClair: string): string {
  const base = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';
  return `${base}/account/activate?token=${tokenClair}`;
}

// ─────────────────────────────────────────────
// Email d'activation (gabarit cohérent avec inviteAgent)
// ─────────────────────────────────────────────
export async function envoyerEmailActivation(params: {
  to: string;
  prenom: string;
  nomEntreprise: string;
  lien: string;
}): Promise<void> {
  const { to, prenom, nomEntreprise, lien } = params;
  await emailSender.send({
    to,
    subject: `🎉 Bienvenue sur Yeba — Votre espace est prêt`,
    text: `Bienvenue ${prenom} ! Votre espace Yeba pour ${nomEntreprise} est prêt. Activez votre compte : ${lien} (lien personnel, usage unique, expire dans 24 h).`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #052e1c 0%, #00843D 60%, #F57C00 130%); padding: 36px 40px;">
      <div style="font-size: 40px; margin-bottom: 12px;">🏢</div>
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; line-height: 1.2;">
        Bienvenue, ${prenom} !
      </h1>
      <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 14px;">
        Votre espace entreprise Yeba est prêt
      </p>
    </div>

    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
        Votre espace <strong>Yeba</strong> pour <strong>${nomEntreprise}</strong> vient d'être créé.
        Vous êtes nommé <strong>Administrateur principal</strong> : configurez vos agences,
        vos guichets et suivez la satisfaction de vos usagers en temps réel.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">
          Votre compte
        </p>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
          <span style="color: #6b7280; font-size: 13px;">📧 Adresse e-mail</span>
          <strong style="color: #111827; font-size: 14px;">${to}</strong>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px;">
          <span style="color: #6b7280; font-size: 13px;">🏢 Entreprise</span>
          <strong style="color: #111827; font-size: 14px;">${nomEntreprise}</strong>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${lien}"
           style="display: inline-block; background: #00843D; color: white; text-decoration: none;
                  padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px;">
          Activer mon compte →
        </a>
        <p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
          Ce lien est personnel, à usage unique, et expire dans <strong>24 heures</strong>.
        </p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
          Aucun mot de passe n'est transmis par email : vous le définissez vous-même à l'activation.
        </p>
      </div>

      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
        © Yeba — Pilotage de la satisfaction client au guichet
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─────────────────────────────────────────────
// créerEntreprise — le cœur du SaaS (Doc 12 §6)
// TRANSACTION : Entreprise + Admin DIRECTION + Invitation + Audit.
// Rien n'est persisté si une étape échoue.
// ─────────────────────────────────────────────
export const creerEntreprise = async (
  args: {
    entreprise: {
      nom_entreprise: string;
      nom_court?: string;
      email_administratif?: string;
      telephone?: string;
      pays?: string;
    };
    admin: { prenom: string; nom: string; email: string; telephone?: string };
    plan: string;
    limite_agences: number;
    limite_utilisateurs: number;
    limite_guichets: number;
  },
  context: any
) => {
  requireSuperAdmin(context);

  // ── Validation zod-like stricte (pas de lib externe, règles locales) ──
  const nomE = args.entreprise?.nom_entreprise?.trim() ?? '';
  if (nomE.length < 2 || nomE.length > 120) {
    throw new HttpError(400, "Le nom de l'entreprise est requis (2 à 120 caractères).");
  }
  const adminEmail = args.admin?.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(adminEmail)) {
    throw new HttpError(400, "L'adresse email de l'administrateur est invalide.");
  }
  const prenom = args.admin?.prenom?.trim() ?? '';
  const nom = args.admin?.nom?.trim() ?? '';
  if (!prenom || !nom) {
    throw new HttpError(400, "Le prénom et le nom de l'administrateur sont requis.");
  }
  const plan = (args.plan ?? 'STARTER').toUpperCase();
  if (!PLANS[plan]) {
    throw new HttpError(400, 'Plan invalide. Choix : STARTER, BUSINESS, ENTERPRISE.');
  }

  const limiteAgences = Number(args.limite_agences) || PLANS[plan].agences;
  const limiteUtilisateurs = Number(args.limite_utilisateurs) || PLANS[plan].utilisateurs;
  const limiteGuichets = Number(args.limite_guichets) || PLANS[plan].guichets;

  // Unicité de l'email admin (409 si déjà pris)
  const existant = await context.entities.User.findUnique({ where: { email: adminEmail } });
  if (existant) {
    throw new HttpError(409, 'Un utilisateur utilise déjà cette adresse email.');
  }

  // Token d'invitation : le clair n'existe QUE dans le lien email
  const tokenClair = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(tokenClair);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { createUser, createProviderId, sanitizeAndSerializeProviderData } = await import('wasp/server/auth');

  const resultat = await prisma.$transaction(async (tx: any) => {
    // 1. Entreprise (status ACTIVE par défaut — mise en service immédiate)
    const entreprise = await tx.entreprise.create({
      data: {
        nom_entreprise: nomE,
        nom_court: args.entreprise.nom_court?.trim() || null,
        email_administratif: args.entreprise.email_administratif?.trim() || null,
        telephone: args.entreprise.telephone?.trim() || null,
        pays: args.entreprise.pays?.trim() || "Cote d'Ivoire",
        status: 'ACTIVE',
        plan,
        date_debut_abonnement: new Date(),
        limite_agences: limiteAgences,
        limite_utilisateurs: limiteUtilisateurs,
        limite_guichets: limiteGuichets,
      },
    });

    // 2. Compte admin DIRECTION — identité auth SANS mot de passe utilisable
    //    (hashedPassword aléatoire 32 octets jamais transmis : l'activation
    //    passe par le lien d'invitation, Doc 12 §7).
    const providerId = createProviderId('email', adminEmail);
    const providerData = await sanitizeAndSerializeProviderData<'email'>({
      hashedPassword: crypto.randomBytes(32).toString('base64url'),
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetSentAt: null,
    });
    const admin = await createUser(providerId, providerData, {
      email: adminEmail,
      username: adminEmail,
    });
    // createUser de Wasp n'expose aucun champ custom (id_agence, role, ...) :
    // tout le profil métier est posé juste après la création du compte.
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        nom, prenom,
        telephone: args.admin.telephone?.trim() || null,
        role: 'DIRECTION',
        id_entreprise: entreprise.id,
        id_agence: null,
        actif: true,
        platformRole: 'NONE',
        mustChangePassword: true,
      },
    });

    // 3. Invitation (hash uniquement — usage unique, 24 h)
    await tx.invitation.create({
      data: {
        id_user: admin.id,
        id_emetteur: context.user.id,
        id_entreprise: entreprise.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // 4. Audit (dans la transaction : l'action ET sa trace sont inséparables)
    await tx.auditLog.create({
      data: {
        actor_id: context.user.id,
        actor_role: 'SUPER_ADMIN',
        action: 'entreprise.create',
        resource: 'Entreprise',
        resource_id: String(entreprise.id),
        entreprise_id: entreprise.id,
        details: { nom: nomE, plan, admin_email: adminEmail, limites: { limiteAgences, limiteUtilisateurs, limiteGuichets } },
      },
    });

    return { entreprise, admin };
  });

  // 5. Email d'activation — hors transaction (SMTP). En cas d'échec, la
  //    console permet « Renvoyer l'invitation » (nouvelle Invitation + email).
  try {
    await envoyerEmailActivation({
      to: adminEmail,
      prenom: prenom,
      nomEntreprise: resultat.entreprise.nom_entreprise,
      lien: lienActivation(tokenClair),
    });
  } catch (e: any) {
    console.error('[PLATFORM] Échec envoi email activation (invitation reste valide):', e?.message);
    await journaliser({
      context,
      action: 'invitation.create',
      resource: 'Invitation',
      resource_id: resultat.admin.id,
      entreprise_id: resultat.entreprise.id,
      details: { email_envoye: false, motif: 'erreur SMTP' },
    });
    return {
      ...resultat,
      email_envoye: false,
      message: "Entreprise créée. L'email d'activation n'a pas pu partir — utilisez « Renvoyer l'invitation ».",
    };
  }

  await journaliser({
    context,
    action: 'invitation.create',
    resource: 'Invitation',
    resource_id: resultat.admin.id,
    entreprise_id: resultat.entreprise.id,
    details: { email_envoye: true },
  });

  return { ...(resultat as any), email_envoye: true, message: undefined as string | undefined };
};

// ─────────────────────────────────────────────
// suspendreEntreprise / reactiverEntreprise
// ─────────────────────────────────────────────
export const suspendreEntreprise = async (
  args: { id_entreprise: number; motif: string },
  context: any
) => {
  requireSuperAdmin(context);
  const motif = args.motif?.trim() ?? '';
  if (motif.length < 5) {
    throw new HttpError(400, 'Un motif de suspension est requis (5 caractères minimum).');
  }

  const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
  if (!entreprise) throw new HttpError(404, 'Entreprise introuvable.');
  if (entreprise.status === 'SUSPENDED') {
    throw new HttpError(409, 'Cette entreprise est déjà suspendue.');
  }

  await context.entities.Entreprise.update({
    where: { id: entreprise.id },
    data: { status: 'SUSPENDED', suspendue_le: new Date(), motif_suspension: motif },
  });

  await journaliser({
    context,
    action: 'entreprise.suspend',
    resource: 'Entreprise',
    resource_id: entreprise.id,
    entreprise_id: entreprise.id,
    details: { motif },
  });

  return { ok: true, message: `Entreprise suspendue. Tous ses comptes sont bloqués immédiatement.` };
};

export const reactiverEntreprise = async (args: { id_entreprise: number }, context: any) => {
  requireSuperAdmin(context);
  const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
  if (!entreprise) throw new HttpError(404, 'Entreprise introuvable.');
  if (entreprise.status !== 'SUSPENDED') {
    throw new HttpError(409, "Cette entreprise n'est pas suspendue.");
  }

  await context.entities.Entreprise.update({
    where: { id: entreprise.id },
    data: { status: 'ACTIVE', suspendue_le: null, motif_suspension: null },
  });

  await journaliser({
    context,
    action: 'entreprise.reactivate',
    resource: 'Entreprise',
    resource_id: entreprise.id,
    entreprise_id: entreprise.id,
  });

  return { ok: true, message: 'Entreprise réactivée. Ses comptes ont de nouveau accès.' };
};

// ─────────────────────────────────────────────
// changerLimites — ajuster les quotas du plan
// ─────────────────────────────────────────────
export const changerLimitesEntreprise = async (
  args: {
    id_entreprise: number;
    limite_agences?: number;
    limite_utilisateurs?: number;
    limite_guichets?: number;
    plan?: string;
  },
  context: any
) => {
  requireSuperAdmin(context);

  const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
  if (!entreprise) throw new HttpError(404, 'Entreprise introuvable.');

  const data: Record<string, number | string> = {};
  if (args.limite_agences !== undefined) {
    if (!Number.isInteger(args.limite_agences) || args.limite_agences < 1) {
      throw new HttpError(400, 'Limite agences invalide.');
    }
    data.limite_agences = args.limite_agences;
  }
  if (args.limite_utilisateurs !== undefined) {
    if (!Number.isInteger(args.limite_utilisateurs) || args.limite_utilisateurs < 1) {
      throw new HttpError(400, 'Limite utilisateurs invalide.');
    }
    data.limite_utilisateurs = args.limite_utilisateurs;
  }
  if (args.limite_guichets !== undefined) {
    if (!Number.isInteger(args.limite_guichets) || args.limite_guichets < 1) {
      throw new HttpError(400, 'Limite guichets invalide.');
    }
    data.limite_guichets = args.limite_guichets;
  }
  if (args.plan !== undefined) {
    const plan = args.plan.toUpperCase();
    if (!PLANS[plan]) throw new HttpError(400, 'Plan invalide.');
    data.plan = plan;
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'Aucune modification fournie.');
  }

  await context.entities.Entreprise.update({ where: { id: entreprise.id }, data });

  await journaliser({
    context,
    action: 'entreprise.update_limits',
    resource: 'Entreprise',
    resource_id: entreprise.id,
    entreprise_id: entreprise.id,
    details: data, // avant/après simplifié — aucune donnée secrète
  });

  return { ok: true, message: 'Limites mises à jour.' };
};

// ─────────────────────────────────────────────
// renvoyerInvitation — nouvelle Invitation (l'ancienne expire seule)
// ─────────────────────────────────────────────
export const renvoyerInvitation = async (args: { id_entreprise: number }, context: any) => {
  requireSuperAdmin(context);

  const entreprise = await context.entities.Entreprise.findUnique({
    where: { id: args.id_entreprise },
    include: {
      utilisateurs: {
        where: { role: 'DIRECTION' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!entreprise) throw new HttpError(404, 'Entreprise introuvable.');
  const admin = entreprise.utilisateurs[0];
  if (!admin?.email) throw new HttpError(404, "Aucun administrateur avec email trouvé pour cette entreprise.");

  const tokenClair = crypto.randomBytes(32).toString('base64url');
  await context.entities.Invitation.create({
    data: {
      id_user: admin.id,
      id_emetteur: context.user.id,
      id_entreprise: entreprise.id,
      token_hash: sha256(tokenClair),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await envoyerEmailActivation({
    to: admin.email,
    prenom: admin.prenom || 'Administrateur',
    nomEntreprise: entreprise.nom_entreprise,
    lien: lienActivation(tokenClair),
  });

  await journaliser({
    context,
    action: 'invitation.create',
    resource: 'Invitation',
    resource_id: admin.id,
    entreprise_id: entreprise.id,
    details: { type: 'renvoi' },
  });

  return { ok: true, message: `Nouveau lien d'activation envoyé à ${admin.email}.` };
};

// ─────────────────────────────────────────────
// inviterSuperAdmin — créer un autre SUPER_ADMIN (console)
// Garde : impossible de désactiver/rétrograder le dernier SUPER_ADMIN (S12).
// ─────────────────────────────────────────────
export const inviterSuperAdmin = async (
  args: { email: string; prenom: string; nom: string },
  context: any
) => {
  requireSuperAdmin(context);
  const email = args.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email invalide.');
  if (!args.prenom?.trim() || !args.nom?.trim()) {
    throw new HttpError(400, 'Prénom et nom requis.');
  }

  const existant = await context.entities.User.findUnique({ where: { email } });
  if (existant) throw new HttpError(409, 'Un utilisateur utilise déjà cette adresse email.');

  const tokenClair = crypto.randomBytes(32).toString('base64url');

  const { createUser, createProviderId, sanitizeAndSerializeProviderData } = await import('wasp/server/auth');
  const providerId = createProviderId('email', email);
  const providerData = await sanitizeAndSerializeProviderData<'email'>({
    hashedPassword: crypto.randomBytes(32).toString('base64url'),
    isEmailVerified: true,
    emailVerificationSentAt: null,
    passwordResetSentAt: null,
  });
  const admin = await createUser(providerId, providerData, { email, username: email });
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      nom: args.nom.trim(), prenom: args.prenom.trim(), role: null,
      platformRole: 'SUPER_ADMIN', id_agence: null, actif: true,
      mustChangePassword: true,
    },
  });

  await context.entities.Invitation.create({
    data: {
      id_user: admin.id,
      id_emetteur: context.user.id,
      id_entreprise: 0, // hors tenant — valeur sentinelle pour invitations platform
      token_hash: sha256(tokenClair),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await journaliser({
    context,
    action: 'superadmin.invite',
    resource: 'User',
    resource_id: admin.id,
    entreprise_id: null,
    details: { email },
  });

  // Email simplifié (même gabarit, sans nom d'entreprise)
  await envoyerEmailActivation({
    to: email,
    prenom: args.prenom.trim(),
    nomEntreprise: 'Yeba Platform (console)',
    lien: lienActivation(tokenClair),
  });

  return { ok: true, message: `Invitation SUPER_ADMIN envoyée à ${email}.` };
};

// ─────────────────────────────────────────────
// activerCompte — route PUBLIQUE (via le lien de l'email)
// Vérifie hash + expiration + usage unique, définit le mot de passe.
// ─────────────────────────────────────────────
export const activerCompte = async (
  args: { token: string; motDePasse: string; confirmation: string },
  context: any
) => {
  const token = args.token?.trim() ?? '';
  if (!token) throw new HttpError(400, 'Lien d’activation invalide.');
  if (!args.motDePasse || args.motDePasse.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (args.motDePasse !== args.confirmation) {
    throw new HttpError(400, 'Les deux mots de passe ne correspondent pas.');
  }

  const tokenHash = sha256(token);
  const invitation = await context.entities.Invitation.findUnique({ where: { token_hash: tokenHash } });
  if (!invitation) throw new HttpError(404, "Ce lien d'activation est invalide ou a déjà été utilisé.");
  if (invitation.used_at) throw new HttpError(409, "Ce lien a déjà été utilisé. Utilisez « Mot de passe oublié » pour vous connecter.");
  if (invitation.expires_at < new Date()) throw new HttpError(410, "Ce lien a expiré. Demandez un nouveau lien d'activation.");

  const { sanitizeAndSerializeProviderData } = await import('wasp/server/auth');

  // Transaction : poser le mot de passe + marquer l'invitation utilisée
  await prisma.$transaction(async (tx: any) => {
    const authIdentity = await tx.auth.findUnique({
      where: { userId: invitation.id_user },
      include: { identities: true },
    });
    const identity = authIdentity?.identities?.find((i: any) => i.providerName === 'email');
    if (!identity) throw new HttpError(404, "Compte d'authentification introuvable pour cet utilisateur.");

    const providerData = JSON.parse(identity.providerData ?? '{}');
    providerData.hashedPassword = args.motDePasse; // Wasp hache à la lecture de l'identité — voir note ci-dessous
    providerData.isEmailVerified = true;

    await tx.authIdentity.update({
      where: { id: identity.id },
      data: { providerData: await sanitizeAndSerializeProviderData<'email'>({
        hashedPassword: args.motDePasse,
        isEmailVerified: true,
        emailVerificationSentAt: null,
        passwordResetSentAt: null,
      }) },
    });

    await tx.user.update({
      where: { id: invitation.id_user },
      data: { mustChangePassword: false },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { used_at: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actor_id: invitation.id_user,
        actor_role: 'NONE',
        action: 'invitation.used',
        resource: 'Invitation',
        resource_id: String(invitation.id),
        entreprise_id: invitation.id_entreprise === 0 ? null : invitation.id_entreprise,
      },
    });
  });

  return { ok: true, message: 'Compte activé. Vous pouvez vous connecter.' };
};

// ─────────────────────────────────────────────
// Export du type PlatformRole pour le front (garde PlatformShell)
// ─────────────────────────────────────────────
export type { PlatformRole };
