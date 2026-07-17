// src/server/actions.ts
import { HttpError } from 'wasp/server';
import { prisma } from 'wasp/server';
import { emailSender } from 'wasp/server/email';
import {
  createProviderId,
  createUser,
  sanitizeAndSerializeProviderData,
} from 'wasp/server/auth';
import crypto from 'node:crypto';
import { envoyerAlerteSMS, envoyerAlerteWhatsApp } from './notifications/gateway';
import {
  requireAuth,
  requireRole,
  requireAdmin,
  assertAgenceAccess,
  resolveAgenceId,
} from './middleware/rowLevelSecurity';

// Sel d'environnement pour le hachage des numéros de téléphone (ARTCI).
// En production, un sel manquant compromettrait l'anti-rejeu (hachage
// prévisible / attaquable par dictionnaire) : on refuse de démarrer plutôt
// que de retomber silencieusement sur une valeur par défaut connue de tous.
if (!process.env.TELEPHONE_HASH_SALT && process.env.NODE_ENV === 'production') {
  throw new Error(
    "TELEPHONE_HASH_SALT doit être défini en production (voir .env.server)."
  );
}
const TELEPHONE_SALT = process.env.TELEPHONE_HASH_SALT || 'cxsat-default-salt-change-me';

/** Résout l'id_agence auquel se rattache une Alerte (via son guichet ou sa réponse). */
async function resolveAlerteAgenceId(entities: any, id_alerte: bigint): Promise<number> {
  const alerte = await entities.Alerte.findUnique({
    where: { id: id_alerte },
    include: { guichet: true, reponse: true },
  });
  if (!alerte) throw new HttpError(404, 'Alerte introuvable.');
  const idAgence = alerte.guichet?.id_agence ?? alerte.reponse?.id_agence;
  if (!idAgence) throw new HttpError(400, "Impossible de déterminer l'agence de cette alerte.");
  return idAgence;
}

// ============================================================================
// ONBOARDING
// ============================================================================

type OnboardingArgs = {
  nomEntreprise: string;
  commune: string;
};

type CreateGuichetArgs = {
  nomGuichet: string;
  typeGuichet: string;
  id_agence: number;
  serviceIds?: number[];
};

export const completeOnboarding = async (args: OnboardingArgs, context: any) => {
  requireAuth(context);

  const { nomEntreprise, commune } = args;

  if (!nomEntreprise?.trim() || !commune?.trim()) {
    throw new HttpError(400, "Le nom de l'entreprise et la commune sont requis.");
  }

  // --- GARDE DE SÉCURITÉ SaaS ---
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    include: { agence: true }
  });

  if (user?.id_agence !== null && user?.id_agence !== undefined) {
    throw new HttpError(400, 'Votre compte est déjà configuré avec une entreprise.');
  }

  // On crée d'abord l'Entreprise (tenant) puis l'Agence-siège rattachée, afin
  // de pouvoir rattacher explicitement l'utilisateur aux DEUX (id_agence ET
  // id_entreprise) : id_entreprise est ce qui permet ensuite de scoper
  // correctement DIRECTION/QUALITE à leur propre entreprise plutôt qu'à
  // toute la plateforme (voir rowLevelSecurity.ts).
  const entreprise = await context.entities.Entreprise.create({
    data: { nom_entreprise: nomEntreprise.trim() },
  });

  const agence = await context.entities.Agence.create({
    data: {
      nom_agence: `Siège ${nomEntreprise.trim()}`,
      commune: commune.trim(),
      id_entreprise: entreprise.id,
    },
  });

  const updatedUser = await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      role: 'DIRECTION',
      id_agence: agence.id,
      id_entreprise: entreprise.id,
    },
    include: {
      agence: true,
    },
  });

  return updatedUser;
};

// ============================================================================
// GUICHETS
// ============================================================================

export const createGuichet = async (args: CreateGuichetArgs, context: any) => {
  requireAuth(context);
  requireRole(context, ['CHEF_AGENCE']);

  const { nomGuichet, typeGuichet, id_agence, serviceIds } = args;

  if (!nomGuichet?.trim() || !id_agence) {
    throw new HttpError(400, "Le nom du guichet et l'agence parente sont requis.");
  }

  const user = context.user;
  await assertAgenceAccess(context, context.entities, id_agence, 'agence');

  const servicesConnect = serviceIds && serviceIds.length > 0
    ? { connect: serviceIds.map(id => ({ id })) }
    : undefined;

  return await context.entities.Guichet.create({
    data: {
      nom_guichet: nomGuichet.trim(),
      type_guichet: typeGuichet || 'Physique',
      actif: true,
      agence: { connect: { id: id_agence } },
      services: servicesConnect,
      affectations: {
        create: {
          date_affectation: new Date(),
          heure_debut: "08:00",
          heure_fin: "17:00",
          id_agent: user.id
        }
      }
    }
  });
};

export const updateGuichetServices = async (
  args: { id_guichet: number; serviceIds: number[] },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['CHEF_AGENCE']);

  const guichet = await context.entities.Guichet.findUnique({
    where: { id: args.id_guichet }
  });

  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');

  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  return context.entities.Guichet.update({
    where: { id: args.id_guichet },
    data: {
      services: {
        set: args.serviceIds.map(id => ({ id }))
      }
    }
  });
};

// ============================================================================
// PLANNING
// ============================================================================

export const assignAgent = async (args: any, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  if (!args.date || !args.heure_debut || !args.heure_fin || !args.id_guichet || !args.id_agent) {
    throw new HttpError(400, 'Tous les champs de planification sont requis.');
  }

  if (args.heure_fin <= args.heure_debut) {
    throw new HttpError(400, "L'heure de fin doit être postérieure à l'heure de début.");
  }

  // Faille corrigée : on vérifie désormais que le guichet ET l'agent ciblés
  // appartiennent bien au périmètre de l'appelant, sinon un CHEF_AGENCE
  // pouvait planifier n'importe quel agent sur n'importe quel guichet d'une
  // AUTRE agence.
  const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');
  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  const agent = await context.entities.User.findUnique({ where: { id: args.id_agent } });
  if (!agent) throw new HttpError(404, 'Agent introuvable.');
  if (agent.id_agence !== guichet.id_agence) {
    throw new HttpError(400, "L'agent sélectionné n'appartient pas à l'agence de ce guichet.");
  }

  // Détection de chevauchement horaire pour le même agent à la même date.
  // Un chevauchement est défini par : deux créneaux [D1,F1] et [D2,F2] se
  // chevauchent si D1 < F2 ET F1 > D2. On utilise la comparaison alphabétique
  // des chaînes HH:MM (valide car format fixe avec zéro-padding).
  const chevauchement = await context.entities.AffectationGuichet.findFirst({
    where: {
      id_agent: args.id_agent,
      date_affectation: new Date(args.date),
      heure_debut: { lt: args.heure_fin },
      heure_fin: { gt: args.heure_debut },
    },
    include: { guichet: { select: { nom_guichet: true } } },
  });

  if (chevauchement) {
    throw new HttpError(
      409,
      `Cet agent est déjà affecté au guichet « ${chevauchement.guichet?.nom_guichet || 'inconnu'} » de ${chevauchement.heure_debut} à ${chevauchement.heure_fin}. Les créneaux ne peuvent pas se chevaucher.`
    );
  }

  return context.entities.AffectationGuichet.create({
    data: {
      date_affectation: new Date(args.date),
      heure_debut: args.heure_debut,
      heure_fin: args.heure_fin,
      id_guichet: args.id_guichet,
      id_agent: args.id_agent,
    }
  });
};

