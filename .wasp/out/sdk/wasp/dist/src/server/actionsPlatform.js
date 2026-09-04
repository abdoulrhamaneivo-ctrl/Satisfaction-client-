// src/server/actionsPlatform.ts
// ============================================================================
// Actions SaaS — Console Yeba Platform (Doc 11/12, phase P1)
// Toutes ces actions exigent platformRole SUPER_ADMIN (écriture) ou
// SUPER_ADMIN+SUPPORT (lecture via queries.ts). Le front n'est jamais la
// protection : chaque fonction commence par requirePlatformRole.
// ============================================================================
import { HttpError, prisma } from 'wasp/server';
import crypto from 'node:crypto';
import { requireSuperAdmin, } from './middleware/rowLevelSecurity';
import { journaliser } from './audit';
import { emailSender } from 'wasp/server/email';
import { createUser, createProviderId, sanitizeAndSerializeProviderData, findAuthIdentity, updateAuthIdentityProviderData, getProviderDataWithPassword } from 'wasp/server/auth';
// ── Plans de référence (Doc 11 §4 — constant code, pas une table) ──
export const PLANS = {
    STARTER: { agences: 5, utilisateurs: 50, guichets: 25 },
    BUSINESS: { agences: 50, utilisateurs: 500, guichets: 200 },
    ENTERPRISE: { agences: 9999, utilisateurs: 9999, guichets: 9999 },
};
const STATUTS_VALIDES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function sha256(valeur) {
    return crypto.createHash('sha256').update(valeur).digest('hex');
}
function lienActivation(tokenClair) {
    const base = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';
    return `${base}/account/activate?token=${tokenClair}`;
}
// ─────────────────────────────────────────────
// Email d'activation (gabarit cohérent avec inviteAgent)
// ─────────────────────────────────────────────
export async function envoyerEmailActivation(params) {
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
export const creerEntreprise = async (args, context) => {
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
    // Unicité de l'email admin (409 si déjà pris).
    // CAS FRÉQUENT : une première tentative a expiré côté navigateur (cold
    // start) alors que le serveur avait réussi → le retry retombe ici. Au
    // lieu d'une impasse, on rend une issue de secours : si l'email appartient
    // déjà à un compte rattaché à une entreprise, on joint son id pour que la
    // console propose « Ouvrir la fiche entreprise » (SUPER_ADMIN voit déjà
    // toutes les entreprises : aucune fuite d'info supplémentaire).
    const existant = await context.entities.User.findUnique({ where: { email: adminEmail } });
    if (existant) {
        const idEntrepriseExistante = existant?.id_entreprise ?? null;
        throw new HttpError(409, 'Un utilisateur utilise déjà cette adresse email.', idEntrepriseExistante ? { entreprise_id: idEntrepriseExistante } : undefined);
    }
    // Token d'invitation : le clair n'existe QUE dans le lien email
    const tokenClair = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256(tokenClair);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // 1. Créer le compte admin D'ABORD (createUser de Wasp écrit hors transaction —
    //    immédiatement committé). Identité auth SANS mot de passe utilisable :
    //    l'activation passe par le lien d'invitation (Doc 12 §7).
    const providerId = createProviderId('email', adminEmail);
    const providerData = await sanitizeAndSerializeProviderData({
        hashedPassword: crypto.randomBytes(32).toString('base64url'),
        isEmailVerified: true,
        emailVerificationSentAt: null,
        passwordResetSentAt: null,
    });
    const admin = await createUser(providerId, providerData, {
        email: adminEmail,
        username: adminEmail,
    });
    // createUser de Wasp n'expose aucun champ custom (role, id_entreprise, ...) :
    // le profil métier est posé juste après la création du compte.
    await prisma.user.update({
        where: { id: admin.id },
        data: {
            nom, prenom,
            telephone: args.admin.telephone?.trim() || null,
            role: 'DIRECTION',
            id_agence: null,
            actif: true,
            platformRole: 'NONE',
            mustChangePassword: true,
        },
    });
    // 2. Transaction : entreprise + rattachement du compte au tenant + invitation
    //    + audit. Si une étape échoue, tout est annulé ET le compte admin créé
    //    à l'étape 1 est supprimé (ROBUSTESSE — point 15 de l'audit : sans ce
    //    nettoyage, un échec de transaction laisse un compte orphelin avec une
    //    identité auth valide en base).
    let resultat;
    try {
        resultat = await prisma.$transaction(async (tx) => {
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
            await tx.user.update({
                where: { id: admin.id },
                data: { id_entreprise: entreprise.id },
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
    }
    catch (e) {
        // NETTOYAGE : la transaction a échoué → le compte admin créé hors tx
        // devient un orphelin. On le supprime pour garder la base propre ;
        // l'email n'a pas encore été envoyé, donc l'adresse est immédiatement
        // réutilisable pour une nouvelle tentative.
        // ANTI-COURSE (double-clic / double soumission) : on ne supprime
        // l'identité auth QUE si elle appartient bien au compte qu'on vient de
        // créer (même userId) — jamais celle d'une requête jumelle qui aurait
        // gagné la course avec le même email. Et le nettoyage n'écrase jamais
        // l'erreur d'origine (chaque étape est protégée).
        try {
            const identites = await prisma.authIdentity.findMany({
                where: { providerUserId: adminEmail },
                include: { auth: true },
            });
            for (const ident of identites) {
                if (ident?.auth?.userId === admin.id) {
                    await prisma.authIdentity.delete({
                        where: {
                            providerName_providerUserId: {
                                providerName: ident.providerName,
                                providerUserId: adminEmail,
                            },
                        },
                    });
                }
            }
        }
        catch (nettoyageErreur) {
            console.warn('[PLATFORM] creerEntreprise: nettoyage identité partiel:', nettoyageErreur?.message);
        }
        try {
            await prisma.user.deleteMany({ where: { id: admin.id } });
        }
        catch (nettoyageErreur) {
            console.warn('[PLATFORM] creerEntreprise: nettoyage user partiel:', nettoyageErreur?.message);
        }
        console.warn('[PLATFORM] creerEntreprise: transaction annulée, compte admin nettoyé:', e?.message);
        throw e;
    }
    // 5. Email d'activation — hors transaction (SMTP). En cas d'échec, la
    //    console permet « Renvoyer l'invitation » (nouvelle Invitation + email).
    try {
        await envoyerEmailActivation({
            to: adminEmail,
            prenom: prenom,
            nomEntreprise: resultat.entreprise.nom_entreprise,
            lien: lienActivation(tokenClair),
        });
    }
    catch (e) {
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
    return { ...resultat, email_envoye: true, message: undefined };
};
// ─────────────────────────────────────────────
// suspendreEntreprise / reactiverEntreprise
// ─────────────────────────────────────────────
export const suspendreEntreprise = async (args, context) => {
    requireSuperAdmin(context);
    await exigerTotpSiActif(context, args);
    const motif = args.motif?.trim() ?? '';
    if (motif.length < 5) {
        throw new HttpError(400, 'Un motif de suspension est requis (5 caractères minimum).');
    }
    const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
    if (!entreprise)
        throw new HttpError(404, 'Entreprise introuvable.');
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
export const reactiverEntreprise = async (args, context) => {
    requireSuperAdmin(context);
    await exigerTotpSiActif(context, args);
    const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
    if (!entreprise)
        throw new HttpError(404, 'Entreprise introuvable.');
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
export const changerLimitesEntreprise = async (args, context) => {
    requireSuperAdmin(context);
    await exigerTotpSiActif(context, args);
    const entreprise = await context.entities.Entreprise.findUnique({ where: { id: args.id_entreprise } });
    if (!entreprise)
        throw new HttpError(404, 'Entreprise introuvable.');
    const data = {};
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
        if (!PLANS[plan])
            throw new HttpError(400, 'Plan invalide.');
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
export const renvoyerInvitation = async (args, context) => {
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
    if (!entreprise)
        throw new HttpError(404, 'Entreprise introuvable.');
    const admin = entreprise.utilisateurs[0];
    if (!admin?.email)
        throw new HttpError(404, "Aucun administrateur avec email trouvé pour cette entreprise.");
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
export const inviterSuperAdmin = async (args, context) => {
    requireSuperAdmin(context);
    const email = args.email?.trim().toLowerCase() ?? '';
    if (!EMAIL_RE.test(email))
        throw new HttpError(400, 'Email invalide.');
    if (!args.prenom?.trim() || !args.nom?.trim()) {
        throw new HttpError(400, 'Prénom et nom requis.');
    }
    const existant = await context.entities.User.findUnique({ where: { email } });
    if (existant)
        throw new HttpError(409, 'Un utilisateur utilise déjà cette adresse email.');
    const tokenClair = crypto.randomBytes(32).toString('base64url');
    const providerId = createProviderId('email', email);
    const providerData = await sanitizeAndSerializeProviderData({
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
            id_entreprise: null, // invitation PLATEFORME — pas de tenant
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
export const activerCompte = async (args, context) => {
    const token = args.token?.trim() ?? '';
    if (!token)
        throw new HttpError(400, 'Lien d’activation invalide.');
    if (!args.motDePasse || args.motDePasse.length < 8) {
        throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (args.motDePasse !== args.confirmation) {
        throw new HttpError(400, 'Les deux mots de passe ne correspondent pas.');
    }
    const tokenHash = sha256(token);
    const invitation = await context.entities.Invitation.findUnique({ where: { token_hash: tokenHash } });
    if (!invitation)
        throw new HttpError(404, "Ce lien d'activation est invalide ou a déjà été utilisé.");
    if (invitation.used_at)
        throw new HttpError(409, "Ce lien a déjà été utilisé. Utilisez « Mot de passe oublié » pour vous connecter.");
    if (invitation.expires_at < new Date())
        throw new HttpError(410, "Ce lien a expiré. Demandez un nouveau lien d'activation.");
    // Transaction : poser le mot de passe + marquer l'invitation utilisée
    await prisma.$transaction(async (tx) => {
        // FIX 03/09 : tx.auth n'existe pas (aucun modèle Auth dans le schéma)
        // → 500 systématique. On utilise l'API Wasp findAuthIdentity /
        // updateAuthIdentityProviderData (hors transaction — chaque update est
        // atomique et idempotent grâce au garde used_at plus haut).
        const compte = await tx.user.findUnique({
            where: { id: invitation.id_user },
            select: { email: true },
        });
        if (!compte?.email)
            throw new HttpError(404, "Compte introuvable pour cette invitation.");
        const providerId = createProviderId('email', compte.email);
        const identity = await findAuthIdentity(providerId);
        if (!identity)
            throw new HttpError(404, "Compte d'authentification introuvable pour cet utilisateur.");
        const providerData = getProviderDataWithPassword(identity.providerData);
        await updateAuthIdentityProviderData(providerId, providerData, {
            hashedPassword: args.motDePasse,
            isEmailVerified: true,
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
                entreprise_id: invitation.id_entreprise ?? null,
            },
        });
    });
    return { ok: true, message: 'Compte activé. Vous pouvez vous connecter.' };
};
// ─────────────────────────────────────────────
// desactiverCompte / changerPlatformRole — garde « dernier SUPER_ADMIN » (S12)
// Impossible de rétrograder ou désactiver le DERNIER SUPER_ADMIN actif,
// sinon la console devient définitivement inaccessible.
// ─────────────────────────────────────────────
export const changerPlatformRole = async (args, context) => {
    requireSuperAdmin(context);
    await exigerTotpSiActif(context, args);
    const cible = await context.entities.User.findUnique({ where: { id: args.id_user_cible } });
    if (!cible)
        throw new HttpError(404, 'Utilisateur introuvable.');
    if (cible.platformRole === 'SUPER_ADMIN' && args.nouveauRole !== 'SUPER_ADMIN') {
        const nbSuperAdmins = await context.entities.User.count({
            where: { platformRole: 'SUPER_ADMIN', actif: true },
        });
        if (nbSuperAdmins <= 1) {
            throw new HttpError(409, 'Impossible de rétrograder le dernier SUPER_ADMIN actif. Créez d’abord un autre SUPER_ADMIN depuis la console.');
        }
    }
    // Un SUPER_ADMIN ne peut pas modifier son propre rôle (évite le verrouillage accidentel)
    if (args.id_user_cible === context.user.id) {
        throw new HttpError(409, 'Vous ne pouvez pas modifier votre propre rôle plateforme.');
    }
    await context.entities.User.update({
        where: { id: cible.id },
        data: { platformRole: args.nouveauRole },
    });
    await journaliser({
        context,
        action: 'user.suspend',
        resource: 'User',
        resource_id: cible.id,
        entreprise_id: null,
        details: { platformRole: cible.platformRole, nouveauRole: args.nouveauRole },
    });
    return { ok: true, message: `Rôle plateforme mis à jour : ${args.nouveauRole}.` };
};
export const desactiverComptePlatform = async (args, context) => {
    requireSuperAdmin(context);
    await exigerTotpSiActif(context, args);
    const cible = await context.entities.User.findUnique({ where: { id: args.id_user_cible } });
    if (!cible)
        throw new HttpError(404, 'Utilisateur introuvable.');
    if (cible.platformRole === 'SUPER_ADMIN') {
        const nbSuperAdmins = await context.entities.User.count({
            where: { platformRole: 'SUPER_ADMIN', actif: true },
        });
        if (nbSuperAdmins <= 1) {
            throw new HttpError(409, 'Impossible de désactiver le dernier SUPER_ADMIN actif. Créez d’abord un autre SUPER_ADMIN.');
        }
    }
    if (args.id_user_cible === context.user.id) {
        throw new HttpError(409, 'Vous ne pouvez pas désactiver votre propre compte.');
    }
    await context.entities.User.update({
        where: { id: cible.id },
        data: { actif: false },
    });
    await journaliser({
        context,
        action: 'user.suspend',
        resource: 'User',
        resource_id: cible.id,
        entreprise_id: null,
        details: { type: 'desactivation_platform', ancienRole: cible.platformRole },
    });
    return { ok: true, message: 'Compte désactivé.' };
};
// ─────────────────────────────────────────────
// 2FA TOTP pour les comptes plateforme (audit F2)
// ─────────────────────────────────────────────
// Flux : setup2fa (génère secret + otpauth URL) → l'admin scanne le QR dans
// son authenticator → activer2fa (valide 1er code, active le flag) → à
// chaque ouverture de console, PlatformShell exige verifier2fa tant que la
// session 2FA n'est pas validée (cookie httpOnly signé).
import { genererSecretTotp, urlOtpauth, verifierCodeTotp, chiffrerSecretTotp, dechiffrerSecretTotp, } from './totp';
/**
 * 2FA ENFORCED (audit ZAP bloc B) : quand le compte a activé sa 2FA
 * (totp_actif=true), toute opération platform sensible exige un code TOTP
 * valide transmis dans args.totpCode. Sans 2FA activée (période de grâce),
 * l'opération passe — le durcissement complet arrivera quand tous les
 * comptes plateforme auront activé leur 2FA.
 */
async function exigerTotpSiActif(context, args) {
    const compte = await context.entities.User.findUnique({
        where: { id: context.user.id },
        select: { totp_actif: true, totp_secret: true },
    });
    if (!compte?.totp_actif || !compte.totp_secret)
        return;
    if (!args.totpCode) {
        throw new HttpError(428, 'Code 2FA requis pour cette opération sensible.');
    }
    const secret = dechiffrerSecretTotp(compte.totp_secret);
    if (!verifierCodeTotp(args.totpCode, secret)) {
        throw new HttpError(401, 'Code 2FA invalide ou expiré.');
    }
}
/**
 * Étape 1 : générer un secret TOTP chiffré et l'URL otpauth (à encoder en QR
 * côté front). Le secret n'est PAS encore actif tant que activer2fa n'a pas
 * validé un premier code.
 */
export const setup2fa = async (_args, context) => {
    requireSuperAdmin(context);
    const secret = genererSecretTotp();
    await context.entities.User.update({
        where: { id: context.user.id },
        data: {
            totp_secret: chiffrerSecretTotp(secret),
            totp_actif: false, // pas actif tant que non confirmé
        },
    });
    await journaliser({
        context,
        action: '2fa.setup',
        resource: 'User',
        resource_id: context.user.id,
        entreprise_id: null,
        details: {},
    });
    return {
        otpauth_url: urlOtpauth(secret, context.user.email ?? context.user.username ?? 'admin'),
        // Le secret en clair est retourné UNE fois (le QR) puis chiffré en base.
        secret_pour_qr: secret,
    };
};
/**
 * Étape 2 : confirmer le premier code → active la 2FA.
 */
export const activer2fa = async (args, context) => {
    requireSuperAdmin(context);
    const compte = await context.entities.User.findUnique({
        where: { id: context.user.id },
        select: { totp_secret: true },
    });
    if (!compte?.totp_secret) {
        throw new HttpError(400, "Aucun setup 2FA en cours. Appelez d'abord setup2fa.");
    }
    const secret = dechiffrerSecretTotp(compte.totp_secret);
    if (!verifierCodeTotp(args.code, secret)) {
        throw new HttpError(401, 'Code incorrect. Vérifiez votre application authenticator.');
    }
    await context.entities.User.update({
        where: { id: context.user.id },
        data: { totp_actif: true },
    });
    await journaliser({
        context,
        action: '2fa.activate',
        resource: 'User',
        resource_id: context.user.id,
        entreprise_id: null,
        details: {},
    });
    return { ok: true, message: '2FA activée. Elle sera exigée à chaque session console.' };
};
/**
 * Vérification à l'ouverture de session console : compare le code fourni au
 * secret déchiffré. La "session 2FA validée" est portée par le front (état en
 * mémoire pendant la vie de l'onglet) — le vrai verrou reste le serveur qui
 * refuse les opérations sensibles sans preuve récente (voir exiger2faRecent).
 */
export const verifier2fa = async (args, context) => {
    requireSuperAdmin(context);
    const compte = await context.entities.User.findUnique({
        where: { id: context.user.id },
        select: { totp_secret: true, totp_actif: true },
    });
    if (!compte?.totp_actif || !compte.totp_secret) {
        // 2FA non activée : rien à vérifier (période de grâce avant durcissement)
        return { ok: true, deux_fa: false };
    }
    const secret = dechiffrerSecretTotp(compte.totp_secret);
    if (!verifierCodeTotp(args.code, secret)) {
        throw new HttpError(401, 'Code 2FA incorrect.');
    }
    await journaliser({
        context,
        action: '2fa.verify',
        resource: 'User',
        resource_id: context.user.id,
        entreprise_id: null,
        details: {},
    });
    return { ok: true, deux_fa: true };
};
//# sourceMappingURL=actionsPlatform.js.map