// ============================================================================
// COLLECTE D'AVIS (avec anti-rejeu + notifications)
// ============================================================================

export const soumettreAvis = async (args: any, context: any) => {
  const { guichetId, score, critereId, canalId, commentaire, telephone, serviceId, responses } = args;

  if (!guichetId) {
    throw new HttpError(400, "Identifiant du guichet requis.");
  }

  // --- ANTI-REJEU : hachage SHA-256 du numéro de téléphone ---
  if (telephone) {
    const hachage = crypto
      .createHash('sha256')
      .update(TELEPHONE_SALT + telephone.replace(/\s+/g, ''))
      .digest('hex');

    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existant = await context.entities.VoteAntiRejeu.findFirst({
      where: {
        hachage_tel: hachage,
        date_vote: { gte: hier },
      },
    });

    if (existant) {
      throw new HttpError(429, "Vous avez déjà soumis un avis depuis ce numéro ces dernières 24h.");
    }

    // Enregistrement du hachage (upsert : si une entrée existe déjà pour ce
    // numéro, hors de la fenêtre de 24h, on rafraîchit sa date au lieu de
    // planter sur la contrainte unique de hachage_tel).
    await context.entities.VoteAntiRejeu.upsert({
      where: { hachage_tel: hachage },
      update: { date_vote: new Date() },
      create: { hachage_tel: hachage },
    });

    // Nettoyage des hachages > 24h (purge légère)
    await context.entities.VoteAntiRejeu.deleteMany({
      where: { date_vote: { lt: hier } },
    });
  }
  // -----------------------------------------------------------

  const guichet = await context.entities.Guichet.findUnique({
    where: { id: Number(guichetId) },
  });

  if (!guichet) {
    throw new HttpError(404, "Guichet introuvable.");
  }

  // Garantit que le canal existe, sans dépendre d'un seed : aucune action ni
  // aucun seed ne crée jamais de ligne dans Canal, alors que le frontend
  // envoie systématiquement un canalId (ex. 1 pour QR_WEB). Sans cet upsert,
  // Reponse.create échouait en violation de clé étrangère sur id_canal dès
  // qu'aucune donnée n'avait été insérée manuellement en base.
  const CANAUX_CONNUS: Record<number, { type_canal: string; langue_utilisee: string }> = {
    1: { type_canal: 'QR_WEB', langue_utilisee: 'fr' },
    2: { type_canal: 'USSD', langue_utilisee: 'fr' },
    3: { type_canal: 'IVR_VOCAL', langue_utilisee: 'fr' },
  };
  const idCanalResolved = canalId ? Number(canalId) : 1;
  const canalDefaults = CANAUX_CONNUS[idCanalResolved] ?? CANAUX_CONNUS[1];
  await context.entities.Canal.upsert({
    where: { id: idCanalResolved },
    update: {},
    create: { id: idCanalResolved, ...canalDefaults },
  });

  const now = new Date();
  const timeString = now.toTimeString().slice(0, 5);

  const affectation = await context.entities.AffectationGuichet.findFirst({
    where: {
      id_guichet: guichet.id,
      date_affectation: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'),
      heure_debut: { lte: timeString },
      heure_fin: { gte: timeString }
    }
  });

  const submissionId = args.id_soumission || crypto.randomUUID();

  // Normalize responses list
  let itemsToInsert: Array<{ critereId: number; score: number }> = [];
  if (responses && Array.isArray(responses) && responses.length > 0) {
    itemsToInsert = responses.map((r: any) => ({
      critereId: Number(r.critereId),
      score: Number(r.score)
    }));
  } else if (score !== undefined && score !== null && critereId !== undefined) {
    itemsToInsert = [{
      critereId: Number(critereId),
      score: Number(score)
    }];
  } else {
    throw new HttpError(400, "Données d'évaluation manquantes.");
  }

  // Validate scores
  for (const item of itemsToInsert) {
    if (!Number.isInteger(item.score) || item.score < 1 || item.score > 5) {
      throw new HttpError(400, "Le score doit être un entier compris entre 1 et 5.");
    }
  }

  // Bug corrigé : le formulaire client (CollectePage) utilise un critère de
  // secours codé en dur (id: 1, "Satisfaction globale") quand ni le service
  // ni l'agence n'ont de critères configurés. Si aucune ligne Critere #1
  // n'existe réellement en base pour cette entreprise, l'insertion Reponse
  // ci-dessous levait une violation de clé étrangère Prisma non interceptée
  // → 500 brut renvoyé au client ("Request failed with status code 500"),
  // sans message exploitable. On vérifie donc explicitement l'existence des
  // critères avant d'insérer quoi que ce soit.
  const critereIds = [...new Set(itemsToInsert.map((i) => i.critereId))];
  const criteresExistants = await context.entities.Critere.findMany({
    where: { id: { in: critereIds } },
    select: { id: true },
  });
  const idsExistants = new Set(criteresExistants.map((c: any) => c.id));
  const idsManquants = critereIds.filter((id) => !idsExistants.has(id));
  if (idsManquants.length > 0) {
    throw new HttpError(
      400,
      "Ce guichet n'a aucun critère de notation configuré. Demandez à votre administrateur de configurer les critères de l'agence avant de collecter des avis."
    );
  }

  const createdReponses: Array<{ id: number; [key: string]: any }> = [];
  let worstScore = 5;

  for (const item of itemsToInsert) {
    if (item.score < worstScore) {
      worstScore = item.score;
    }

    const rep: { id: number; [key: string]: any } = await context.entities.Reponse.create({
      data: {
        score_brut: item.score,
        commentaire_texte: commentaire || "",
        id_soumission: submissionId,
        id_critere: item.critereId,
        id_canal: idCanalResolved,
        id_agence: guichet.id_agence,
        id_guichet: guichet.id,
        id_service: serviceId ? Number(serviceId) : null,
        id_agent: affectation?.id_agent || null,
      }
    });
    createdReponses.push(rep);
  }

  // --- ALERTE + NOTIFICATIONS si note critique ---
  if (worstScore <= 2) {
    const destinataire = await context.entities.User.findFirst({
      where: {
        id_agence: guichet.id_agence,
        role: { in: ['CHEF_AGENCE', 'DIRECTION', 'QUALITE'] },
        actif: true
      }
    });

    if (destinataire) {
      await context.entities.Alerte.create({
        data: {
          message: `Note de ${worstScore}/5 reçue au guichet "${guichet.nom_guichet}". Commentaire: "${commentaire || 'Aucun'}"`,
          type_alerte: "NOTE_CRITIQUE",
          statut_alerte: "NOUVELLE",
          id_reponse: createdReponses[0].id,
          id_destinataire: destinataire.id,
          id_guichet_concerne: guichet.id,
        }
      });

      // Envoi SMS/WhatsApp (mode stub si clés non configurées)
      if (destinataire.telephone) {
        const msgAlerte = `⚠️ CXSAT ALERTE — Note critique ${worstScore}/5 au guichet "${guichet.nom_guichet}". Vérifiez vos tâches correctives.`;
        try {
          await envoyerAlerteWhatsApp(destinataire.telephone, msgAlerte);
        } catch {
          await envoyerAlerteSMS(destinataire.telephone, msgAlerte);
        }
      }
    }
  }

  return createdReponses[0];
};

// ============================================================================
// GESTION DU PERSONNEL
// ============================================================================

// NOTE : createAgent a été retiré. Cette action était morte côté UI (jamais
// appelée depuis AdminPersonnelPage) et cassée côté serveur : elle écrivait
// `password: 'passwordParDefaut123'` directement sur User.create(), un champ
// qui n'existe pas dans le schéma (Wasp stocke les mots de passe hachés dans
// Auth/AuthIdentity, jamais sur User). Tout appel provoquait une erreur
// Prisma ("Unknown argument `password`"). Le flux correct et actif est
// `inviteAgent`, qui utilise l'API d'authentification officielle de Wasp.
// Pour créer un AGENT (sans email/connexion), utiliser inviteAgent sans
// email — voir plus bas.

export const updateAgent = async (
  args: { id: number; nom?: string; prenom?: string; email?: string; telephone?: string; id_agence?: number },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  if (existing.id_agence) {
    await assertAgenceAccess(context, context.entities, existing.id_agence, 'agent');
  }

  // Si l'appelant tente de déplacer l'agent vers une autre agence, cette
  // agence cible doit elle aussi être dans son périmètre.
  if (args.id_agence) {
    await assertAgenceAccess(context, context.entities, args.id_agence, 'agence de destination');
  }

  return context.entities.User.update({
    where: { id: args.id },
    data: {
      ...(args.nom ? { nom: args.nom } : {}),
      ...(args.prenom ? { prenom: args.prenom } : {}),
      ...(args.email !== undefined ? { email: args.email.trim() ? args.email.trim() : null } : {}),
      ...(args.telephone !== undefined ? { telephone: args.telephone.trim() ? args.telephone.trim() : null } : {}),
      ...(args.id_agence ? { id_agence: args.id_agence } : {}),
    },
  });
};

export const deleteAgent = async (args: { id: number }, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  if (!existing.id_agence) {
    throw new HttpError(400, "Cet utilisateur n'est rattaché à aucune agence.");
  }
  await assertAgenceAccess(context, context.entities, existing.id_agence, 'agent');

  return context.entities.User.update({
    where: { id: args.id },
    data: { actif: false },
  });
};

export const reactivateAgent = async (args: { id: number }, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  if (!existing.id_agence) {
    throw new HttpError(400, "Cet utilisateur n'est rattaché à aucune agence.");
  }
  await assertAgenceAccess(context, context.entities, existing.id_agence, 'agent');

  return context.entities.User.update({
    where: { id: args.id },
    data: { actif: true },
  });
};

// NOTE : createChefAgence a été retiré pour la même raison que createAgent
// (champ `password` inexistant sur User, mot de passe en dur). La nomination
// d'un Chef d'Agence passe désormais exclusivement par inviteAgent(role:
// 'CHEF_AGENCE'), qui applique déjà la règle "un seul chef actif par agence"
// et crée un vrai compte via l'API d'auth officielle de Wasp.

export const promouvoirAgent = async (args: { id_agent: string }, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id_agent } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  if (!existing.id_agence) {
    throw new HttpError(400, "Cet utilisateur n'est rattaché à aucune agence.");
  }

  // Faille corrigée : la direction ne pouvait auparavant promouvoir QUE des
  // agents de sa propre entreprise en théorie, mais rien ne le vérifiait —
  // assertAgenceAccess applique désormais le scope entreprise réel.
  await assertAgenceAccess(context, context.entities, existing.id_agence, 'agent');

  return context.entities.User.update({
    where: { id: args.id_agent },
    data: { role: 'CHEF_AGENCE' }
  });
};

// ============================================================================
// GESTION DES AGENCES
// ============================================================================
// L'onboarding (completeOnboarding) crée automatiquement une agence "Siège"
// unique. createAgence permet ensuite au chef d'entreprise (DIRECTION)
// d'ajouter les autres agences de son réseau (succursales), auxquelles il
// pourra ensuite rattacher un Chef d'Agence via inviteAgent.

export const createAgence = async (
  args: {
    nom_agence: string;
    commune: string;
    adresse?: string;
    heure_ouverture?: string;
    heure_fermeture?: string;
  },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION']);

  if (!args.nom_agence?.trim() || !args.commune?.trim()) {
    throw new HttpError(400, "Le nom de l'agence et la commune sont requis.");
  }

  if (!context.user.id_entreprise) {
    throw new HttpError(400, "Votre compte n'est rattaché à aucune entreprise.");
  }

  // Empêche les doublons évidents au sein de la même entreprise (même nom
  // dans la même commune), sans bloquer deux agences homonymes dans des
  // communes différentes.
  const doublon = await context.entities.Agence.findFirst({
    where: {
      id_entreprise: context.user.id_entreprise,
      nom_agence: args.nom_agence.trim(),
      commune: args.commune.trim(),
    },
  });
  if (doublon) {
    throw new HttpError(400, 'Une agence avec ce nom existe déjà dans cette commune.');
  }

  return context.entities.Agence.create({
    data: {
      nom_agence: args.nom_agence.trim(),
      commune: args.commune.trim(),
      adresse: args.adresse?.trim() || null,
      ...(args.heure_ouverture ? { heure_ouverture: args.heure_ouverture } : {}),
      ...(args.heure_fermeture ? { heure_fermeture: args.heure_fermeture } : {}),
      id_entreprise: context.user.id_entreprise,
    },
  });
};

export const inviteAgent = async (
  args: { email?: string; nom: string; prenom: string; id_agence: number; role: string; telephone?: string },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Règle métier : le chef d'entreprise structure le réseau (chefs d'agence,
  // auditeurs qualité) ; c'est ensuite à chaque chef d'agence de constituer
  // son équipe de terrain (agents de guichet) sur sa propre agence.
  const ROLES_PAR_INVITEUR: Record<string, string[]> = {
    DIRECTION: ['CHEF_AGENCE', 'QUALITE'],
    CHEF_AGENCE: ['AGENT', 'QUALITE'],
  };
  const rolesAutorises = ROLES_PAR_INVITEUR[context.user.role ?? ''] || [];
  if (!rolesAutorises.includes(args.role)) {
    throw new HttpError(
      403,
      context.user.role === 'DIRECTION'
        ? "En tant que direction, vous ne pouvez créer que des Chefs d'Agence ou des Auditeurs Qualité."
        : "En tant que Chef d'Agence, vous ne pouvez créer que des Agents de guichet ou des Auditeurs Qualité."
    );
  }

  const targetAgenceId = await resolveAgenceId(context, context.entities, args.id_agence);

  const targetAgence = await context.entities.Agence.findUnique({ where: { id: targetAgenceId } });
  if (!targetAgence) throw new HttpError(404, 'Agence introuvable.');

  const normalizedEmail = args.email?.trim() ? args.email.trim() : null;

  // Un seul chef d'agence actif par agence
  if (args.role === 'CHEF_AGENCE') {
    if (!normalizedEmail) {
      throw new HttpError(400, "L'adresse e-mail est obligatoire pour un Chef d'Agence.");
    }
    const chefExistant = await context.entities.User.findFirst({
      where: { id_agence: targetAgenceId, role: 'CHEF_AGENCE', actif: true }
    });
    if (chefExistant) {
      throw new HttpError(400, "Cette agence possède déjà un Chef d'agence actif.");
    }
  }

  const tempPassword = crypto.randomBytes(16).toString('hex');

  const additionalUserData = {
    nom: args.nom,
    prenom: args.prenom,
    role: args.role,
    id_agence: targetAgenceId,
    id_entreprise: targetAgence.id_entreprise,
    telephone: args.telephone || null,
    actif: true,
  };

  let newUser;
  if (normalizedEmail) {
    // Utilisateur avec email (ex: Chef d'Agence) : on crée un vrai compte
    // avec une identité d'authentification pour qu'il puisse se connecter.
    // Le mot de passe n'est PAS un champ du modèle User (Wasp le stocke dans
    // Auth/AuthIdentity), d'où l'erreur "Unknown argument `id_agence`... /
    // `password`" qu'on avait avant.
    const providerId = createProviderId('email', normalizedEmail);
    const providerData = await sanitizeAndSerializeProviderData<'email'>({
      hashedPassword: tempPassword,
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetSentAt: null,
    });
    newUser = await createUser(providerId, providerData, {
      email: normalizedEmail,
      ...additionalUserData,
    });
  } else {
    // Agent simple sans email : pas de compte de connexion nécessaire.
    newUser = await context.entities.User.create({
      data: {
        email: null,
        ...additionalUserData,
      },
    });
  }


  // ✉️ Email envoyé au Chef d'agence ET à l'Auditeur Qualité (les deux ont un
  // vrai compte de connexion). Les agents simples (AGENT) n'ont pas besoin
  // d'accès à l'application : ils sont référencés dans le planning et les
  // avis, mais ne se connectent pas.
  if (args.role === 'CHEF_AGENCE' || args.role === 'QUALITE') {
    const frontendUrl = process.env.WASP_WEB_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Récupérer le nom de l'agence pour personnaliser l'email
    const agence = await context.entities.Agence.findUnique({
      where: { id: targetAgenceId },
      select: { nom_agence: true, commune: true },
    });

    const nomAgence = agence ? `${agence.nom_agence} — ${agence.commune}` : 'votre agence';
    const roleLabel = args.role === 'CHEF_AGENCE' ? "Chef d'Agence" : 'Auditeur Qualité';
    const roleMission = args.role === 'CHEF_AGENCE'
      ? 'gérer les guichets, planifier les agents et suivre les alertes de satisfaction'
      : "auditer la qualité de service, consulter les avis clients et suivre les indicateurs de conformité";
    const stepTroisDesc = args.role === 'CHEF_AGENCE'
      ? 'Planning, avis clients, alertes critiques — tout est centralisé.'
      : 'Tableaux de bord qualité, avis clients et indicateurs — tout est centralisé.';

    await emailSender.send({
      to: normalizedEmail!,
      subject: `🎉 Bienvenue sur CXSAT — Accès ${roleLabel}`,
      html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.1);">

    <!-- En-tête -->
    <div style="background: linear-gradient(135deg, #0f2240 0%, #1a3a5c 60%, #c47a20 100%); padding: 36px 40px;">
      <div style="font-size: 40px; margin-bottom: 12px;">👋</div>
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; line-height: 1.2;">
        Bienvenue, ${args.prenom} !
      </h1>
      <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 14px;">
        Votre accès ${roleLabel} CXSAT est prêt
      </p>
    </div>

    <!-- Corps -->
    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
        La direction vient de vous nommer <strong>${roleLabel}</strong> pour
        <strong>${nomAgence}</strong>. Votre rôle est de ${roleMission}.
      </p>

      <!-- Bloc identifiants -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">
          Vos identifiants de connexion
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="color: #6b7280; font-size: 13px;">📧 Adresse e-mail</span>
            <strong style="color: #111827; font-size: 14px;">${args.email}</strong>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <span style="color: #92400e; font-size: 13px;">🔑 Agence</span>
            <strong style="color: #92400e; font-size: 14px;">${nomAgence}</strong>
          </div>
        </div>
      </div>

      <!-- Étapes -->
      <div style="margin: 24px 0;">
        <p style="margin: 0 0 14px; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">
          Pour commencer
        </p>
        ${[
          ['1', 'Définissez votre mot de passe', 'Cliquez sur le bouton ci-dessous pour sécuriser votre accès.'],
          ['2', 'Connectez-vous', `Rendez-vous sur ${frontendUrl}/login avec votre email.`],
          ['3', 'Explorez votre espace', stepTroisDesc],
        ].map(([num, titre, desc]) => `
        <div style="display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start;">
          <div style="
            flex-shrink: 0;
            width: 28px; height: 28px;
            background: linear-gradient(135deg, #1a3a5c, #c47a20);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 13px; color: white;
          ">${num}</div>
          <div>
            <p style="margin: 0; font-weight: 700; color: #111827; font-size: 14px;">${titre}</p>
            <p style="margin: 2px 0 0; color: #6b7280; font-size: 13px;">${desc}</p>
          </div>
        </div>`).join('')}
      </div>

      <!-- CTA principal -->
      <div style="text-align: center; margin: 28px 0 8px;">
        <a href="${frontendUrl}/request-password-reset"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #1a3a5c, #c47a20);
             color: white;
             text-decoration: none;
             padding: 14px 32px;
             border-radius: 10px;
             font-weight: 800;
             font-size: 15px;
             letter-spacing: -0.2px;
           ">
          Définir mon mot de passe →
        </a>
      </div>

      <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
        Ce lien vous permettra de définir votre mot de passe en toute sécurité.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        <strong>CXSAT</strong> — Plateforme de satisfaction client · Norme FD X50-167 ·
        <a href="${frontendUrl}" style="color: #c47a20; text-decoration: none;">cxsat.ci</a>
      </p>
      <p style="margin: 6px 0 0; color: #d1d5db; font-size: 11px;">
        Si vous n'attendiez pas cet email, ignorez-le ou contactez votre direction.
      </p>
    </div>
  </div>
</body>
</html>`,
      text: [
        `Bienvenue ${args.prenom} ${args.nom} !`,
        ``,
        `Vous avez été nommé(e) ${roleLabel} sur CXSAT pour : ${nomAgence}.`,
        ``,
        `Email de connexion : ${args.email}`,
        ``,
        `Étapes :`,
        `1. Définissez votre mot de passe : ${frontendUrl}/request-password-reset`,
        `2. Connectez-vous sur : ${frontendUrl}/login`,
        `3. Retrouvez votre espace CXSAT depuis votre tableau de bord.`,
        ``,
        `CXSAT — Plateforme de satisfaction client`,
      ].join('\n'),
    });

    console.log(`[INVITE] Email Chef d'Agence envoyé à ${args.email} (${nomAgence})`);
  } else {
    // AGENT simple → créé silencieusement, pas d'email
    // Il sera assigné aux guichets via le planning sans jamais se connecter.
    console.log(`[INVITE] Agent créé silencieusement : ${args.prenom} ${args.nom} (pas d'email)`);
  }

  return newUser;
};


// ============================================================================
// CRITÈRES D'ÉVALUATION
// ============================================================================

export const toggleCritereAgence = async (
  args: { id_critere: number; id_agence?: number; active: boolean },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  // Faille corrigée : id_agence fourni par le client était auparavant utilisé
  // tel quel (aucune vérification), permettant à un CHEF_AGENCE d'activer/
  // désactiver des critères pour n'importe quelle agence du système.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  if (args.active) {
    const existing = await context.entities.AgenceCritere.findFirst({
      where: { id_agence: idAgence, id_critere: args.id_critere },
    });
    if (!existing) {
      return context.entities.AgenceCritere.create({
        data: { id_agence: idAgence, id_critere: args.id_critere },
      });
    }
    return existing;
  } else {
    return context.entities.AgenceCritere.deleteMany({
      where: { id_agence: idAgence, id_critere: args.id_critere },
    });
  }
};

export const createService = async (
  args: { libelle_service: string },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  if (!args.libelle_service?.trim()) {
    throw new HttpError(400, "Le libellé de l'opération est requis.");
  }

  // Isolation demandée : une opération créée par une entreprise reste
  // invisible aux autres entreprises (getServices filtre dessus), même
  // principe que createCritere.
  return context.entities.Service.create({
    data: {
      libelle_service: args.libelle_service.trim(),
      id_entreprise: context.user.id_entreprise,
    },
  });
};

export const createCritere = async (
  args: { libelle_critere: string; description?: string; type_reponse?: string; options_reponse?: string; id_agence?: number; serviceIds?: number[] },
  context: any
) => {
  requireAuth(context);
  // Faille corrigée : cette action n'exigeait auparavant AUCUN rôle
  // particulier — n'importe quel utilisateur connecté (y compris un simple
  // AGENT) pouvait créer des critères d'évaluation.
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const libelle = args.libelle_critere?.trim();
  if (!libelle) {
    throw new HttpError(400, "Le libellé est requis.");
  }
  // Garde-fou de taille raisonnable : évite qu'un champ texte libre ne
  // devienne un vecteur de saturation de la base ou d'affichage cassé
  // dans l'UI (carte qui explose en hauteur, PNG d'affiche illisible...).
  if (libelle.length > 300) {
    throw new HttpError(400, 'Le libellé ne doit pas dépasser 300 caractères.');
  }
  const description = args.description?.trim() || null;
  if (description && description.length > 1000) {
    throw new HttpError(400, 'La description ne doit pas dépasser 1000 caractères.');
  }

  const typesValides = ['SMILEY', 'OUI_NON', 'QCM', 'TEXTE'];
  const typeReponse = args.type_reponse && typesValides.includes(args.type_reponse) ? args.type_reponse : 'SMILEY';
  if (typeReponse === 'QCM' && !args.options_reponse?.trim()) {
    throw new HttpError(400, 'Les choix (QCM) sont requis pour ce type de réponse.');
  }

  // Faille corrigée : id_agence fourni par le client n'était jamais vérifié.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  // Dédoublonnage défensif : un id de service envoyé deux fois par erreur
  // (double-clic, état client désynchronisé) ne doit pas produire un
  // critère rattaché en double à la même opération.
  const serviceIds = args.serviceIds ? Array.from(new Set(args.serviceIds)) : [];
  if (serviceIds.length > 0) {
    for (const idService of serviceIds) {
      await assertServiceAccessible(context, idService);
    }
  }

  // Transaction atomique : Critere + AgenceCritere + rattachements
  // CritereService doivent réussir ensemble ou pas du tout. Avant ce
  // correctif, une erreur en cours de boucle (ex. coupure DB) pouvait
  // laisser un critère "orphelin" — créé, mais sans AgenceCritere (donc
  // invisible dans le catalogue actif) ni tous ses rattachements demandés.
  const critere = await prisma.$transaction(async (tx) => {
    const created = await tx.critere.create({
      data: {
        libelle_critere: libelle,
        description,
        type_reponse: typeReponse,
        options_reponse: typeReponse === 'QCM' ? args.options_reponse?.trim() || null : null,
        // Isolation demandée : un critère créé par une entreprise reste
        // invisible aux autres entreprises (getCriteres filtre dessus).
        id_entreprise: context.user.id_entreprise,
      },
    });

    await tx.agenceCritere.create({
      data: { id_agence: idAgence, id_critere: created.id },
    });

    // Rattachement optionnel à une ou plusieurs opérations (Service) : c'est
    // ce qui permet au formulaire de collecte d'afficher une liste de
    // questions différente selon l'opération choisie par le client (voir
    // CollectePage.tsx / getFormDefinitionForGuichet). Sans ça, le critère
    // n'apparaît que dans le fallback "critères de l'agence". On l'ajoute à
    // la fin de chaque opération choisie (ordre = nombre de critères déjà
    // présents dans cette opération, calculé DANS la transaction pour
    // éviter qu'une création concurrente ne fausse le compte).
    for (const idService of serviceIds) {
      const nbExistants = await tx.critereService.count({ where: { id_service: idService } });
      await tx.critereService.create({
        data: { id_critere: created.id, id_service: idService, ordre: nbExistants },
      });
    }

    return created;
  });

  return critere;
};

// ============================================================================
// GLISSER-DÉPOSER DES QUESTIONS SUR LES OPÉRATIONS (type "todo")
// ============================================================================
// Permet à la DIRECTION / QUALITE / CHEF_AGENCE de déplacer une question
// (Critere) vers une opération (Service), de la retirer, et de réordonner
// librement les questions au sein d'une opération, comme une liste de tâches.

/** Vérifie qu'un critère est bien visible/gérable par l'entreprise de l'utilisateur courant. */
async function assertCritereAccessible(context: any, idCritere: number) {
  const critere = await context.entities.Critere.findUnique({ where: { id: idCritere } });
  if (!critere) throw new HttpError(404, 'Critère introuvable.');
  if (critere.id_entreprise !== null && critere.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, 'Ce critère ne fait pas partie de votre entreprise.');
  }
  return critere;
}

/** Vérifie qu'une opération est bien visible/gérable par l'entreprise de l'utilisateur courant. */
async function assertServiceAccessible(context: any, idService: number) {
  const service = await context.entities.Service.findUnique({ where: { id: idService } });
  if (!service) throw new HttpError(404, 'Opération introuvable.');
  if (service.id_entreprise !== null && service.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Cette opération ne fait pas partie de votre entreprise.");
  }
  return service;
}

/**
 * Déplace une question (critère) vers une opération, à une position donnée
 * (glisser-déposer depuis le vivier "non assignées" vers une colonne
 * d'opération, ou d'une opération vers une autre). Si la question était déjà
 * rattachée à une autre opération, elle en est retirée (une question ne
 * peut être active que dans les opérations où elle est explicitement
 * placée). `ordre` est la position cible dans la colonne de destination ;
 * les autres questions de cette colonne sont décalées en conséquence.
 */
export const moveCritereToService = async (
  args: { id_critere: number; id_service: number; ordre: number },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  const idService = Number(args.id_service);
  const ordreDemande = Number(args.ordre);
  if (!Number.isInteger(idCritere) || !Number.isInteger(idService)) {
    throw new HttpError(400, 'Identifiants invalides.');
  }
  if (!Number.isFinite(ordreDemande)) {
    throw new HttpError(400, 'Position invalide.');
  }

  await assertCritereAccessible(context, idCritere);
  await assertServiceAccessible(context, idService);

  // Transaction atomique : lecture de l'ordre actuel + suppression des
  // autres rattachements + réécriture complète de l'ordre de la colonne
  // de destination doivent former une seule opération indivisible. Sans
  // transaction, une erreur en cours de route (ex. la question est
  // retirée des autres opérations mais l'upsert échoue) pouvait faire
  // disparaître une question de partout — perte de donnée silencieuse.
  await prisma.$transaction(async (tx) => {
    const existants = await tx.critereService.findMany({
      where: { id_service: idService },
      orderBy: { ordre: 'asc' },
    });

    // On retire la question si elle était déjà dans cette colonne, puis on
    // la réinsère à la position demandée (permet aussi bien un simple
    // réordonnancement au sein d'une même opération qu'un déplacement
    // depuis une autre opération).
    const sansLaQuestion = existants.filter((cs) => cs.id_critere !== idCritere);
    const position = Math.max(0, Math.min(Math.round(ordreDemande), sansLaQuestion.length));
    const idsOrdonnes = [
      ...sansLaQuestion.slice(0, position).map((cs) => cs.id_critere),
      idCritere,
      ...sansLaQuestion.slice(position).map((cs) => cs.id_critere),
    ];

    await tx.critereService.deleteMany({
      where: { id_critere: idCritere, id_service: { not: idService } },
    });

    // Écritures séquentielles (et non en parallèle) À DESSEIN à l'intérieur
    // de la transaction : des upserts concurrents sur les mêmes lignes
    // peuvent se verrouiller mutuellement (deadlock Postgres) si deux
    // requêtes similaires s'exécutent en même temps. Le nombre de questions
    // par opération reste faible (quelques dizaines au plus), le coût de la
    // séquentialité est négligeable face au gain de fiabilité.
    for (let index = 0; index < idsOrdonnes.length; index++) {
      const idCritereCourant = idsOrdonnes[index];
      await tx.critereService.upsert({
        where: { id_critere_id_service: { id_critere: idCritereCourant, id_service: idService } },
        create: { id_critere: idCritereCourant, id_service: idService, ordre: index },
        update: { ordre: index },
      });
    }
  });

  return { success: true };
};

/** Retire une question d'une opération (retour dans le vivier "non assignées"). */
export const removeCritereFromService = async (
  args: { id_critere: number; id_service: number },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  const idService = Number(args.id_service);
  if (!Number.isInteger(idCritere) || !Number.isInteger(idService)) {
    throw new HttpError(400, 'Identifiants invalides.');
  }

  await assertCritereAccessible(context, idCritere);
  await assertServiceAccessible(context, idService);

  await context.entities.CritereService.deleteMany({
    where: { id_critere: idCritere, id_service: idService },
  });

  return { success: true };
};

/**
 * Réordonnancement en masse d'une opération : reçoit la liste complète des
 * ids de critères dans le nouvel ordre souhaité (résultat d'un drag & drop
 * réordonnant plusieurs cartes à la fois côté client).
 */
export const reorderCriteresInService = async (
  args: { id_service: number; orderedCritereIds: number[] },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const idService = Number(args.id_service);
  if (!Number.isInteger(idService)) {
    throw new HttpError(400, 'Identifiant d\'opération invalide.');
  }
  if (!Array.isArray(args.orderedCritereIds) || args.orderedCritereIds.length === 0) {
    throw new HttpError(400, 'La liste des questions à réordonner est requise.');
  }
  const orderedIds = args.orderedCritereIds.map(Number);
  if (orderedIds.some((id) => !Number.isInteger(id))) {
    throw new HttpError(400, 'Liste de critères invalide.');
  }
  // Garde-fou : des ids en double dans la liste indiqueraient un état
  // client corrompu (deux cartes avec le même id affichées à la fois) —
  // mieux vaut refuser explicitement que réordonnancer sur une base fausse.
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new HttpError(400, 'La liste contient des doublons.');
  }

  await assertServiceAccessible(context, idService);

  // Vérifie que TOUS les critères fournis appartiennent bien déjà à cette
  // opération avant d'écrire quoi que ce soit : évite qu'un client
  // désynchronisé (onglet resté ouvert, état obsolète) ne fasse passer
  // silencieusement un ordre partiel ou incorrect.
  const rattaches = await context.entities.CritereService.findMany({
    where: { id_service: idService, id_critere: { in: orderedIds } },
    select: { id_critere: true },
  });
  if (rattaches.length !== orderedIds.length) {
    throw new HttpError(409, "La liste fournie ne correspond plus à l'état actuel de cette opération. Rechargez la page.");
  }

  await prisma.$transaction(
    orderedIds.map((idCritere, index) =>
      prisma.critereService.updateMany({
        where: { id_critere: idCritere, id_service: idService },
        data: { ordre: index },
      })
    )
  );

  return { success: true };
};

// ============================================================================
// OBJECTIFS DE SATISFACTION (Module 1 — Planification)
// ============================================================================

export const upsertObjectif = async (
  args: { id_agence?: number; id_critere: number; valeur_cible: number; date_debut: string; date_fin: string },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  // Faille corrigée : id_agence fourni par le client n'était jamais vérifié.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  if (args.valeur_cible < 0 || args.valeur_cible > 100) {
    throw new HttpError(400, "L'objectif doit être compris entre 0 et 100%.");
  }

  // Chercher un objectif actif existant pour ce couple agence/critère
  const existing = await context.entities.Objectif.findFirst({
    where: { id_agence: idAgence, id_critere: args.id_critere },
  });

  if (existing) {
    return context.entities.Objectif.update({
      where: { id: existing.id },
      data: {
        valeur_cible: args.valeur_cible,
        date_debut: new Date(args.date_debut),
        date_fin: new Date(args.date_fin),
      },
    });
  }

  return context.entities.Objectif.create({
    data: {
      id_agence: idAgence,
      id_critere: args.id_critere,
      valeur_cible: args.valeur_cible,
      date_debut: new Date(args.date_debut),
      date_fin: new Date(args.date_fin),
    },
  });
};

// ============================================================================
// TÂCHES CORRECTIVES (Module 5 — Amélioration / Kanban)
// ============================================================================

export const createTacheCorrective = async (
  args: { id_alerte: number; titre: string; description?: string; date_echeance: string; id_responsable: string },
  context: any
) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  if (!args.titre?.trim()) throw new HttpError(400, 'Le titre de la tâche est requis.');

  // Faille corrigée : l'alerte ciblée n'était jamais vérifiée — un
  // CHEF_AGENCE pouvait créer une tâche corrective sur une alerte d'une
  // AUTRE agence.
  const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, BigInt(args.id_alerte));
  await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');

  const responsable = await context.entities.User.findUnique({ where: { id: args.id_responsable } });
  if (!responsable) throw new HttpError(404, 'Responsable introuvable.');
  if (responsable.id_agence !== idAgenceAlerte) {
    throw new HttpError(400, "Le responsable désigné n'appartient pas à l'agence de cette alerte.");
  }

  const tache = await context.entities.TacheCorrective.create({
    data: {
      titre: args.titre.trim(),
      description: args.description?.trim() || null,
      statut_tache: 'A_FAIRE',
      date_echeance: new Date(args.date_echeance),
      id_alerte: BigInt(args.id_alerte),
      id_responsable: args.id_responsable,
    },
  });

  // Enregistrement de la création dans l'historique d'audit
  await context.entities.TacheCorrectiveHistorique.create({
    data: {
      id_tache: tache.id,
      ancien_statut: 'CREATION',
      nouveau_statut: 'A_FAIRE',
      commentaire: `Tâche créée par ${(context.user as any).email || context.user.id}`,
      id_auteur: context.user.id,
    },
  });

  return tache;
};

export const updateStatutTache = async (
  args: { id: number; statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' },
  context: any
) => {
  // Faille critique corrigée : cette action n'exigeait auparavant QUE d'être
  // authentifié — n'importe quel utilisateur connecté, y compris un simple
  // AGENT, pouvait modifier le statut de n'importe quelle tâche corrective
  // de n'importe quelle agence (voire d'une autre entreprise).
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const STATUTS_VALIDES = ['A_FAIRE', 'EN_COURS', 'TERMINEE'];
  if (!STATUTS_VALIDES.includes(args.statut)) {
    throw new HttpError(400, 'Statut invalide.');
  }

  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: BigInt(args.id) },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  const idAgenceTache = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
  if (!idAgenceTache) throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
  await assertAgenceAccess(context, context.entities, idAgenceTache, 'tâche corrective');

  const ancienStatut = tache.statut_tache;

  const updated = await context.entities.TacheCorrective.update({
    where: { id: BigInt(args.id) },
    data: {
      statut_tache: args.statut,
      ...(args.statut === 'TERMINEE' ? { date_cloture: new Date() } : {}),
    },
  });

  // Enregistrement du changement de statut dans l'historique d'audit
  await context.entities.TacheCorrectiveHistorique.create({
    data: {
      id_tache: BigInt(args.id),
      ancien_statut: ancienStatut,
      nouveau_statut: args.statut,
      commentaire: args.statut === 'TERMINEE' ? 'Tâche clôturée' : null,
      id_auteur: context.user.id,
    },
  });

  return updated;
};

export const marquerAlerteTraitee = async (args: { id_alerte: number }, context: any) => {
  // Faille critique corrigée : aucun rôle ni aucune vérification d'agence
  // n'étaient appliqués — n'importe quel compte connecté pouvait clôturer
  // l'alerte de n'importe quelle agence.
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const idAlerte = BigInt(args.id_alerte);
  const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, idAlerte);
  await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');

  return context.entities.Alerte.update({
    where: { id: idAlerte },
    data: {
      statut_alerte: 'TRAITEE',
      date_traitement: new Date(),
    },
  });
};

// ============================================================================
// TARIFICATION SaaS (montants en FCFA) — réservé aux admins CXSAT
// ============================================================================

export const updatePlanPricing = async (
  args: { planId: 'hobby' | 'pro' | 'credits10'; amountFcfa: number },
  context: any
) => {
  requireAdmin(context);

  const { planId, amountFcfa } = args;

  if (!['hobby', 'pro', 'credits10'].includes(planId)) {
    throw new HttpError(400, 'Identifiant de plan invalide.');
  }

  if (!Number.isInteger(amountFcfa) || amountFcfa < 0) {
    throw new HttpError(400, 'Le montant doit être un entier positif en FCFA.');
  }

  return context.entities.PlanPricing.upsert({
    where: { id: planId },
    update: { amountFcfa },
    create: { id: planId, amountFcfa },
  });
};

// ============================================================================
// SUPPRESSION D'OBJECTIF (Module 5 — Planification)
// ============================================================================

export const deleteObjectif = async (args: { id: number }, context: any) => {
  requireAuth(context);
  requireRole(context, ['DIRECTION', 'QUALITE', 'CHEF_AGENCE']);

  const objectif = await context.entities.Objectif.findUnique({
    where: { id: args.id },
  });
  if (!objectif) throw new HttpError(404, 'Objectif introuvable.');

  // Vérifier que l'objectif appartient bien à une agence de l'entreprise
  // de l'utilisateur courant (isolation multi-tenant).
  await assertAgenceAccess(context, context.entities, objectif.id_agence, 'objectif');

  return context.entities.Objectif.delete({ where: { id: args.id } });
};

// upsertBrandConfig supprimé — BrandConfig n'existe plus (outil interne).
// La marque est figée dans src/shared/branding.ts.
export const upsertBrandConfig = async (_args: any, _context: any): Promise<void> => {
  throw new HttpError(410, "La personnalisation de marque a été désactivée dans cette version.");
};
  color_success: string;
  color_success_foreground: string;
  color_warning: string;
  color_warning_foreground: string;
  color_border: string;
  color_input: string;
  color_ring: string;
  border_radius: string;
  shadow_style: 'NONE' | 'DEFAULT' | 'SHARP' | 'GLOW';
  font_family: string;
  font_url?: string | null;
  form_title: string;
  form_subtitle: string;
  form_thank_you: string;
  qr_slogan: string;
  ussd_help_text: string;
  hide_cxsat_branding: boolean;
};

export const upsertBrandConfig = async (args: UpsertBrandConfigArgs, context: any) => {
  requireAuth(context);
  // Faille corrigée : la charte graphique (BrandConfig) est une ressource
  // au niveau ENTREPRISE (une seule ligne par id_entreprise, appliquée à
  // TOUTES les agences du réseau — voir BrandContext.tsx côté client). Un
  // CHEF_AGENCE ne gère qu'une seule agence et ne doit pas pouvoir changer
  // les couleurs, le logo, les textes du formulaire ou la police pour
  // l'ensemble des autres agences de l'entreprise. Seuls les rôles à portée
  // entreprise (DIRECTION/QUALITE) peuvent modifier la marque.
  requireRole(context, ['DIRECTION', 'QUALITE']);

  const idEntreprise = context.user.id_entreprise;
  if (!idEntreprise) {
    throw new HttpError(403, "L'utilisateur n'est rattaché à aucune entreprise.");
  }

  // Validation basique des formats HSL (regex simple : "H S% L%")
  const isHslFormat = (val: string) => /^\d+\s+\d+%\s+\d+(\.\d+)?%$/.test(val.trim());
  const colorsToValidate = [
    args.color_background, args.color_foreground,
    args.color_card, args.color_card_foreground,
    args.color_popover, args.color_popover_foreground,
    args.color_primary, args.color_primary_foreground,
    args.color_secondary, args.color_secondary_foreground,
    args.color_accent, args.color_accent_foreground,
    args.color_muted, args.color_muted_foreground,
    args.color_destructive, args.color_destructive_foreground,
    args.color_success, args.color_success_foreground,
    args.color_warning, args.color_warning_foreground,
    args.color_border, args.color_input, args.color_ring
  ];

  for (const col of colorsToValidate) {
    if (!isHslFormat(col)) {
      throw new HttpError(400, `La couleur "${col}" n'est pas au format HSL attendu ("H S% L%").`);
    }
  }

  // Garde-fous de taille raisonnable sur les champs texte libres : évite
  // qu'un titre ou un slogan démesuré ne casse la mise en page du
  // formulaire public de collecte (CollectePage), consultable par tous les
  // clients scannant un QR code.
  const textFields: Array<[string, string | undefined, number]> = [
    ['platform_name', args.platform_name, 80],
    ['platform_description', args.platform_description, 200],
    ['form_title', args.form_title, 150],
    ['form_subtitle', args.form_subtitle, 200],
    ['form_thank_you', args.form_thank_you, 200],
    ['qr_slogan', args.qr_slogan, 100],
    ['ussd_help_text', args.ussd_help_text, 150],
  ];
  for (const [label, value, max] of textFields) {
    if (value && value.length > max) {
      throw new HttpError(400, `Le champ "${label}" ne doit pas dépasser ${max} caractères.`);
    }
  }
  if (!args.platform_name?.trim()) {
    throw new HttpError(400, 'Le nom de la plateforme est requis.');
  }

  // Garde-fou : les logos/favicon sont envoyés en base64 (data URL) depuis
  // le client, plafonnés à 150 Ko côté formulaire — mais un appel API
  // direct pourrait contourner cette limite client. On la revérifie ici
  // (150 Ko encodés ≈ 200 000 caractères en base64) pour éviter qu'une
  // charte graphique ne fasse exploser la taille de chaque page de la
  // plateforme (chargée sur CHAQUE page vue par CHAQUE utilisateur/client).
  const MAX_DATA_URL_LENGTH = 205_000;
  for (const [label, value] of [
    ['logo_url', args.logo_url],
    ['logo_dark_url', args.logo_dark_url],
    ['favicon_url', args.favicon_url],
  ] as const) {
    if (value && value.length > MAX_DATA_URL_LENGTH) {
      throw new HttpError(400, `L'image "${label}" est trop volumineuse (max ~150 Ko).`);
    }
  }

  // Faille corrigée : font_url était injecté tel quel dans une règle CSS
  // `@import url('${font_url}')` côté client (BrandContext.tsx). Une valeur
  // contenant un guillemet simple aurait permis d'injecter du CSS arbitraire
  // sur TOUTES les pages de l'entreprise (et donc, via CollectePage, sur le
  // formulaire vu par les clients finaux non-authentifiés). On restreint
  // désormais font_url à une URL https vers une feuille de style de police,
  // sans caractères permettant de sortir du contexte `url('...')`.
  if (args.font_url) {
    const url = args.font_url.trim();
    const isSafeHttpsCssUrl = /^https:\/\/[a-zA-Z0-9.\-]+\/[^\s'"()]*$/.test(url) && url.length <= 500;
    if (!isSafeHttpsCssUrl) {
      throw new HttpError(400, "L'URL de police doit être une URL https valide (sans guillemets ni espaces).");
    }
  }

  // Le type TS de shadow_style n'est qu'une contrainte de compilation :
  // un appel API direct (hors UI) pourrait envoyer n'importe quelle chaîne.
  // On revalide donc l'énumération à l'exécution.
  const SHADOW_STYLES_VALIDES = ['NONE', 'DEFAULT', 'SHARP', 'GLOW'];
  if (!SHADOW_STYLES_VALIDES.includes(args.shadow_style)) {
    throw new HttpError(400, "Style d'ombre invalide.");
  }

  // Les logos/favicon doivent rester des data-URLs d'image (upload direct,
  // voir handleLogoUpload côté client) — jamais un schéma exotique
  // (javascript:, vbscript:...) qui n'a rien à faire dans un `<img src>`
  // ou un `<link href>` injecté sur chaque page de la plateforme.
  for (const [label, value] of [
    ['logo_url', args.logo_url],
    ['logo_dark_url', args.logo_dark_url],
    ['favicon_url', args.favicon_url],
  ] as const) {
    if (value && !/^data:image\/(png|jpe?g|svg\+xml|webp|gif|x-icon);base64,/.test(value)) {
      throw new HttpError(400, `L'image "${label}" doit être un fichier uploadé valide.`);
    }
  }

  return context.entities.BrandConfig.upsert({
    where: { id_entreprise: idEntreprise },
    update: {
      platform_name: args.platform_name,
      platform_description: args.platform_description ?? "Plateforme de satisfaction client",
      logo_url: args.logo_url,
      logo_dark_url: args.logo_dark_url,
      favicon_url: args.favicon_url,
      color_background: args.color_background,
      color_foreground: args.color_foreground,
      color_card: args.color_card,
      color_card_foreground: args.color_card_foreground,
      color_popover: args.color_popover,
      color_popover_foreground: args.color_popover_foreground,
      color_primary: args.color_primary,
      color_primary_foreground: args.color_primary_foreground,
      color_secondary: args.color_secondary,
      color_secondary_foreground: args.color_secondary_foreground,
      color_accent: args.color_accent,
      color_accent_foreground: args.color_accent_foreground,
      color_muted: args.color_muted,
      color_muted_foreground: args.color_muted_foreground,
      color_destructive: args.color_destructive,
      color_destructive_foreground: args.color_destructive_foreground,
      color_success: args.color_success,
      color_success_foreground: args.color_success_foreground,
      color_warning: args.color_warning,
      color_warning_foreground: args.color_warning_foreground,
      color_border: args.color_border,
      color_input: args.color_input,
      color_ring: args.color_ring,
      border_radius: args.border_radius,
      shadow_style: args.shadow_style,
      font_family: args.font_family,
      font_url: args.font_url,
      form_title: args.form_title,
      form_subtitle: args.form_subtitle,
      form_thank_you: args.form_thank_you,
      qr_slogan: args.qr_slogan,
      ussd_help_text: args.ussd_help_text,
      hide_cxsat_branding: args.hide_cxsat_branding,
    },
    create: {
      id_entreprise: idEntreprise,
      platform_name: args.platform_name,
      platform_description: args.platform_description ?? "Plateforme de satisfaction client",
      logo_url: args.logo_url,
      logo_dark_url: args.logo_dark_url,
      favicon_url: args.favicon_url,
      color_background: args.color_background,
      color_foreground: args.color_foreground,
      color_card: args.color_card,
      color_card_foreground: args.color_card_foreground,
      color_popover: args.color_popover,
      color_popover_foreground: args.color_popover_foreground,
      color_primary: args.color_primary,
      color_primary_foreground: args.color_primary_foreground,
      color_secondary: args.color_secondary,
      color_secondary_foreground: args.color_secondary_foreground,
      color_accent: args.color_accent,
      color_accent_foreground: args.color_accent_foreground,
      color_muted: args.color_muted,
      color_muted_foreground: args.color_muted_foreground,
      color_destructive: args.color_destructive,
      color_destructive_foreground: args.color_destructive_foreground,
      color_success: args.color_success,
      color_success_foreground: args.color_success_foreground,
      color_warning: args.color_warning,
      color_warning_foreground: args.color_warning_foreground,
      color_border: args.color_border,
      color_input: args.color_input,
      color_ring: args.color_ring,
      border_radius: args.border_radius,
      shadow_style: args.shadow_style,
      font_family: args.font_family,
      font_url: args.font_url,
      form_title: args.form_title,
      form_subtitle: args.form_subtitle,
      form_thank_you: args.form_thank_you,
      qr_slogan: args.qr_slogan,
      ussd_help_text: args.ussd_help_text,
      hide_cxsat_branding: args.hide_cxsat_branding,
    },
  });
};