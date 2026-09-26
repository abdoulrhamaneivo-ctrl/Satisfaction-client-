// src/server/actions.ts
import { HttpError } from 'wasp/server';
import { prisma } from 'wasp/server';
import { envoyerEmailBrevo } from './lib/emailBrevo';
import {
  createProviderId,
  createUser,
  sanitizeAndSerializeProviderData,
} from 'wasp/server/auth';
import crypto from 'node:crypto';
import { envoyerAlerteWhatsApp } from './notifications/gateway';
import { checkRateLimit, extraireIp } from './rateLimit';
import { journaliser } from './audit';
import {
  normaliserTelephoneE164,
  sanitiserCommentaire,
  hmacSHA256,
  validerSecretEnv,
  versHttpSiEntreeInvalide,
} from './validation';
import {
  construireScoresAStocker,
  parseOptionsCSV,
  normaliserLibelle,
} from '../shared/scoringQCM';
import {
  normaliserEntree,
  resoudreEntree,
  type EntreeBrute,
  type ItemResolu,
} from './resolutionSoumission';
import {
  requireAuth,
  requireRole,
  assertAgenceAccess,
  assertEntrepriseActive,
  resolveAgenceId,
  estDirectionCumulee,
} from './middleware/rowLevelSecurity';

// Utilisé pour construire des liens directs vers l'application dans les
// notifications SMS/WhatsApp (ex. lien vers /alertes-taches).
const FRONTEND_URL = process.env.WASP_WEB_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

// C2 (J+30) : Sel HMAC anti-rejeu — OBLIGATOIRE en prod, validé à l'usage (lazy).
function getAntiReplaySalt(): string {
  return validerSecretEnv('ANTI_REPLAY_SALT', process.env.ANTI_REPLAY_SALT);
}

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

type CreateGuichetArgs = {
  nomGuichet: string;
  typeGuichet: string;
  id_agence: number;
  serviceIds?: number[];
};

// Alphabet QR public : sans 0/O/1/l pour éviter toute confusion à la lecture
// d'un QR imprimé. 10 caractères = 32^10 ≈ 10^15 combinaisons.
const ALPHABET_CODE_PUBLIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const genererCodePublic = (): string => {
  const octets = crypto.randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += ALPHABET_CODE_PUBLIC[octets[i] % ALPHABET_CODE_PUBLIC.length];
  }
  return code;
};

// ============================================================================
// GUICHETS
// ============================================================================

export const createGuichet = async (args: CreateGuichetArgs, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  // La Direction gère tout le réseau (guichets compris), comme les chefs —
  // elle était en lecture seule sans raison métier (rôle incohérent).
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const { nomGuichet, typeGuichet, id_agence, serviceIds } = args;

  if (!nomGuichet?.trim() || !id_agence) {
    throw new HttpError(400, "Le nom du guichet et l'agence parente sont requis.");
  }

  await assertAgenceAccess(context, context.entities, id_agence, 'agence');

  // SÉCURITÉ MULTI-TENANT : les services attachés à un guichet doivent
  // appartenir au MÊME tenant que l'agence (ou être du socle commun
  // id_entreprise = null). Sans ce contrôle, un guichet de l'entreprise A
  // pouvait être relié à un service de l'entreprise B simplement en envoyant
  // son ID dans serviceIds (faille de relation croisée).
  // FIX 05/09 (500 quota) : l'agence est chargée UNE fois ici et réutilisée
  // pour le quota plus bas (avant, le bloc quota relisait sans id_entreprise
  // puis cherchait Entreprise avec { id: undefined } → crash Prisma).
  const agence = await context.entities.Agence.findUnique({
    where: { id: id_agence },
    select: { id_entreprise: true },
  });
  if (!agence?.id_entreprise) {
    throw new HttpError(400, "Agence introuvable pour ce guichet.");
  }
  if (serviceIds && serviceIds.length > 0) {
    const servicesValides = await context.entities.Service.findMany({
      where: {
        id: { in: serviceIds.map(Number) },
        OR: [
          { id_entreprise: null },
          { id_entreprise: agence.id_entreprise },
        ],
      },
      select: { id: true },
    });
    if (servicesValides.length !== serviceIds.length) {
      throw new HttpError(400, "Un ou plusieurs services ne sont pas disponibles pour cette agence.");
    }
  }

  const servicesConnect = serviceIds && serviceIds.length > 0
    ? { connect: serviceIds.map(id => ({ id })) }
    : undefined;

  // Le chef d'agence ne doit PAS être affecté directement à un guichet :
  // l'affectation est réservée aux agents qu'il ajoute. Le guichet est donc
  // créé sans affectation par défaut ; l'agent y sera affecté depuis le
  // planning (createAffectation).

  // QUOTA SAAS : limite de guichets du plan, vérifiée côté serveur (via les
  // agences de l'entreprise — un guichet appartient toujours à une agence).
  const idEntrepriseGuichet = agence.id_entreprise;
  const agencesIds = await context.entities.Agence.findMany({
    where: { id_entreprise: idEntrepriseGuichet },
    select: { id: true },
  });
  const entrepriseQuotaGuichets = await context.entities.Entreprise.findUnique({
    where: { id: idEntrepriseGuichet },
    select: { limite_guichets: true },
  });
  if (entrepriseQuotaGuichets) {
    const nbGuichets = await context.entities.Guichet.count({
      where: { id_agence: { in: agencesIds.map((a: any) => a.id) }, archive: false },
    });
    if (nbGuichets >= entrepriseQuotaGuichets.limite_guichets) {
      throw new HttpError(
        403,
        `Limite du plan atteinte (${entrepriseQuotaGuichets.limite_guichets} guichets). Passez à un plan supérieur ou contactez Yeba.`
      );
    }
  }

  return await context.entities.Guichet.create({
    data: {
      nom_guichet: nomGuichet.trim(),
      type_guichet: typeGuichet || 'Physique',
      actif: true,
      // QR opaque (Doc 11 §7) : identifiant public non prédictible imprimé
      // dans le QR code — l'ID séquentiel interne n'apparaît nulle part
      // publiquement. Alphabet sans 0/O/1/l (lecture d'un QR imprimé).
      code_public: genererCodePublic(),
      agence: { connect: { id: id_agence } },
      services: servicesConnect,
    }
  });
};

export const updateGuichetServices = async (
  args: { id_guichet: number; serviceIds: number[] },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const guichet = await context.entities.Guichet.findUnique({
    where: { id: args.id_guichet }
  });

  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');

  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  // SÉCURITÉ MULTI-TENANT : même contrôle que createGuichet — les services
  // d'une autre entreprise ne peuvent jamais être attachés à ce guichet.
  const agenceDuGuichet = await context.entities.Agence.findUnique({
    where: { id: guichet.id_agence },
    select: { id_entreprise: true },
  });
  const servicesValides = await context.entities.Service.findMany({
    where: {
      id: { in: args.serviceIds.map(Number) },
      OR: [
        { id_entreprise: null },
        { id_entreprise: agenceDuGuichet?.id_entreprise ?? -1 },
      ],
    },
    select: { id: true },
  });
  if (servicesValides.length !== args.serviceIds.length) {
    throw new HttpError(400, "Un ou plusieurs services ne sont pas disponibles pour cette agence.");
  }

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
// ARCHIVAGE — voir docs/archivage.md pour la logique d'ensemble.
// Principe commun à toutes les fonctions archiver*/desarchiver* de ce
// fichier : on ne supprime JAMAIS de ligne. On pose juste `archive: true` +
// `date_archivage`, ce qui la fait disparaître des vues actives (Kanban,
// listes, sélecteurs) sans toucher à son historique ni aux statistiques.
// ============================================================================

export const archiverGuichet = async (args: { id_guichet: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');
  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  if (guichet.archive) return guichet; // déjà archivé : idempotent, pas d'erreur

  return context.entities.Guichet.update({
    where: { id: args.id_guichet },
    data: { archive: true, date_archivage: new Date() },
  });
};

export const desarchiverGuichet = async (args: { id_guichet: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');
  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  return context.entities.Guichet.update({
    where: { id: args.id_guichet },
    data: { archive: false, date_archivage: null },
  });
};



export const assignAgent = async (args: any, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
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
  if (agent.role !== 'AGENT') {
    throw new HttpError(400, "Seul un agent (rôle AGENT) peut être affecté à un guichet. Le chef d'agence n'est pas affecté directement à un guichet.");
  }
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

/**
 * Modifie une affectation existante (créneau, guichet ou agent).
 * Réutilise les mêmes contrôles d'accès et la même détection de
 * chevauchement que assignAgent, en excluant l'affectation modifiée
 * elle-même de la recherche de chevauchement.
 */
export const updateAffectationGuichet = async (args: any, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  if (!args.id) throw new HttpError(400, "Identifiant d'affectation manquant.");
  if (!args.date || !args.heure_debut || !args.heure_fin || !args.id_guichet || !args.id_agent) {
    throw new HttpError(400, 'Tous les champs de planification sont requis.');
  }
  if (args.heure_fin <= args.heure_debut) {
    throw new HttpError(400, "L'heure de fin doit être postérieure à l'heure de début.");
  }

  const affectation = await context.entities.AffectationGuichet.findUnique({
    where: { id: args.id },
    include: { guichet: { select: { id_agence: true } } },
  });
  if (!affectation) throw new HttpError(404, 'Affectation introuvable.');

  // L'affectation doit rester dans le périmètre de l'appelant (agence d'origine).
  await assertAgenceAccess(context, context.entities, affectation.guichet.id_agence, 'affectation');

  const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
  if (!guichet) throw new HttpError(404, 'Guichet introuvable.');
  // Le nouveau guichet ciblé doit aussi rester dans le périmètre de l'appelant.
  await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');

  const agent = await context.entities.User.findUnique({ where: { id: args.id_agent } });
  if (!agent) throw new HttpError(404, 'Agent introuvable.');
  if (agent.role !== 'AGENT') {
    throw new HttpError(400, "Seul un agent (rôle AGENT) peut être affecté à un guichet. Le chef d'agence n'est pas affecté directement à un guichet.");
  }
  if (agent.id_agence !== guichet.id_agence) {
    throw new HttpError(400, "L'agent sélectionné n'appartient pas à l'agence de ce guichet.");
  }

  const chevauchement = await context.entities.AffectationGuichet.findFirst({
    where: {
      id: { not: args.id },
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
      `Cet agent est déjà affecté au guichet « ${chevauchement.guichet?.nom_guichet || 'inconnu'} » de ${chevauchement.heure_debut} à ${chevauchement.heure_fin}. Les créneaux ne peuvent pas se chevaucher.`
    );
  }

  return context.entities.AffectationGuichet.update({
    where: { id: args.id },
    data: {
      date_affectation: new Date(args.date),
      heure_debut: args.heure_debut,
      heure_fin: args.heure_fin,
      id_guichet: args.id_guichet,
      id_agent: args.id_agent,
    },
  });
};

/**
 * Retire une affectation du planning (guichet libéré pour ce créneau).
 * Note : on ne touche pas aux avis déjà collectés pendant ce créneau
 * (Reponse.id_agent conserve son historique, indépendant du planning).
 */
export const deleteAffectationGuichet = async (args: any, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  if (!args.id) throw new HttpError(400, "Identifiant d'affectation manquant.");

  const affectation = await context.entities.AffectationGuichet.findUnique({
    where: { id: args.id },
    include: { guichet: { select: { id_agence: true } } },
  });
  if (!affectation) throw new HttpError(404, 'Affectation introuvable.');

  await assertAgenceAccess(context, context.entities, affectation.guichet.id_agence, 'affectation');

  await context.entities.AffectationGuichet.delete({ where: { id: args.id } });
  return { success: true };
};

// ============================================================================
// COLLECTE D'AVIS (avec anti-rejeu + notifications)
// ============================================================================

/**
 * Nombre maximal de réponses acceptées dans UN appel public (Vague 5, P11).
 *
 * Calibré sur le réel : un formulaire de guichet compte quelques dizaines
 * de questions au maximum (un par critère, tous services et toutes agences
 * confondus). 50 laisse une marge très large tout en empêchant qu'un
 * appel unique transforme la vérification des critères en `IN (...)` de
 * taille arbitraire. La borne est sur le TOTAL, pas par entrée.
 */
const MAX_REPONSES_PAR_SOUMISSION = 50;

/**
 * Vérifie le nombre de réponses d'un avis (Vague 5, P11).
 *
 * Fonction pure et exportée pour être testée sans contexte serveur : chaque entrée
 * était déjà bornée (50 `optionIds`), mais la LONGUEUR DU TABLEAU ne
 * l'était pas. Un appel public unique pouvait envoyer 100 000 réponses et
 * transformer la vérification des critères — un `id IN (...)` — en requête
 * énorme, en mémoire et en temps base.
 *
 * La borne est sur le TOTAL. Elle est posée avant toute lecture en base :
 * un appel abusif doit être refusé sans coût.
 *
 * @returns un message d'erreur, ou `null` si le volume est acceptable.
 */
export function verifierVolumeReponses(
  responses: unknown,
  max: number = MAX_REPONSES_PAR_SOUMISSION,
): string | null {
  if (!Array.isArray(responses)) return null;
  if (responses.length > max) {
    return `Trop de réponses envoyées (max ${max} par avis).`;
  }
  return null;
}

const soumettreAvisImpl = async (args: any, context: any) => {
  const { code_public, score, critereId, canalId, commentaire, telephone, serviceId, responses } = args;

  // SÉCURITÉ (Vague 1, P1 — audit docs/audit/ETAT_REEL_PROJET.md) :
  // le `code_public` est désormais OBLIGATOIRE et l'identifiant numérique
  // n'est plus accepté. La version précédente priorisait `guichetId`, si bien
  // qu'un appel anonyme pouvait écrire un avis dans le guichet d'une autre
  // entreprise en devinant un entier (que la query publique renvoyait
  // elle-même). Le QR opaque est le seul identifiant d'entrée.
  const codeBrut = typeof code_public === 'string' ? code_public.toUpperCase().trim() : '';
  if (!codeBrut) {
    throw new HttpError(400, "Code de collecte requis.");
  }
  const guichetParCode = await context.entities.Guichet.findUnique({
    where: { code_public: codeBrut },
    select: { id: true, id_agence: true },
  });
  if (!guichetParCode) {
    throw new HttpError(404, "Guichet introuvable.");
  }
  const idGuichetEffectif = guichetParCode.id;

  // ANTI-ABUS (Doc 11 §9 S8 adapté à la route publique) : la route de
  // collecte est anonyme — sans rate limiting, un script peut saturer la
  // base de faux avis. Trois niveaux (C1) :
  //  - par (IP, guichet) : 8 avis / min de rafale, recharge 2/min → un
  //    humain qui aide plusieurs clients au guichet passe toujours ;
  //  - par IP seule : 30 avis / min → un même point d'accès NAT (café,
  //    opérateur mobile) servant plusieurs guichets reste fluide.
  //  - par guichet global : 100 avis / min anti-rafale distribuée.
  // Le téléphone seul ne suffit pas comme protection car il est optionnel.
  const ipClient = extraireIp(context);
  const rl1 = await checkRateLimit(`avis:${ipClient}:${idGuichetEffectif}`, { capacity: 8, refillPerMinute: 2 });
  if (!rl1.allowed) {
    await journaliser({ context, action: 'rateLimit.exceeded', resource: 'soumettreAvis', details: { cle: `ip:guichet:${ipClient}:${idGuichetEffectif}`, retryAfter: rl1.retryAfterSeconds } });
    throw new HttpError(429, `Trop de soumissions depuis cet appareil pour ce guichet. Réessayez dans ${rl1.retryAfterSeconds} s.`, { headers: { 'Retry-After': String(rl1.retryAfterSeconds) } });
  }
  const rl2 = await checkRateLimit(`avis:${ipClient}`, { capacity: 30, refillPerMinute: 10 });
  if (!rl2.allowed) {
    await journaliser({ context, action: 'rateLimit.exceeded', resource: 'soumettreAvis', details: { cle: `ip:${ipClient}`, retryAfter: rl2.retryAfterSeconds } });
    throw new HttpError(429, `Trop de soumissions depuis cette connexion. Réessayez dans ${rl2.retryAfterSeconds} s.`, { headers: { 'Retry-After': String(rl2.retryAfterSeconds) } });
  }
  const rl3 = await checkRateLimit(`avis:guichet:${idGuichetEffectif}`, { capacity: 100, refillPerMinute: 100 });
  if (!rl3.allowed) {
    await journaliser({ context, action: 'rateLimit.exceeded', resource: 'soumettreAvis', details: { cle: `guichet:${idGuichetEffectif}`, retryAfter: rl3.retryAfterSeconds } });
    throw new HttpError(429, `Guichet saturé. Réessayez dans ${rl3.retryAfterSeconds} s.`, { headers: { 'Retry-After': String(rl3.retryAfterSeconds) } });
  }

  // --- ANTI-REJEU (C2) : HMAC-SHA256(sel, E.164) scoped par entreprise + jour ---
  //
  // ⚠️ ATTENTION — LECTEUR PRESSÉ : ce bloc resemble à une protection, il
  // n'en est pas une. Le parcours public n'envoie le téléphone qu'en T2
  // (`completerSoumission`) : ici `telephone` est toujours absent, donc le
  // `if (telephone)` plus bas est faux et le rejet « déjà un avis
  // aujourd'hui » ne s'exécute JAMAIS. La protection réelle est le rate
  // limiting (plus haut) et la fenêtre de 30 min de T2, bornée par un
  // `id_soumission` non devinable.
  //
  // Conséquence assumée : un même numéro peut déposer un nombre illimité
  // d'avis dans la journée. Écarté par décision le 2026-09-26 — voir
  // docs/audit/ETAT_REEL_PROJET.md §3, P8. Ne pas « corriger » ce bloc
  // sans décision produit : cela changerait le comportement de collecte.
  let hachageTelephone: string | undefined;
    let telephoneE164: string | undefined;
    if (telephone) {
      telephoneE164 = normaliserTelephoneE164(telephone);
      hachageTelephone = hmacSHA256(getAntiReplaySalt(), telephoneE164);

      const debutJour = new Date();
      debutJour.setHours(0, 0, 0, 0);

      // Récupérer l'entreprise du guichet pour le scope tenant
      const guichetPourEntreprise = await context.entities.Guichet.findUnique({
        where: { id: Number(idGuichetEffectif) },
        select: { agence: { select: { id_entreprise: true } } },
      });
      if (!guichetPourEntreprise) throw new HttpError(404, 'Guichet introuvable.');

      // Code inatteignable depuis le parcours public : T1 ne reçoit pas de
      // téléphone (le client l'envoie en T2). Voir l'avertissement en tête
      // de fonction — le rejet existe mais n'est jamais appelé.
      const existant = await context.entities.VoteAntiRejeu.findFirst({
        where: {
          id_entreprise: guichetPourEntreprise.agence.id_entreprise,
          hachage_tel: hachageTelephone,
          date_vote: { gte: debutJour },
        },
      });

      if (existant) {
        throw new HttpError(429, 'Vous avez déjà soumis un avis depuis ce numéro aujourd\'hui.');
      }
    }
    // -----------------------------------------------------------

  const guichet = await context.entities.Guichet.findUnique({
    where: { id: Number(idGuichetEffectif) },
    include: { agence: { select: { archive: true, id_entreprise: true } } },
  });

  // La route est publique : la validation doit être répétée côté serveur
  // pour qu'un appel direct à l'action ne contourne pas la page de collecte.
  if (!guichet || !guichet.actif || guichet.archive || guichet.agence.archive) {
    throw new HttpError(404, "Guichet introuvable.");
  }

  // Garantit que le canal existe, sans dépendre d'un seed : aucune action ni
  // aucun seed ne crée jamais de ligne dans Canal, alors que le frontend
  // envoie systématiquement un canalId (ex. 1 pour QR_WEB). Sans cet upsert,
  // Reponse.create échouait en violation de clé étrangère sur id_canal dès
  // qu'aucune donnée n'avait été insérée manuellement en base.
  //
  // PERFORMANCE QR : l'upsert systématique a été retiré du chemin critique.
  // Les canaux sont créés par le seed (1=QR_WEB, 2=USSD, 3=IVR_VOCAL) et ne
  // sont jamais supprimés. L'upsert ne s'exécute que si l'insertion d'une
  // réponse échoue sur la clé étrangère id_canal (reroll ciblé), sinon zéro
  // requête supplémentaire pour le cas nominal qui est, de loin, le plus fréquent.
  const CANAUX_CONNUS: Record<number, { type_canal: string; langue_utilisee: string }> = {
    1: { type_canal: 'QR_WEB', langue_utilisee: 'fr' },
    2: { type_canal: 'USSD', langue_utilisee: 'fr' },
    3: { type_canal: 'IVR_VOCAL', langue_utilisee: 'fr' },
  };
  const idCanalResolved = canalId ? Number(canalId) : 1;
  const canalDefaults = CANAUX_CONNUS[idCanalResolved] ?? CANAUX_CONNUS[1];
  const assurerCanalExiste = async () => {
    await context.entities.Canal.upsert({
      where: { id: idCanalResolved },
      update: {},
      create: { id: idCanalResolved, ...canalDefaults },
    });
  };

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

  // Une reprise réseau ne doit pas transformer une même soumission en deux
  // avis. Le client conserve cet identifiant pendant son envoi ; si la
  // réponse a déjà été enregistrée, l'action est idempotente.
  // FIX 05/09 (audit) : le contrôle seul laisse passer les doubles
  // soumissions concurrentes. Le check ET l'insertion sont donc exécutés
  // dans une seule transaction (voir plus bas) : la seconde requête jumelle
  // voit la ligne créée par la première et renvoie l'existant.
  const idempotenceDemandee = Boolean(args.id_soumission);
  if (idempotenceDemandee) {
    const soumissionExistante = await context.entities.Reponse.findFirst({
      where: { id_soumission: submissionId },
      orderBy: { date_reponse: 'asc' },
    });
    if (soumissionExistante) return soumissionExistante;
  }

  // Normalisation des réponses — vague 1 : le client envoie des IDENTIFIANTS
  // (optionId / optionIds[]), des valeurs (ECHELLE/NPS) ou du texte (TEXTE).
  // Le `score` client n'est PLUS une source de vérité : il n'est accepté que
  // sur les chemins legacy/directs (SMILEY, OUI_NON, ECHELLE, compat texte),
  // toujours re-validé, jamais cru sur parole pour QCM/CASES.
  // (normaliserEntree : voir src/server/resolutionSoumission.ts)
  let entrees: EntreeBrute[] = [];
  if (responses && Array.isArray(responses) && responses.length > 0) {
    // Vague 5, P11 : borne haute sur le NOMBRE de réponses. Chaque entrée
    // était déjà bornée (50 optionIds), mais rien ne bornait la longueur
    // du tableau : un seul appel public pouvait envoyer 100 000 entrées et
    // transformer le `id IN (...)` de vérification des critères en requête
    // énorme, en mémoire et en temps base. La borne est posée sur le
    // total, pas par entrée.
    const erreurVolume = verifierVolumeReponses(responses);
    if (erreurVolume) {
      throw new HttpError(400, erreurVolume);
    }
    entrees = responses.map(normaliserEntree);
  } else if (score !== undefined && score !== null && critereId !== undefined) {
    entrees = [{ critereId: Number(critereId), score: Number(score) }];
  } else {
    throw new HttpError(400, "Données d'évaluation manquantes.");
  }

  // Bug corrigé : le formulaire client (CollectePage) utilise un critère de
  // secours codé en dur (id: 1, "Satisfaction globale") quand ni le service
  // ni l'agence n'ont de critères configurés. Si aucune ligne Critere #1
  // n'existe réellement en base pour cette entreprise, l'insertion Reponse
  // ci-dessous levait une violation de clé étrangère Prisma non interceptée
  // → 500 brut renvoyé au client ("Request failed with status code 500"),
  // sans message exploitable. On vérifie donc explicitement l'existence des
  // critères avant d'insérer quoi que ce soit.
  const critereIds = [...new Set(entrees.map((i) => i.critereId))];
  const criteresExistants = await context.entities.Critere.findMany({
    // SÉCURITÉ (Vague 1, P1) : périmètre tenant sur les critères. Sans ce
    // filtre, un appel forgé pouvait référencer un critère d'une AUTRE
    // entreprise — le seul garde restant étant l'appartenance à l'agence du
    // guichet, qui ne dit rien du propriétaire du critère.
    where: {
      id: { in: critereIds },
      OR: [
        { id_entreprise: null },                                    // socle plateforme
        { id_entreprise: guichet.agence.id_entreprise ?? -1 },       // propres à l'entreprise du guichet
      ],
    },
    select: {
      id: true, type_reponse: true, options_reponse: true, libelle_critere: true,
      scoring_mode: true, orientation: true, version: true,
      options: {
        select: {
          id: true, libelle: true, score: true, poids: true,
          est_scorable: true, actif: true, code_metier: true,
          score_provenance: true,
        },
      },
    },
  });
  const critereById = new Map(criteresExistants.map((c: any) => [c.id, c]));
  const idsExistants = new Set(criteresExistants.map((c: any) => c.id));
  const idsManquants = critereIds.filter((id) => !idsExistants.has(id));
  if (idsManquants.length > 0) {
    throw new HttpError(
      400,
      "Ce guichet n'a aucun critère de notation configuré. Demandez à votre administrateur de configurer les critères de l'agence avant de collecter des avis."
    );
  }

  // Une route publique ne doit jamais accepter des identifiants de critères
  // récupérés depuis une autre agence. Sans ce contrôle, un appel forgé
  // pouvait injecter une réponse liée à un critère hors du périmètre du
  // guichet et fausser les analyses.
  const criteresActifsAgence = await context.entities.AgenceCritere.findMany({
    where: {
      id_agence: guichet.id_agence,
      id_critere: { in: critereIds },
    },
    select: { id_critere: true },
  });
  if (criteresActifsAgence.length !== critereIds.length) {
    throw new HttpError(400, "Un ou plusieurs critères ne sont pas disponibles pour ce guichet.");
  }

  if (serviceId) {
    const serviceDuGuichet = await context.entities.Service.findFirst({
      where: {
        id: Number(serviceId),
        guichets: { some: { id: guichet.id } },
      },
      select: { id: true },
    });
    if (!serviceDuGuichet) {
      throw new HttpError(400, "L’opération sélectionnée n’est pas disponible pour ce guichet.");
    }

    // FIX 05/09 (audit) : chaque critère soumis doit être rattaché à
    // l'opération choisie. Sinon un appel forgé fausse les stats par service
    // en injectant des réponses de critères d'une autre opération.
    // CORRECTIF : les critères « par défaut » (actifs pour l'agence mais
    // rattachés à AUCUNE opération — le vivier « Non assignées ») restent
    // valables pour toutes les opérations : c'est exactement ce que le
    // formulaire affiche quand l'opération choisie n'a pas de questions
    // propres (repli sur agencyCriteres côté CollectePage). Sans cette
    // tolérance, tout avis avec opération + critères par défaut échouait.
    const rattachements = await context.entities.CritereService.findMany({
      where: {
        id_service: serviceDuGuichet.id,
        id_critere: { in: critereIds },
      },
      select: { id_critere: true },
    });
    const rattaches = new Set(rattachements.map((r: any) => r.id_critere));
    const orphelins = critereIds.filter((id) => !rattaches.has(id));
    if (orphelins.length > 0) {
      // Un critère non rattaché à l'opération choisie n'est accepté que s'il
      // n'est rattaché à AUCUNE opération DU GUICHET (critère par défaut —
      // périmètre guichet, le même que le formulaire qui n'affiche que les
      // questions de l'opération + ce vivier). Rattaché à une AUTRE
      // opération du même guichet → rejet (appel forgé ou formulaire
      // désynchronisé). Un rattachement sur un AUTRE guichet ne disqualifie
      // pas : l'organisation en opérations est propre à chaque guichet.
      const autresRattachements = await context.entities.CritereService.findMany({
        where: {
          id_critere: { in: orphelins },
          service: { guichets: { some: { id: guichet.id } } },
        },
        select: { id_critere: true },
      });
      if (autresRattachements.length > 0) {
        throw new HttpError(400, "Un ou plusieurs critères ne font pas partie de l’opération sélectionnée.");
      }
    }
  }

  // ==========================================================================
  // RÉSOLUTION DÉTERMINISTE — vague 1 (remplace validation + `index + 1`).
  //
  // Le SERVEUR est l'autorité : chaque réponse est résolue via le moteur
  // (src/shared/scoringEngine.ts) à partir d'IDENTIFIANTS stables
  // (optionId / optionIds[]) ou de valeurs validées (ECHELLE/NPS/OUI_NON).
  // La position visuelle d'une option n'a AUCUNE valeur métier — aucun
  // `index + 1` ne subsiste dans ce chemin.
  //
  // Compat transition (client pré-Phase E) : QCM/CASES envoyés en texte
  // (libellé) sont appariés par libellé NORMALISÉ aux options actives —
  // jamais par position — et stampés MIGRATED. TEXTE ne produit plus
  // jamais de note (fini le 3 fantôme) : score_brut/officiel = NULL.
  // ==========================================================================
  // Délégation (vague 1, Phase D) : la résolution vit dans le module pur
  // src/server/resolutionSoumission.ts (testable DB-free). Ici : boucle.
  const itemsToInsert: ItemResolu[] = [];
  for (const entree of entrees) {
    const critere: any = critereById.get(entree.critereId);
    if (!critere) continue; // garde-fous d'existence déjà appliqués plus haut
    itemsToInsert.push(resoudreEntree(critere, entree));
  }

  // Le téléphone n'est réservé qu'après la validation complète du formulaire.
  // Une erreur de configuration ne bloque donc plus le client pendant 24 h.
  //
  // PERFORMANCE QR : le deleteMany de purge (avis > 24 h) a été retiré du
  // chemin critique — il scannait VoteAntiRejeu à CHAQUE soumission alors
  // qu'une purge quotidienne suffit. Cette purge est déjà couverte par le
  // job cron (relanceTache / archivage) : en dernier recours la contrainte
  // upsert fait pointer date_vote sur maintenant, donc rien ne s'accumule
  // de façon unbounded pour un téléphone actif.
  // C2 : scope tenant + fenêtre jour — utilise id_entreprise + hachage_tel + date_vote
  if (hachageTelephone && telephoneE164) {
    const guichetPourEntreprise = await context.entities.Guichet.findUnique({
      where: { id: Number(idGuichetEffectif) },
      select: { agence: { select: { id_entreprise: true } } },
    });
    if (guichetPourEntreprise) {
      await context.entities.VoteAntiRejeu.upsert({
        where: {
          id_entreprise_hachage_tel_date_vote: {
            id_entreprise: guichetPourEntreprise.agence.id_entreprise,
            hachage_tel: hachageTelephone,
            date_vote: new Date(),
          },
        },
        update: { date_vote: new Date() },
        create: {
          id_entreprise: guichetPourEntreprise.agence.id_entreprise,
          hachage_tel: hachageTelephone,
          date_vote: new Date(),
        },
      });
    }
  }

  // Vague 1 : le pire score vient des résolutions moteur (score_normalise
  // /100), pas d'un recalcul local — source unique de vérité, aucun
  // `normaliserScoreSur5` dupliqué ici (supprimé).
  const insererOptionsChoisies = async (
    db: any,
    reponses: Array<{ id: any; id_critere: number }>,
  ) => {
    // Jonction ReponseOption : les stats travaillent sur ces ids, jamais
    // sur le texte joint. Requêtes par soumission (déjà lue) : pas de N+1.
    const lignes: Array<{ id_reponse: any; id_option: string }> = [];
    const parCritere = new Map<number, any>();
    for (const r of reponses) parCritere.set(Number((r as any).id_critere), r);
    for (const item of itemsToInsert) {
      const ligne = parCritere.get(item.critereId);
      if (!ligne) continue;
      for (const id_option of item.optionsRetnues) {
        lignes.push({ id_reponse: (ligne as any).id, id_option });
      }
    }
    if (lignes.length > 0) {
      await db.reponseOption.createMany({ data: lignes, skipDuplicates: true });
    }
  };

  // PERFORMANCE QR (Doc 11 §10, priorité 1) : createMany remplace la boucle
  // d'INSERT individuels. 5 critères = 1 requête SQL multi-VALUES au lieu de
  // 5 allers-retours — la différence est décisive quand plusieurs clients
  // soumettent simultanément. Le reroll canal (FK manquante sur base non
  // seedée) est appliqué au lot entier si nécessaire.
  const construireLigne = (item: ItemResolu) => {
    // Affichage : libellé résolu (QCM/CASES nouveau flux, qui n'envoie plus
    // de texte) > verbatim > commentaire final. Les écrans existants
    // (LigneReponse, exports) lisent commentaire_texte : aucun changement
    // client requis pour afficher la bonne option (jamais positionnelle).
    const texteLigne =
      item.texte && item.texte.length > 0 ? item.texte : item.libelleOption || '';
    return {
      // score_brut (legacy) = score officiel pour les nouvelles lignes
      // (NULL si non notable — fini les 3 fantômes). L'historique garde
      // ses valeurs + LEGACY_POSITIONAL, jamais réécrit.
      score_brut: item.score_officiel,
      score_officiel: item.score_officiel,
      score_normalise: item.score_normalise,
      score_source: item.score_source,
      critere_version: item.critere_version,
      // C3 : sanitisation centrale (XSS/CSV/IA/SMS)
      commentaire_texte: texteLigne.length > 0
        ? sanitiserCommentaire(texteLigne)
        : sanitiserCommentaire(commentaire || ''),
      id_soumission: submissionId,
      id_critere: item.critereId,
      id_canal: idCanalResolved,
      id_agence: guichet.id_agence,
      id_guichet: guichet.id,
      id_service: serviceId ? Number(serviceId) : null,
      id_agent: affectation?.id_agent || null,
    };
  };

  const lignes = itemsToInsert.map(construireLigne);

  let createdReponses: Array<{ id: number; [key: string]: any }>;
  // FIX 05/09 (audit) : check + insertion atomiques. Sans transaction, deux
  // requêtes concurrentes avec le même id_soumission passent toutes les deux
  // le contrôle d'existence (plus haut) puis insèrent en double. Ici le
  // verrou consultatif sérialise les jumelles DANS la transaction : la
  // seconde voit les lignes de la première et renvoie l'existant.
  const insererLignes = async (tx: any) => {
    try {
      await tx.reponse.createMany({ data: lignes });
    } catch (e: any) {
      // Reroll ciblé : violation FK id_canal uniquement (canal absent d'une
      // base non seedée). P2003 = Foreign key constraint violated (Prisma).
      const isFkCanal = e?.code === 'P2003' && String(e?.meta?.field_name ?? '').includes('id_canal');
      if (!isFkCanal) throw e;
      await assurerCanalExiste();
      await tx.reponse.createMany({ data: lignes });
    }
  };
  try {
    createdReponses = await prisma.$transaction(async (tx: any) => {
      if (idempotenceDemandee) {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${submissionId}, 0))`;
        } catch {
          // Base non-Postgres en dev local : on continue sans verrou.
        }
        const deja = await tx.reponse.findFirst({
          where: { id_soumission: submissionId },
          orderBy: { date_reponse: 'asc' },
        });
        if (deja) return [deja];
      }
      await insererLignes(tx);
      // createMany ne renvoie pas les lignes : une seule lecture pour
      // récupérer les IDs générés (nécessaire pour l'analyse IA et l'alerte
      // critique).
      const creees = await tx.reponse.findMany({
        where: { id_soumission: submissionId },
        orderBy: { id: 'asc' },
      });
      createdReponses = creees;
      // Jonction options (DANS la transaction : tout ou rien).
      await insererOptionsChoisies(tx, creees as any);
      return creees;
    });
  } catch (e: any) {
    // Reroll ciblé : violation FK id_canal uniquement (canal absent d'une
    // base non seedée). P2003 = Foreign key constraint violated (Prisma).
    const isFkCanal = e?.code === 'P2003' && String(e?.meta?.field_name ?? '').includes('id_canal');
    if (!isFkCanal) throw e;
    await assurerCanalExiste();
    await context.entities.Reponse.createMany({ data: lignes });
    createdReponses = await context.entities.Reponse.findMany({
      where: { id_soumission: submissionId },
      orderBy: { id: 'asc' },
    });
    await insererOptionsChoisies(context.entities, createdReponses as any);
  }

  // Vague 1 : le pire score est le MIN des score_normalise (/100) résolus —
  // aucune re-normalisation locale. Seuil critique 40/100 (≡ 2/5).
  let pireNormalise: number | null = null;
  for (const item of itemsToInsert) {
    const n = item.score_normalise;
    if (n !== null && Number.isFinite(n) && (pireNormalise === null || n < pireNormalise)) {
      pireNormalise = n;
    }
  }
  // Équivalent /5 pour l'affichage alerte et la calibration IA (cohérence
  // note/texte, historiquement sur 1-5) : jamais une donnée stockée.
  const pireSur5 = pireNormalise === null ? null : Math.max(1, Math.min(5, Math.round(pireNormalise / 20)));

  // --- ANALYSE IA ASYNCHRONE — TOUT L'AVIS, UNE SEULE FOIS ---
  // Avant : seul le commentaire final alimentait l'IA. Les réponses aux
  // questions TEXTE (souvent le vrai contenu : « Riz sauce graine… »), les
  // Oui/Non et les choix QCM n'étaient jamais analysés — et quand le
  // commentaire final était vide, l'avis n'était pas analysé du tout.
  // Maintenant le texte envoyé combine le commentaire final ET chaque
  // réponse parlante, avec le libellé de sa question (et la note chiffrée
  // quand elle existe) : l'IA voit tout l'avis et l'étiquetage (thèmes)
  // devient précis. Une seule analyse par soumission, comme avant.
  const morceauxIA: string[] = [];
  const reponsesVues = new Set<string>();
  const commentaireFinal = (commentaire || '').trim();
  const pousserMorceau = (question: string, reponse: string) => {
    const r = reponse.trim();
    if (!r || reponsesVues.has(r)) return;
    reponsesVues.add(r);
    morceauxIA.push(`Q : ${question}\nR : ${r}`);
  };
  for (const item of itemsToInsert) {
    const critere: any = critereById.get(item.critereId);
    const libelle = critere?.libelle_critere || 'Question';
    const type = critere?.type_reponse;
    const texte = (item.texte || '').trim();
    if (type === 'TEXTE' || type === 'CASES') {
      if (texte) pousserMorceau(libelle, texte);
    } else if (type === 'QCM') {
      // Vague 1 : libellé résolu par id (jamais options[score-1]).
      pousserMorceau(libelle, item.libelleOption || texte || 'Option');
    } else if (type === 'OUI_NON') {
      pousserMorceau(libelle, (item.score_officiel ?? 1) >= 4 ? 'Oui' : 'Non');
    } else {
      // SMILEY / ECHELLE / NPS : réponse chiffrée — note /5 dérivée du
      // normalisé pour calibrer sentiment et urgence, sans inventer de texte.
      const n5 =
        item.score_normalise !== null
          ? Math.max(1, Math.min(5, Math.round(item.score_normalise / 20)))
          : null;
      morceauxIA.push(`Q : ${libelle}\nNote : ${n5 !== null ? `${n5}/5` : '—'}`);
    }
  }
  if (commentaireFinal.length > 0) morceauxIA.push(`Commentaire final : ${commentaireFinal}`);
  const texteCompletAvis = morceauxIA.join('\n\n').slice(0, 4000);
  if (texteCompletAvis.length > 0 && createdReponses.length > 0) {
    try {
      if (context.entities.AnalyseAvisIA) {
        // La note transmise est la PLUS BASSE (pireNormalise/20) : c'est
        // elle qui calibre l'urgence — une seule question à 1/5 suffit.
        await context.entities.AnalyseAvisIA.create({
          data: {
            reponseId: createdReponses[0].id,
            commentaireTexte: texteCompletAvis,
            noteBrut: pireSur5,
            status: 'PENDING',
          },
        });
      }
    } catch (aiErr) {
      console.warn('[SOUMETTRE_AVIS_IA] Avertissement non-bloquant:', aiErr);
    }
  }

  // --- ALERTE + NOTIFICATIONS si note critique (seuil 40/100 ≡ 2/5) ---
  if (pireNormalise !== null && pireNormalise <= 40 && pireSur5 !== null) {
    // Bug corrigé : `findFirst` avec `role: { in: [...] }` sans `orderBy`
    // renvoyait un destinataire dans un ordre non garanti par la base — si
    // renvoyait un destinataire dans un ordre non garanti par la base.
    // On priorise explicitement le chef d'agence (le mieux placé pour
    // réagir immédiatement sur place), avec repli sur DIRECTION —
    // même logique que l'escalade de silence dans alerteSilence.ts.
    const chefAgence = await context.entities.User.findFirst({
      where: { id_agence: guichet.id_agence, role: 'CHEF_AGENCE', actif: true },
    });
    // DIRECTION est un rôle à portée ENTREPRISE (toutes les agences du
    // tenant), jamais une seule agence — voir rowLevelSecurity.ts. On le
    // cherche donc par id_entreprise, pas par l'id_agence du guichet.
    const utilisateursEntreprise = chefAgence
      ? []
      : await context.entities.User.findMany({
          where: {
            id_entreprise: guichet.agence.id_entreprise,
            role: { in: ['DIRECTION'] },
            actif: true,
          },
        });
    const destinataire =
      chefAgence ||
      utilisateursEntreprise.find((u: any) => u.role === 'DIRECTION') ||
      null;

    if (destinataire) {
      await context.entities.Alerte.create({
        data: {
          message: `Note de ${pireSur5}/5 reçue au guichet "${guichet.nom_guichet}". Commentaire: "${commentaire || 'Aucun'}"`,
          type_alerte: "NOTE_CRITIQUE",
          statut_alerte: "NOUVELLE",
          id_reponse: createdReponses[0].id,
          id_destinataire: destinataire.id,
          id_guichet_concerne: guichet.id,
        }
      });

      // PERFORMANCE QR (fix « attente après clic Envoyer ») : les notifications
      // Twilio (WhatsApp puis SMS en repli) sont des appels API EXTERNES qui
      // bloquaient la réponse HTTP — le client attendait 1 à 5 s de plus après
      // son clic. Elles partent désormais en arrière-plan (fire-and-forget) :
      // l'avis est enregistré, l'alerte est en base, le client reçoit SUCCESS
      // immédiatement. Un échec Twilio est loggué, jamais remonté au client.
      if (destinataire.telephone) {
        const extraitCommentaire = commentaire?.trim()
          ? ` « ${commentaire.trim().slice(0, 60)}${commentaire.trim().length > 60 ? '…' : ''} »`
          : '';
        const msgAlerte = `⚠️ Yeba ALERTE — Note critique ${pireSur5}/5 au guichet "${guichet.nom_guichet}".${extraitCommentaire} Traitez : ${FRONTEND_URL}/alertes-taches`;
        // La capture de variables synchrones avant le détachement évite tout
        // souci de closure après la fin de la requête.
        const tel = destinataire.telephone;
        void envoyerAlerteWhatsApp(tel, msgAlerte).catch((e) => {
          console.warn('[NOTIFICATION] WhatsApp échoué (arrière-plan):', e?.message);
        });
      }
    }
  }

  return createdReponses[0];
};

/**
 * La collecte est une route publique : aucune exception technique ne doit y
 * parvenir telle quelle. Les erreurs métier gardent leur code (400, 404,
 * 429) ; les erreurs imprévues restent tracées dans Railway avec leur cause,
 * mais le client reçoit une réponse exploitable et sans URL interne.
 */
export const soumettreAvis = async (args: any, context: any) => {
  try {
    return await soumettreAvisImpl(args, context);
  } catch (error: any) {
    if (error instanceof HttpError) throw error;

    // Vague 5, P11 : une erreur de saisie se distingue d'une panne. Un
    // commentaire trop long levait un `Error` ordinaire, remontait ici et
    // devenait un 500 « réessayez plus tard » : le client ne savait pas
    // quoi corriger, et le front ne pouvait pas distinguer une coupure
    // réseau d'un refus définitif.
    const erreurSaisie = versHttpSiEntreeInvalide(error);
    if (erreurSaisie) throw erreurSaisie;

    console.error('[SOUMETTRE_AVIS] Échec inattendu', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      // Jamais la valeur du code_public en clair dans les logs.
      codeGuichet: args?.code_public ? 'fourni' : 'absent',
    });
    throw new HttpError(
      500,
      "Nous ne pouvons pas enregistrer votre avis pour le moment. Veuillez réessayer dans quelques instants."
    );
  }
};

// ============================================================================
// COMPLÉTER UNE SOUMISSION (T2 — vague 1, sans bouton « Envoyer »)
// ============================================================================
// Le parcours sans-bouton enregistre les NOTES en T1 (soumettreAvis, déjà
// fait). Le commentaire facultatif arrive ENSUITE, sur la MÊME soumission :
//   notes (T1, id_soumission stable) → commentaire éventuel (T2, ici).
// Avantage : si le client quitte après ses notes, elles sont déjà sauvées.
//
// Garde-fous (décisions validées) :
// - fenêtre de 30 MIN après la première réponse (UUID non devinable +
//   rate-limit implicite : un id_soumission ne se devine pas) ;
// - le commentaire met à jour la PREMIÈRE ligne (celle qui porte l'analyse
//   IA) ; l'analyse repasse PENDING (requeue, sans reset attempts) si elle
//   n'a pas définitivement échoué ;
// - téléphone optionnel : enregistré dans l'anti-rejeu (même règle qu'en
//   T1), jamais en clair.
// PUBLIQUE (même régime que soumettreAvis : route /q/* sans session).
// ============================================================================

const FENETRE_COMPLETION_MS = 30 * 60 * 1000;

export const completerSoumission = async (
  args: { id_soumission?: string; commentaire?: string; telephone?: string },
  context: any,
) => {
  const idSoumission = typeof args?.id_soumission === 'string' ? args.id_soumission.trim() : '';
  if (!idSoumission || idSoumission.length > 100) {
    throw new HttpError(400, 'Soumission introuvable.');
  }
  const commentaireBrut = typeof args?.commentaire === 'string' ? args.commentaire.trim() : '';
  const telephoneBrut = typeof args?.telephone === 'string' ? args.telephone.trim() : '';
  if (!commentaireBrut && !telephoneBrut) {
    throw new HttpError(400, 'Rien à enregistrer.');
  }
  if (commentaireBrut.length > 1000) {
    throw new HttpError(400, 'Le commentaire est trop long (1000 caractères maximum).');
  }

  /* Vague 5, P11 — anti-amplification sur T2.
     La fenêtre de 30 min et l'`id_soumission` non devinable protègent
     contre l'énumération, mais pas contre la répétition : un appelant
     détenant UN seul identifiant valide pouvait boucler l'action et
     réécrire le commentaire, le vote anti-rejeu et la file IA en
     boucle. Deux garde-fous :
       - par (IP, soumission) : serré, car un client lisible appelle
         T2 quelques fois au plus (saisie + reprise) ;
       - par IP : large, car un guichet partage souvent une connexion
         entre plusieurs clients. */
  const ipT2 = extraireIp(context);
  const rlT2a = await checkRateLimit(`t2:${ipT2}:${idSoumission}`, {
    capacity: 6,
    refillPerMinute: 2,
  });
  if (!rlT2a.allowed) {
    await journaliser({
      context,
      action: 'rateLimit.exceeded',
      resource: 'completerSoumission',
      details: { cle: `ip:soumission:${ipT2}`, retryAfter: rlT2a.retryAfterSeconds },
    });
    throw new HttpError(429, 'Trop d’enregistrements. Réessayez dans un instant.', {
      headers: { 'Retry-After': String(rlT2a.retryAfterSeconds) },
    });
  }
  const rlT2b = await checkRateLimit(`t2:${ipT2}`, { capacity: 40, refillPerMinute: 20 });
  if (!rlT2b.allowed) {
    await journaliser({
      context,
      action: 'rateLimit.exceeded',
      resource: 'completerSoumission',
      details: { cle: `ip:${ipT2}`, retryAfter: rlT2b.retryAfterSeconds },
    });
    throw new HttpError(429, 'Trop d’enregistrements depuis cette connexion. Réessayez dans un instant.', {
      headers: { 'Retry-After': String(rlT2b.retryAfterSeconds) },
    });
  }

  const lignes = await context.entities.Reponse.findMany({
    where: { id_soumission: idSoumission },
    orderBy: { id: 'asc' },
    select: {
      id: true, date_reponse: true, id_guichet: true,
      guichet: { select: { id_agence: true, agence: { select: { id_entreprise: true } } } },
    },
  });
  if (lignes.length === 0) {
    // Anti-énumération : même réponse que « fenêtre dépassée ».
    throw new HttpError(410, 'Cette soumission est clôturée.');
  }
  const premiere = lignes[0] as any;
  if (Date.now() - new Date(premiere.date_reponse).getTime() > FENETRE_COMPLETION_MS) {
    throw new HttpError(410, 'Cette soumission est clôturée.');
  }

  if (telephoneBrut) {
    let telephoneE164: string;
    try {
      telephoneE164 = normaliserTelephoneE164(telephoneBrut);
    } catch {
      throw new HttpError(400, 'Numéro de téléphone invalide.');
    }
    const hachage = hmacSHA256(getAntiReplaySalt(), telephoneE164);
    // ENREGISTREMENT, PAS REJET — c'est le seul endroit du parcours public
    // où le téléphone est traité. L'`upsert` ci-dessous ne peut pas
    // matcher : sa clause `where` porte `new Date()` au milliseconde, alors
    // que la clé unique est (entreprise, hachage, date_vote) et que le
    // `create` qui suit utilise un autre `new Date()`. Chaque appel insère
    // donc une ligne au lieu de mettre à jour. Effet voulu ici : le vote
    // reste enregistré, le volume est borné par la purge de 24 h
    // (`archivageAutomatique`). Ce qui manque, c'est le REJET d'un second
    // avis le même jour : écarté par décision le 2026-09-26, voir
    // docs/audit/ETAT_REEL_PROJET.md §3, P8.
    await context.entities.VoteAntiRejeu.upsert({
      where: {
        id_entreprise_hachage_tel_date_vote: {
          id_entreprise: premiere.guichet.agence.id_entreprise,
          hachage_tel: hachage,
          date_vote: new Date(),
        },
      },
      update: { date_vote: new Date() },
      create: {
        id_entreprise: premiere.guichet.agence.id_entreprise,
        hachage_tel: hachage,
        date_vote: new Date(),
      },
    });
  }

  if (commentaireBrut) {
    await context.entities.Reponse.update({
      where: { id: premiere.id },
      data: { commentaire_texte: sanitiserCommentaire(commentaireBrut) },
    });
    // Requeue l'analyse IA sur le texte enrichi (sans reset attempts :
    // un avis en échec définitif 3x ne boucle pas à l'infini).
    try {
      const analyse = await context.entities.AnalyseAvisIA.findUnique({
        where: { reponseId: premiere.id },
        select: { reponseId: true, status: true, attempts: true, commentaireTexte: true },
      });
      if (analyse && analyse.status !== 'FAILED') {
        const enrichi = [analyse.commentaireTexte, commentaireBrut]
          .filter(Boolean)
          .join('\n\nCommentaire final : ')
          .slice(0, 4000);
        await context.entities.AnalyseAvisIA.update({
          where: { reponseId: premiere.id },
          data: { commentaireTexte: enrichi, status: 'PENDING', processedAt: null },
        });
      }
    } catch (e: any) {
      console.warn('[COMPLETER_SOUMISSION_IA] Requeue non-bloquante:', e?.message);
    }
  }

  return { ok: true as const };
};

/**
 * Wrapper public de `completerSoumission` (Vague 5, P11).
 *
 * L'action n'avait AUCUN filet : une erreur de saisie — un commentaire
 * au-delà de 1000 caractères, say — remontait jusqu'au framework et
 * devenait un 500 sans message. Or T2 est précisément l'étape où le
 * client tape librement : c'est le chemin le plus susceptible de
 * déclencher une refus de saisie, et donc le moins outillé pour l'expliquer.
 *
 * Le comportement métier est inchangé ; seul le contrat d'erreur est
 * explicite. `id_soumission` reste non devinable (UUID v4) et la fenêtre
 * de 30 minutes borne toujours le risque.
 */
export const completerSoumissionPublic = async (args: any, context: any) => {
  try {
    return await completerSoumission(args, context);
  } catch (error: any) {
    if (error instanceof HttpError) throw error;
    const erreurSaisie = versHttpSiEntreeInvalide(error);
    if (erreurSaisie) throw erreurSaisie;
    console.error('[COMPLETER_SOUMISSION] Échec inattendu', {
      message: error?.message,
      code: error?.code,
    });
    throw new HttpError(
      500,
      "Nous ne pouvons pas enregistrer votre commentaire pour le moment. Veuillez réessayer.",
    );
  }
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
  args: { id: string; nom?: string; prenom?: string; email?: string; telephone?: string; id_agence?: number },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }

  // FIX isolation (audit 09/2026) : sans ces contrôles, n'importe quel compte
  // de gestion pouvait modifier un utilisateur HORS tenant (autre entreprise)
  // dès que celui-ci n'avait pas d'agence (ex. un DIRECTION : l'assert
  // d'agence ci-dessous était sauté), voire détourner son compte en changeant
  // son e-mail — ce qui migre aussi son identité de connexion. Règles :
  // - même entreprise des deux côtés (cible sans entreprise = interdit) ;
  // - un non-DIRECTION ne touche jamais un compte DIRECTION ;
  // - jamais de compte plateforme (SUPER_ADMIN/SUPPORT) par cette action
  //   (console Yeba Platform uniquement).
  if (!existing.id_entreprise || existing.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Ce compte appartient à une autre entreprise.");
  }
  const ciblePlateforme = (existing as any).platformRole === 'SUPER_ADMIN' || (existing as any).platformRole === 'SUPPORT';
  if (ciblePlateforme) {
    throw new HttpError(403, 'Les comptes plateforme se gèrent depuis la console Yeba Platform.');
  }
  if (existing.role === 'DIRECTION' && context.user.role !== 'DIRECTION') {
    throw new HttpError(403, 'Seule la Direction peut modifier un compte de direction.');
  }
  if (existing.id_agence) {
    await assertAgenceAccess(context, context.entities, existing.id_agence, 'agent');
  }

  // Si l'appelant tente de déplacer l'agent vers une autre agence, cette
  // agence cible doit elle aussi être dans son périmètre.
  if (args.id_agence) {
    await assertAgenceAccess(context, context.entities, args.id_agence, 'agence de destination');
  }

  // FIX 05/09 (audit) : l'email est AUSSI l'identifiant de connexion Wasp
  // (AuthIdentity.providerUserId). Mettre à jour User.email seul laissait
  // l'ancien email comme login, avec le nouveau affiché dans l'interface.
  // On migre donc l'identité auth dans la même transaction : création de la
  // nouvelle identité (même compte Auth, même mot de passe haché) puis
  // suppression de l'ancienne. Sans email en base, rien à migrer.
  const nouvelEmail = args.email !== undefined
    ? (args.email.trim() ? args.email.trim().toLowerCase() : null)
    : undefined;
  const emailChange = nouvelEmail !== undefined && nouvelEmail !== (existing.email?.toLowerCase() ?? null);
  if (emailChange && existing.email && nouvelEmail) {
    const conflit = await prisma.user.findUnique({ where: { email: nouvelEmail } });
    if (conflit && conflit.id !== existing.id) {
      throw new HttpError(409, 'Un autre compte utilise déjà cette adresse email.');
    }
    const ancienneIdentite = await prisma.authIdentity.findUnique({
      where: { providerName_providerUserId: { providerName: 'email', providerUserId: existing.email } },
    });
    await prisma.$transaction(async (tx: any) => {
      if (ancienneIdentite) {
        await tx.authIdentity.create({
          data: {
            providerName: 'email',
            providerUserId: nouvelEmail,
            providerData: ancienneIdentite.providerData,
            authId: ancienneIdentite.authId,
          },
        });
        await tx.authIdentity.delete({
          where: { providerName_providerUserId: { providerName: 'email', providerUserId: existing.email } },
        });
      }
      await tx.user.update({
        where: { id: args.id },
        data: { email: nouvelEmail },
      });
    });
  }

  return context.entities.User.update({
    where: { id: args.id },
    data: {
      ...(args.nom ? { nom: args.nom } : {}),
      ...(args.prenom ? { prenom: args.prenom } : {}),
      ...(!emailChange && args.email !== undefined ? { email: args.email.trim() ? args.email.trim() : null } : {}),
      ...(args.telephone !== undefined ? { telephone: args.telephone.trim() ? args.telephone.trim() : null } : {}),
      ...(args.id_agence ? { id_agence: args.id_agence } : {}),
    },
  });
};

export const deleteAgent = async (args: { id: string }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  // FIX isolation (audit 09/2026, même faille que updateAgent) : périmètre
  // entreprise explicite + comptes DIRECTION/plateforme intouchables pour
  // un non-DIRECTION.
  if (!existing.id_entreprise || existing.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Ce compte appartient à une autre entreprise.");
  }
  const ciblePlateforme = (existing as any).platformRole === 'SUPER_ADMIN' || (existing as any).platformRole === 'SUPPORT';
  if (ciblePlateforme) {
    throw new HttpError(403, 'Les comptes plateforme se gèrent depuis la console Yeba Platform.');
  }
  if (existing.role === 'DIRECTION' && context.user.role !== 'DIRECTION') {
    throw new HttpError(403, 'Seule la Direction peut suspendre un compte de direction.');
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

export const reactivateAgent = async (args: { id: string }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const existing = await context.entities.User.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, 'Agent introuvable.');
  }
  // FIX isolation (audit 09/2026, idem deleteAgent) : périmètre entreprise
  // explicite + comptes DIRECTION/plateforme intouchables pour un non-DIRECTION.
  if (!existing.id_entreprise || existing.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Ce compte appartient à une autre entreprise.");
  }
  const ciblePlateformeReact = (existing as any).platformRole === 'SUPER_ADMIN' || (existing as any).platformRole === 'SUPPORT';
  if (ciblePlateformeReact) {
    throw new HttpError(403, 'Les comptes plateforme se gèrent depuis la console Yeba Platform.');
  }
  if (existing.role === 'DIRECTION' && context.user.role !== 'DIRECTION') {
    throw new HttpError(403, 'Seule la Direction peut réactiver un compte de direction.');
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
  await assertEntrepriseActive(context, context.entities);
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
// PERSONNALISATION (BRANDING) — FIX 05/09 : la table existait mais aucune
// écriture ni interface. La Direction personnalise ici l'expérience client :
// formulaires de collecte, kits QR et slogan. Règles : DIRECTION uniquement,
// textes bornés, masquage du branding Yeba réservé au plan ENTERPRISE.
// ============================================================================
const CHAMPS_BRANDING_TEXTE: Record<string, number> = {
  logo_url: 500,
  logo_light_url: 500,
  favicon_url: 500,
  nom_affiche: 80,
  form_title: 120,
  form_subtitle: 200,
  form_thank_you: 120,
  qr_slogan: 80,
  qr_color: 20,
  qr_bg_color: 20,
};
const QR_STYLES = ['CLASSIQUE', 'MODERNE', 'PREMIUM'];
const QR_FRAMES = ['AUCUN', 'SIMPLE', 'PREMIUM'];
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const updateBranding = async (args: Record<string, any>, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);

  const idEntreprise = context.user.id_entreprise;
  if (!idEntreprise) throw new HttpError(400, "Votre compte n'est rattaché à aucune entreprise.");

  const data: Record<string, any> = {};
  for (const [champ, max] of Object.entries(CHAMPS_BRANDING_TEXTE)) {
    if (args[champ] === undefined) continue;
    const v = String(args[champ] ?? '').trim();
    if (v.length > max) {
      throw new HttpError(400, `Le champ ${champ} dépasse ${max} caractères.`);
    }
    data[champ] = v ? v : null;
  }
  for (const c of ['qr_color', 'qr_bg_color']) {
    if (data[c] && !HEX_RE.test(data[c])) {
      throw new HttpError(400, `Couleur QR invalide (${c}) : format #RRGGBB attendu.`);
    }
  }
  if (args.qr_style !== undefined) {
    const s = String(args.qr_style).toUpperCase();
    if (!QR_STYLES.includes(s)) throw new HttpError(400, 'Style QR invalide.');
    data.qr_style = s;
  }
  if (args.qr_frame !== undefined) {
    const f = String(args.qr_frame).toUpperCase();
    if (!QR_FRAMES.includes(f)) throw new HttpError(400, 'Cadre QR invalide.');
    data.qr_frame = f;
  }
  if (args.hide_yeba_branding !== undefined) {
    const veutMasquer = Boolean(args.hide_yeba_branding);
    if (veutMasquer) {
      const entreprise = await context.entities.Entreprise.findUnique({
        where: { id: idEntreprise },
        select: { plan: true },
      });
      if (entreprise?.plan !== 'ENTERPRISE') {
        throw new HttpError(403, 'Le masquage du branding Yeba est réservé au plan ENTERPRISE.');
      }
    }
    data.hide_yeba_branding = veutMasquer;
  }
  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'Aucune modification fournie.');
  }
  data.updated_by = context.user.id;

  const actuel = await context.entities.BrandingConfig.upsert({
    where: { id_entreprise: idEntreprise },
    update: data,
    create: { id_entreprise: idEntreprise, ...data },
  });

  await journaliser({
    context,
    action: 'branding.update',
    resource: 'BrandingConfig',
    resource_id: String(actuel.id),
    entreprise_id: idEntreprise,
    details: { champs: Object.keys(data) },
  });

  return actuel;
};

// ============================================================================
// GESTION DES AGENCES
// ============================================================================
// Le seed unique (src/server/scripts/dbSeeds.ts) crée l'Entreprise et
// sa première Agence au démarrage. createAgence (rôle DIRECTION, page
// Gestion des agences) permet d'ajouter d'autres agences au réseau : le
// multi-agences est pleinement supporté (sélecteurs d'agence, RLS par
// agence, consolidation côté Direction).

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
  await assertEntrepriseActive(context, context.entities);
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

  // QUOTA SAAS (Doc 11 §4) : la limite du plan est vérifiée ICI, côté
  // serveur — source unique de vérité. Désactiver le bouton front ne
  // protège rien : un appel API forgé doit être refusé.
  // FIX 05/09 : les agences archivées ne consomment plus de quota (cohérent
  // avec les guichets qui excluent déjà archive:true) — sinon une agence
  // fermée bloquait définitivement la création d'une nouvelle agence.
  const entreprise = await context.entities.Entreprise.findUnique({
    where: { id: context.user.id_entreprise },
    select: { limite_agences: true },
  });
  const nbAgencesActives = await context.entities.Agence.count({
    where: { id_entreprise: context.user.id_entreprise, archive: false },
  });
  if (entreprise && nbAgencesActives >= entreprise.limite_agences) {
    throw new HttpError(
      403,
      `Limite du plan atteinte (${entreprise.limite_agences} agences). Passez à un plan supérieur ou contactez Yeba.`
    );
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

/**
 * Archive une agence fermée définitivement. Cascade volontaire : ses
 * guichets sont archivés en même temps (une agence fermée n'a plus de
 * guichets ouverts), horodatés à l'identique pour qu'on sache qu'ils ont
 * été fermés "avec" l'agence plutôt qu'individuellement. Rien n'est
 * supprimé : avis, alertes et statistiques historiques restent intacts et
 * consultables.
 */
export const archiverAgence = async (args: { id_agence: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);
  await assertAgenceAccess(context, context.entities, args.id_agence, 'agence');

  const agence = await context.entities.Agence.findUnique({ where: { id: args.id_agence } });
  if (!agence) throw new HttpError(404, 'Agence introuvable.');
  if (agence.archive) return agence;

  // F5 : une agence pilotée (chef ou direction cumulée) ne s'archive pas sans
  // retirer le pilotage d'abord — sinon le pilote pointe vers une agence fermée.
  const pilote = await context.entities.User.findFirst({
    where: { id_agence: args.id_agence, role: { in: ['CHEF_AGENCE', 'DIRECTION'] }, actif: true },
  });
  if (pilote) {
    throw new HttpError(
      400,
      pilote.role === 'DIRECTION'
        ? "Cette agence est pilotée par la direction (cumul). Retirez le cumul avant de l'archiver."
        : "Cette agence a encore un chef actif. Suspendez-le ou réaffectez-le avant de l'archiver."
    );
  }

  const maintenant = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.guichet.updateMany({
      where: { id_agence: args.id_agence, archive: false },
      data: { archive: true, date_archivage: maintenant },
    });
    return tx.agence.update({
      where: { id: args.id_agence },
      data: { archive: true, date_archivage: maintenant },
    });
  });
};

/**
 * Désarchive une agence. Choix délibéré : ne restaure PAS automatiquement
 * ses guichets — une réouverture d'agence ne rouvre pas forcément tous les
 * anciens guichets tels quels (locaux réaménagés, etc.). Chaque guichet se
 * désarchive donc individuellement depuis la page Guichets.
 */
export const desarchiverAgence = async (args: { id_agence: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);
  await assertAgenceAccess(context, context.entities, args.id_agence, 'agence');

  const agence = await context.entities.Agence.findUnique({ where: { id: args.id_agence } });
  if (!agence) throw new HttpError(404, 'Agence introuvable.');

  return context.entities.Agence.update({
    where: { id: args.id_agence },
    data: { archive: false, date_archivage: null },
  });
};

// ============================================================================
// CUMUL DIRECTION + PILOTAGE AGENCE (petites structures)
// Seule une DIRECTION peut activer le cumul sur elle-même : pose son
// id_agence vers l'agence pilotée (union des accès, verbatim total).
// Garde F1 : refus si un CHEF_AGENCE actif occupe déjà l'agence.
// ============================================================================

export const definirAgencePilotee = async (args: { id_agence: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);
  await assertAgenceAccess(context, context.entities, args.id_agence, 'agence');

  const agence = await context.entities.Agence.findUnique({ where: { id: args.id_agence } });
  if (!agence || agence.archive) throw new HttpError(400, "Agence introuvable ou archivée.");
  if (agence.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Cette agence appartient à une autre entreprise.");
  }
  const chefExistant = await context.entities.User.findFirst({
    where: { id_agence: args.id_agence, role: 'CHEF_AGENCE', actif: true, id: { not: context.user.id } },
  });
  if (chefExistant) {
    throw new HttpError(400, "Cette agence a déjà un chef actif. Suspendez-le avant d'activer le cumul.");
  }
  const maj = await context.entities.User.update({
    where: { id: context.user.id },
    data: { id_agence: args.id_agence },
  });
  await journaliser({
    context,
    action: 'direction.cumul.on',
    resource: 'User',
    resource_id: context.user.id,
    entreprise_id: context.user.id_entreprise,
    details: { id_agence: args.id_agence },
  });
  return maj;
};

export const retirerAgencePilotee = async (_args: any, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION']);
  const maj = await context.entities.User.update({
    where: { id: context.user.id },
    data: { id_agence: null },
  });
  await journaliser({
    context,
    action: 'direction.cumul.off',
    resource: 'User',
    resource_id: context.user.id,
    entreprise_id: context.user.id_entreprise,
    details: {},
  });
  return maj;
};

export const inviteAgent = async (
  args: { email?: string; nom: string; prenom: string; id_agence: number; role: string; telephone?: string },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Règle métier (Doc 02 §matrice rôles — référence absolue) : la Direction
  // structure le réseau (chefs d'agence) ; le chef d'agence ne gère que SON
  // équipe de terrain (agents). (Le rôle auditeur QUALITE a été supprimé et
  // fusionné dans CHEF_AGENCE : il ne peut plus être attribué.)
  const ROLES_PAR_INVITEUR: Record<string, string[]> = {
    DIRECTION: ['CHEF_AGENCE', 'AGENT'],
    CHEF_AGENCE: ['AGENT'],
  };
  const rolesAutorises = ROLES_PAR_INVITEUR[context.user.role ?? ''] || [];
  if (!rolesAutorises.includes(args.role)) {
    throw new HttpError(
      403,
      context.user.role === 'DIRECTION'
        ? "En tant que direction, vous ne pouvez créer que des Chefs d'Agence et des Agents."
        : "En tant que Chef d'Agence, vous ne pouvez créer que des Agents de guichet."
    );
  }

  const targetAgenceId = await resolveAgenceId(context, context.entities, args.id_agence);

  const targetAgence = await context.entities.Agence.findUnique({ where: { id: targetAgenceId } });
  if (!targetAgence) throw new HttpError(404, 'Agence introuvable.');

  const normalizedEmail = args.email?.trim() ? args.email.trim() : null;

  // La protection du bouton côté interface évite le double-clic courant ; ce
  // contrôle côté serveur couvre aussi les appels répétés ou les réseaux lents.
  // Un compte avec e-mail est identifié de façon fiable par son e-mail. Pour
  // les agents de terrain sans e-mail, on refuse une fiche active strictement
  // identique dans la même agence (nom, prénom et téléphone normalisés).
  const doublon = normalizedEmail
    ? await context.entities.User.findUnique({ where: { email: normalizedEmail } })
    : await context.entities.User.findFirst({
        where: {
          id_agence: targetAgenceId,
          nom: args.nom.trim(),
          prenom: args.prenom.trim(),
          telephone: args.telephone?.trim() || null,
          actif: true,
        },
      });
  if (doublon) {
    throw new HttpError(409, normalizedEmail
      ? 'Un utilisateur utilise déjà cette adresse e-mail.'
      : 'Cet agent existe déjà dans cette agence.');
  }

  // Un seul pilote actif par agence (CHEF_AGENCE ou DIRECTION cumulée).
  // Sans ce contrôle élargi, une direction cumulée (role=DIRECTION) serait
  // invisible du test et un second chef pourrait être invité sur la même agence.
  if (args.role === 'CHEF_AGENCE') {
    if (!normalizedEmail) {
      throw new HttpError(400, "L'adresse e-mail est obligatoire pour un Chef d'Agence.");
    }
    const piloteExistant = await context.entities.User.findFirst({
      where: {
        id_agence: targetAgenceId,
        role: { in: ['CHEF_AGENCE', 'DIRECTION'] },
        actif: true,
      }
    });
    if (piloteExistant) {
      throw new HttpError(
        400,
        piloteExistant.role === 'DIRECTION'
          ? "Cette agence est déjà pilotée par la direction (cumul directeur-chef). Retirez le cumul avant de nommer un chef."
          : "Cette agence possède déjà un Chef d'agence actif."
      );
    }
  }

  // QUOTA SAAS : limite d'utilisateurs du plan, vérifiée côté serveur.
  // FIX 05/09 : seuls les comptes actifs consomment le quota — un agent
  // parti (actif:false) libère sa place, sinon chaque départ consommait
  // définitivement un siège du plan.
  const entrepriseQuota = await context.entities.Entreprise.findUnique({
    where: { id: targetAgence.id_entreprise },
    select: { limite_utilisateurs: true },
  });
  const nbUtilisateursActifs = await context.entities.User.count({
    where: { id_entreprise: targetAgence.id_entreprise, actif: true },
  });
  if (entrepriseQuota && nbUtilisateursActifs >= entrepriseQuota.limite_utilisateurs) {
    throw new HttpError(
      403,
      `Limite du plan atteinte (${entrepriseQuota.limite_utilisateurs} utilisateurs). Passez à un plan supérieur ou contactez Yeba.`
    );
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


  // ✉️ Email envoyé à la personne invitée (le Chef d'Agence a un
  // vrai compte de connexion). Les agents simples (AGENT) n'ont pas besoin
  // d'accès à l'application : ils sont référencés dans le planning et les
  // avis, mais ne se connectent pas.
  if (args.role === 'CHEF_AGENCE') {
    const frontendUrl = process.env.WASP_WEB_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    // FIX 05/09 : le bouton « Définir mon mot de passe » pointait vers
    // /request-password-reset (réinitialisation) alors que le compte vient
    // d'être créé avec un mot de passe aléatoire inconnu. Désormais on crée
    // une vraie Invitation (token à usage unique, 24 h — même modèle que
    // l'activation entreprise) et le bouton mène à /account/activate qui
    // DÉFINIT le mot de passe directement. Le reset reste possible ensuite
    // via « Mot de passe oublié » sur /login en cas de perte.
    const { lienActivation } = await import('./actionsPlatform');
    const tokenClair = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(tokenClair).digest('hex');
    await context.entities.Invitation.create({
      data: {
        id_user: newUser.id,
        id_emetteur: context.user.id,
        id_entreprise: targetAgence.id_entreprise,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const lienDef = lienActivation(tokenClair);

    // Récupérer le nom de l'agence pour personnaliser l'email
    const agence = await context.entities.Agence.findUnique({
      where: { id: targetAgenceId },
      select: { nom_agence: true, commune: true },
    });

    const nomAgence = agence ? `${agence.nom_agence} — ${agence.commune}` : 'votre agence';
    const roleLabel = args.role === 'CHEF_AGENCE' ? "Chef d'Agence" : 'Agent de guichet';
    const roleMission = args.role === 'CHEF_AGENCE'
      ? 'gérer les guichets, planifier les agents et suivre les alertes de satisfaction'
      : "auditer la qualité de service, consulter les avis clients et suivre les indicateurs de conformité";
    const stepTroisDesc = args.role === 'CHEF_AGENCE'
      ? 'Planning, avis clients, alertes critiques — tout est centralisé.'
      : 'Tableaux de bord qualité, avis clients et indicateurs — tout est centralisé.';

    await envoyerEmailBrevo({
      to: normalizedEmail!,
      subject: `🎉 Bienvenue sur Yeba — Accès ${roleLabel}`,
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
        Votre accès ${roleLabel} Yeba est prêt
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
        <a href="${lienDef}"
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
        Ce lien vous permettra de définir votre mot de passe en toute sécurité. Il expire dans 24 h — passé ce délai, demandez à votre direction de vous renvoyer une invitation.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        <strong>Yeba</strong> — Plateforme de satisfaction client · Norme FD X50-167 ·
        <a href="${frontendUrl}" style="color: #c47a20; text-decoration: none;">yeba.ci</a>
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
        `Vous avez été nommé(e) ${roleLabel} sur Yeba pour : ${nomAgence}.`,
        ``,
        `Email de connexion : ${args.email}`,
        ``,
        `Étapes :`,
        `1. Définissez votre mot de passe : ${lienDef} (lien valable 24 h)`,
        `2. Connectez-vous sur : ${frontendUrl}/login`,
        `3. Retrouvez votre espace Yeba depuis votre tableau de bord.`,
        ``,
        `Yeba — Plateforme de satisfaction client`,
      ].join('\n'),
    });

    console.log(`event=invite_email_sent role=CHEF_AGENCE agence=${targetAgenceId}`);
  } else {
    // AGENT simple → créé silencieusement, pas d'email
    // Il sera assigné aux guichets via le planning sans jamais se connecter.
    console.log(`event=agent_created_silent agence=${targetAgenceId}`);
  }

  return newUser;
};

// ─────────────────────────────────────────────
// renvoyerInvitationAgent — lien d'activation perdu/expiré (FIX 05/09)
// ─────────────────────────────────────────────
// Un chef ou un agent qui n'a jamais activé son compte (lien expiré après
// 24 h, email perdu) restait bloqué : réinviter échouait en 409 (email déjà
// pris) et aucun renvoi n'existait côté entreprise. Cette action révoque les
// anciennes invitations non utilisées puis en crée une neuve.
// Périmètre (mêmes règles que inviteAgent) :
// - DIRECTION → tout compte de son entreprise ;
// - CHEF_AGENCE → uniquement les AGENT de SA propre agence.
export const renvoyerInvitationAgent = async (
  args: { id_user: string },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const cible = await context.entities.User.findUnique({ where: { id: args.id_user } });
  if (!cible) throw new HttpError(404, 'Utilisateur introuvable.');
  if (cible.id_entreprise !== context.user.id_entreprise) {
    throw new HttpError(403, "Ce compte appartient à une autre entreprise.");
  }
  if (!cible.actif) {
    throw new HttpError(400, "Ce compte est désactivé. Réactivez-le d'abord.");
  }
  if (!cible.email) {
    throw new HttpError(400, "Ce compte n'a pas d'email : aucune invitation à renvoyer.");
  }
  if (context.user.role === 'CHEF_AGENCE') {
    if (cible.role !== 'AGENT' || cible.id_agence !== context.user.id_agence) {
      throw new HttpError(403, "Vous ne pouvez renvoyer une invitation qu'aux agents de votre propre agence.");
    }
  }

  const { lienActivation } = await import('./actionsPlatform');
  const tokenClair = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(tokenClair).digest('hex');
  const cleVerrou = `invitation-agent:${cible.email.trim().toLowerCase()}:${cible.id_entreprise}`;
  await prisma.$transaction(async (tx: any) => {
    try {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${cleVerrou}, 0))`;
    } catch {
      // Base non-Postgres en dev local : on continue sans verrou.
    }
    await tx.invitation.updateMany({
      where: { id_user: cible.id, used_at: null },
      data: { used_at: new Date() },
    });
    await tx.invitation.create({
      data: {
        id_user: cible.id,
        id_emetteur: context.user.id,
        id_entreprise: cible.id_entreprise,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  const agence = cible.id_agence
    ? await context.entities.Agence.findUnique({ where: { id: cible.id_agence }, select: { nom_agence: true, commune: true } })
    : null;
  const nomAgence = agence ? `${agence.nom_agence} — ${agence.commune}` : 'votre agence';
  // L'invitation est déjà commitée ci-dessus : si l'e-mail échoue, on
  // l'explique plutôt que de laisser un timeout muet.
  try {
    await envoyerEmailBrevo({
      to: cible.email,
      subject: '🔑 Yeba — Nouveau lien pour définir votre mot de passe',
    html: `<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111827;">Bonjour ${cible.prenom || ''},</h2>
      <p style="color: #374151;">Voici votre nouveau lien d'activation pour <strong>${nomAgence}</strong> (valable 24 h) :</p>
      <p style="text-align: center; margin: 24px 0;"><a href="${lienActivation(tokenClair)}" style="display: inline-block; background: #1a3a5c; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800;">Définir mon mot de passe →</a></p>
      <p style="color: #9ca3af; font-size: 12px;">Si vous avez déjà activé votre compte, ignorez cet email et connectez-vous avec votre mot de passe.</p>
    </div>`,
    text: `Bonjour ${cible.prenom || ''}, définissez votre mot de passe ici (24 h) : ${lienActivation(tokenClair)}`,
    });
  } catch (err: any) {
    throw new HttpError(
      err?.statusCode ?? 502,
      `Nouveau lien créé, mais l'e-mail n'est pas parti (${err?.message ?? 'envoi impossible'}). Vérifiez la configuration e-mail puis cliquez « Renvoyer » une seule fois.`
    );
  }

  await journaliser({
    context,
    action: 'invitation.create',
    resource: 'Invitation',
    resource_id: cible.id,
    entreprise_id: cible.id_entreprise,
    details: { type: 'renvoi-agent' },
  });

  return { ok: true, message: `Nouveau lien d'activation envoyé à ${cible.email}.` };
};


// ============================================================================
// MOT DE PASSE OUBLIÉ (flux maison via Brevo HTTP — 09/2026)
// ─────────────────────────────────────────────
// Le reset interne Wasp envoie par le provider SMTP, dont le TCP est bloqué
// depuis Render (timeout systématique prouvé en logs). Ce flux réutilise le
// circuit d'invitation déjà testé (token 24 h + page /account/activate qui
// définit le mot de passe via activerCompte) :
//  1. demanderReinitialisation({ email }) — PUBLIQUE, anti-énumération
//     (réponse identique que le compte existe ou non) et rate-limitée.
//  2. Clic sur le lien reçu → ActivateAccountPage → activerCompte.
// ============================================================================
const RESET_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const demanderReinitialisation = async (args: { email: string }, context: any) => {
  const email = args.email?.trim().toLowerCase() ?? '';
  const generique = { ok: true as const };

  // Anti-abus : 5 demandes/2 h par IP (un robot ne doit pas spammer la boîte
  // d'un agent ni épuiser le quota Brevo).
  const rl = await checkRateLimit(`reset-mdp:${extraireIp(context)}`, { capacity: 5, refillPerMinute: 0.5 });
  if (!rl.allowed) {
    throw new HttpError(429, `Trop de demandes. Réessayez dans ${rl.retryAfterSeconds} secondes.`);
  }

  // Anti-énumération : même réponse si l'email est invalide ou inconnu.
  if (!RESET_EMAIL_RE.test(email)) return generique;
  const cible = await context.entities.User.findUnique({ where: { email } });
  if (!cible || cible.actif === false || !cible.email) return generique;

  const { lienActivation } = await import('./actionsPlatform');
  const tokenClair = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(tokenClair).digest('hex');
  await context.entities.Invitation.create({
    data: {
      id_user: cible.id,
      // Auto-émis : demande du titulaire lui-même (pas d'émetteur humain).
      id_emetteur: cible.id,
      id_entreprise: cible.id_entreprise ?? null,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Si l'e-mail échoue, l'erreur remonte (explicite via Brevo) : le lien
  // reste utilisable via un renvoi, rien n'est à moitié persisté d'autre.
  await envoyerEmailBrevo({
    to: cible.email,
    subject: '🔑 Yeba — Réinitialisez votre mot de passe',
    html: `<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111827;">Bonjour ${cible.prenom || ''},</h2>
      <p style="color: #374151;">Voici votre lien pour définir un nouveau mot de passe (valable 24 h) :</p>
      <p style="text-align: center; margin: 24px 0;"><a href="${lienActivation(tokenClair)}" style="display: inline-block; background: #1a3a5c; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800;">Définir mon mot de passe →</a></p>
      <p style="color: #9ca3af; font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et connectez-vous avec votre mot de passe actuel.</p>
    </div>`,
    text: `Bonjour ${cible.prenom || ''}, définissez votre nouveau mot de passe ici (24 h) : ${lienActivation(tokenClair)}`,
  });

  return generique;
};


// ============================================================================
// CRITÈRES D'ÉVALUATION
// ============================================================================

export const toggleCritereAgence = async (
  args: { id_critere: number; id_agence?: number; active: boolean },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Faille corrigée : id_agence fourni par le client était auparavant utilisé
  // tel quel (aucune vérification), permettant à un CHEF_AGENCE d'activer/
  // désactiver des critères pour n'importe quelle agence du système.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  // Faille corrigée (audit ZAP #13) : le critère lui-même doit appartenir au
  // tenant (ou être un critère socle Yéba) — sinon un chef pouvait activer
  // dans son agence le critère PRIVÉ d'une autre entreprise en devinant son
  // id (énumération séquentielle).
  await assertCritereAccessible(context, args.id_critere);

  if (args.active) {
    // Upsert ATOMIQUE (pas de findFirst + create) : le Switch n'a pas de
    // verrou côté front historique et Neon répond en ~500 ms — un double-clic
    // créait deux lignes et explosait en P2002 → 500 « impossible d'activer ».
    // Le repli P2002 ci-dessous rend l'activation idempotente dans tous les cas.
    try {
      return await context.entities.AgenceCritere.upsert({
        where: { id_agence_id_critere: { id_agence: idAgence, id_critere: args.id_critere } },
        update: {},
        create: { id_agence: idAgence, id_critere: args.id_critere },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return context.entities.AgenceCritere.findFirst({
          where: { id_agence: idAgence, id_critere: args.id_critere },
        });
      }
      throw e;
    }
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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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

// ============================================================================
// OPTIONS MÉTIER — vague 1 (source de vérité du scoring).
// synchroniserOptionsCritere écrit le jeu d'options d'un critère :
//  - normalise + déduplique les libellés (400 si doublon) ;
//  - upsert par libelle_normalise (jamais de DELETE : les options déjà
//    utilisées par des avis passent actif=false, la FK Restrict de
//    ReponseOption protège l'historique de toute suppression) ;
//  - provenance EXPLICIT (scores saisis par l'admin) ou INFERRED ;
//  - rebump critere.version (traçabilité : les avis stampent la version) ;
//  - maintient options_reponse/scores_reponse CSV (compat lecture legacy ;
//    scores_reponse = NULL si jeu partiellement scoré — honnête).
// ============================================================================

const MODES_SCORING_VALIDES = [
  'ORDINAL', 'BINARY', 'NUMERIC', 'SMILEY', 'NPS',
  'CASES_CATEGORICAL', 'CASES_WEIGHTED', 'CES', 'FREE_TEXT',
];

const MODES_PAR_TYPE: Record<string, Array<string | null>> = {
  SMILEY: ['SMILEY', null],
  OUI_NON: ['BINARY', null],
  QCM: ['ORDINAL', null],
  TEXTE: ['FREE_TEXT', null],
  ECHELLE: ['NUMERIC', 'CES', null],
  NPS: ['NPS', null],
  CASES: ['CASES_CATEGORICAL', 'CASES_WEIGHTED', null],
};

/**
 * CES (Phase L) : échelle 1-5 ou 1-7 uniquement, et orientation IMPOSÉE
 * LOWER_BETTER (1 = très facile = meilleure expérience). Refuser une autre
 * échelle évite un CES illisible ; l'orientation n'est jamais négociable.
 */
const ECHELLES_CES_VALIDES = [5, 7];

type EntreeOption = {
  libelle: string;
  score?: number | null;
  poids?: number | null;
  est_scorable?: boolean;
  code_metier?: string;
  valeur_metier?: string;
};

async function synchroniserOptionsCritere(
  tx: any,
  idCritere: number,
  entrees: EntreeOption[],
  provenance: 'EXPLICIT' | 'INFERRED',
): Promise<{ csvOptions: string; csvScores: string | null }> {
  if (entrees.length < 2) {
    throw new HttpError(400, 'Il faut au moins 2 choix.');
  }
  if (entrees.length > 50) {
    throw new HttpError(400, 'Trop de choix (50 maximum).');
  }
  const vus = new Set<string>();
  const propres = entrees.map((e, i) => {
    const libelle = String(e?.libelle ?? '').trim();
    if (!libelle) throw new HttpError(400, `Le choix n°${i + 1} est vide.`);
    if (libelle.length > 200) throw new HttpError(400, `Le choix « ${libelle.slice(0, 40)} » dépasse 200 caractères.`);
    const normalise = normaliserLibelle(libelle);
    if (!normalise || vus.has(normalise)) {
      throw new HttpError(400, `Choix en double : « ${libelle} » (les libellés doivent être uniques, sans tenir compte des accents et de la casse).`);
    }
    vus.add(normalise);
    const score = e?.score === undefined || e?.score === null ? null : Number(e.score);
    if (score !== null && (!Number.isInteger(score) || score < 1 || score > 20)) {
      throw new HttpError(400, `Score invalide pour « ${libelle} » (entier 1-20).`);
    }
    const poids = e?.poids === undefined || e?.poids === null ? null : Number(e.poids);
    if (poids !== null && (!Number.isInteger(poids) || poids < -100 || poids > 100)) {
      throw new HttpError(400, `Poids invalide pour « ${libelle} » (entier -100 à +100).`);
    }
    const code = typeof e?.code_metier === 'string' ? e.code_metier.trim().toUpperCase().slice(0, 30) : null;
    const valeurMetier = typeof e?.valeur_metier === 'string' ? e.valeur_metier.trim().slice(0, 200) : null;
    return {
      libelle, normalise, ordre: i, score,
      est_scorable: typeof e?.est_scorable === 'boolean' ? e.est_scorable : score !== null,
      poids, code_metier: code || null, valeur_metier: valeurMetier || null,
    };
  });

  const existantes = await tx.optionCritere.findMany({ where: { id_critere: idCritere } });
  const parNorm = new Map<string, any>(existantes.map((o: any) => [o.libelle_normalise, o]));
  const gardees = new Set<string>();
  for (const p of propres) {
    gardees.add(p.normalise);
    const deja = parNorm.get(p.normalise);
    const data = {
      libelle: p.libelle,
      ordre_affichage: p.ordre,
      actif: true,
      est_scorable: p.est_scorable,
      score: p.score,
      score_provenance: p.score !== null ? provenance : null,
      poids: p.poids,
      code_metier: p.code_metier,
      valeur_metier: p.valeur_metier,
    };
    if (deja) {
      await tx.optionCritere.update({ where: { id: deja.id }, data });
    } else {
      await tx.optionCritere.create({
        data: { id_critere: idCritere, libelle_normalise: p.normalise, ...data },
      });
    }
  }
  // Retirées du jeu → désactivées, JAMAIS supprimées (historique).
  for (const o of existantes) {
    if (!gardees.has(o.libelle_normalise) && o.actif) {
      await tx.optionCritere.update({ where: { id: o.id }, data: { actif: false } });
    }
  }

  const csvOptions = propres.map((p) => p.libelle).join(',');
  const toutScore = propres.every((p) => p.score !== null);
  return {
    csvOptions,
    csvScores: toutScore ? propres.map((p) => String(p.score)).join(',') : null,
  };
}

export const createCritere = async (
  args: {
    libelle_critere: string;
    description?: string;
    type_reponse?: string;
    options_reponse?: string;
    // Vague 1 : jeu d'options explicite (prioritaire sur options_reponse).
    options?: EntreeOption[];
    scoring_mode?: string;
    orientation?: string;
    obligatoire?: boolean;
    id_agence?: number;
    serviceIds?: number[];
  },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  // Faille corrigée : cette action n'exigeait auparavant AUCUN rôle
  // particulier — n'importe quel utilisateur connecté (y compris un simple
  // AGENT) pouvait créer des critères d'évaluation.
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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

  const typesValides = ['SMILEY', 'OUI_NON', 'QCM', 'TEXTE', 'ECHELLE', 'CASES', 'NPS'];
  const typeReponse = args.type_reponse && typesValides.includes(args.type_reponse) ? args.type_reponse : 'SMILEY';
  if ((typeReponse === 'QCM' || typeReponse === 'CASES') && !args.options?.length && !args.options_reponse?.trim()) {
    throw new HttpError(400, 'Les choix sont requis pour ce type de réponse.');
  }
  // Vague 1 : mode de scoring explicite (validé + compatible avec le type).
  let scoringMode: string | null = null;
  if (args.scoring_mode !== undefined && args.scoring_mode !== null && String(args.scoring_mode).trim()) {
    const m = String(args.scoring_mode).trim().toUpperCase();
    if (!MODES_SCORING_VALIDES.includes(m) || !(MODES_PAR_TYPE[typeReponse] ?? []).includes(m)) {
      throw new HttpError(400, `Mode de scoring invalide pour ce type de question (${typeReponse}).`);
    }
    scoringMode = m;
  }
  // Vague 1 : orientation (Oui = positif par défaut ; LOWER_BETTER pour les
  // questions « problème » où Oui est négatif).
  let orientation =
    args.orientation === undefined || args.orientation === null || args.orientation === ''
      ? 'HIGHER_BETTER'
      : String(args.orientation).trim().toUpperCase();
  if (orientation !== 'HIGHER_BETTER' && orientation !== 'LOWER_BETTER') {
    throw new HttpError(400, 'Orientation invalide (HIGHER_BETTER ou LOWER_BETTER).');
  }
  let optionsEchelle: string | null = null;
  if (typeReponse === 'ECHELLE') {
    const brut = args.options_reponse?.trim();
    if (brut) {
      const [minStr, maxStr] = brut.split(',').map((v) => v.trim());
      const min = Number(minStr);
      const max = Number(maxStr);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 20 || max <= min) {
        throw new HttpError(400, "Échelle invalide : indiquez un minimum et un maximum entiers cohérents (ex. 1,10).");
      }
      optionsEchelle = `${min},${max}`;
    } else {
      optionsEchelle = '1,5';
    }
  }

  // Phase L — CES : échelle 1-5 / 1-7 et orientation FORCÉE (effort 1 = bon).
  if (scoringMode === 'CES') {
    const [, maxStr] = String(optionsEchelle || '').split(',');
    const min = Number(String(optionsEchelle || '').split(',')[0]);
    const max = Number(maxStr);
    if (min !== 1 || !ECHELLES_CES_VALIDES.includes(max)) {
      throw new HttpError(400, "Question d'effort (CES) : l'échelle doit être 1-5 ou 1-7 (1 = très facile).");
    }
    orientation = 'LOWER_BETTER';
  }

  // Faille corrigée : id_agence fourni par le client n'était jamais vérifié.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  // Dédoublonnage défensif : un id de service envoyé deux fois par erreur
  // (double-clic, état client désynchronisé) ne doit pas produire un
  // critère rattaché en double à la même opération.
  const serviceIds = args.serviceIds ? Array.from(new Set(args.serviceIds)) : [];
  if (serviceIds.length > 1) {
    throw new HttpError(400, "Un critère ne peut être rattaché qu'à une seule opération. Déplacez-le ensuite depuis l'écran d'organisation si nécessaire.");
  }
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
        scoring_mode: scoringMode,
        orientation,
        options_reponse:
          typeReponse === 'QCM' || typeReponse === 'CASES'
            ? args.options_reponse?.trim() || null
            : typeReponse === 'ECHELLE'
            ? optionsEchelle
            : null,
        // Compat legacy (sera recalculé canoniquement après synchronisation
        // des options ci-dessous).
        scores_reponse:
          typeReponse === 'QCM' || typeReponse === 'CASES'
            ? construireScoresAStocker(
                args.options_reponse?.trim() || '',
                undefined
              )
            : null,
        obligatoire: args.obligatoire !== false,
        // Isolation demandée : un critère créé par une entreprise reste
        // invisible aux autres entreprises (getCriteres filtre dessus).
        id_entreprise: context.user.id_entreprise,
      },
    });

    // Vague 1 : écriture des OptionCritere (source de vérité du scoring).
    // - options explicites (nouvelle UI) → provenance EXPLICIT ;
    // - sinon CSV legacy → inférence lexicale, provenance INFERRED.
    if (typeReponse === 'QCM' || typeReponse === 'CASES') {
      let entrees: EntreeOption[];
      let provenance: 'EXPLICIT' | 'INFERRED';
      if (args.options && args.options.length > 0) {
        entrees = args.options;
        provenance = 'EXPLICIT';
      } else {
        const { infererScoreOption } = await import('../shared/scoringQCM');
        entrees = parseOptionsCSV(args.options_reponse || '').map((libelle) => ({
          libelle,
          score: infererScoreOption(libelle),
        }));
        provenance = 'INFERRED';
      }
      const { csvOptions, csvScores } = await synchroniserOptionsCritere(
        tx, created.id, entrees, provenance,
      );
      await tx.critere.update({
        where: { id: created.id },
        data: { options_reponse: csvOptions, scores_reponse: csvScores },
      });
    }

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
// Permet à la DIRECTION / CHEF_AGENCE de déplacer une question
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
 * Met à jour un critère existant (libellé, description, type de réponse,
 * options et caractère obligatoire). Seuls les champs fournis sont modifiés.
 * Permet de corriger une question directement depuis le tableau
 * d'organisation (glisser-déposer) sans repasser par le formulaire complet.
 */
export const updateCritere = async (
  args: {
    id_critere: number;
    libelle_critere?: string;
    description?: string;
    type_reponse?: string;
    options_reponse?: string;
    // Vague 1 : jeu d'options explicite (prioritaire), mode et orientation.
    options?: EntreeOption[];
    scoring_mode?: string | null;
    orientation?: string;
    obligatoire?: boolean;
  },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  if (!Number.isInteger(idCritere)) {
    throw new HttpError(400, 'Identifiant invalide.');
  }

  await assertCritereAccessible(context, idCritere);

  // Audit ZAP #14 : un critère socle (id_entreprise NULL) est partagé par
  // toutes les entreprises — aucune ne peut modifier son contenu.
  const critere = await context.entities.Critere.findUnique({ where: { id: idCritere } });
  if (critere?.id_entreprise === null) {
    throw new HttpError(403, "Ce critère fait partie du socle commun de la plateforme et ne peut pas être modifié. Dupliquez-le pour l'adapter.");
  }

  const libelle = args.libelle_critere?.trim();
  if (libelle !== undefined) {
    if (!libelle) throw new HttpError(400, 'Le libellé est requis.');
    if (libelle.length > 300) throw new HttpError(400, 'Le libellé ne doit pas dépasser 300 caractères.');
  }

  const description = args.description?.trim();
  if (description !== undefined && description.length > 1000) {
    throw new HttpError(400, 'La description ne doit pas dépasser 1000 caractères.');
  }

  const typesValides = ['SMILEY', 'OUI_NON', 'QCM', 'TEXTE', 'ECHELLE', 'CASES', 'NPS'];
  let typeReponse: string | undefined;
  let optionsReponse: string | null | undefined;

  if (args.type_reponse !== undefined) {
    typeReponse = typesValides.includes(args.type_reponse) ? args.type_reponse : 'SMILEY';
    if (typeReponse === 'QCM' || typeReponse === 'CASES') {
      const aDesOptionsExplicites = args.options !== undefined && args.options.length > 0;
      const brut = args.options_reponse?.trim();
      if (!aDesOptionsExplicites && !brut) {
        throw new HttpError(400, 'Les choix sont requis pour ce type de réponse.');
      }
      const nbOptions = aDesOptionsExplicites
        ? args.options!.length
        : brut!.split(',').map((o) => o.trim()).filter(Boolean).length;
      if (nbOptions < 2) throw new HttpError(400, 'Il faut au moins 2 choix.');
      if (!aDesOptionsExplicites) optionsReponse = brut!;
    } else if (typeReponse === 'ECHELLE') {
      const brut = args.options_reponse?.trim();
      if (brut) {
        const [minStr, maxStr] = brut.split(',').map((v) => v.trim());
        const min = Number(minStr);
        const max = Number(maxStr);
        if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 20 || max <= min) {
          throw new HttpError(400, "Échelle invalide : indiquez un minimum et un maximum entiers cohérents (ex. 1,10).");
        }
        optionsReponse = `${min},${max}`;
      } else {
        optionsReponse = '1,5';
      }
    } else {
      optionsReponse = null;
    }
  }

  // Vague 1 : mode + orientation (validés, compatibles avec le type final).
  const typeFinal = typeReponse ?? critere?.type_reponse ?? 'SMILEY';
  let scoringMode: string | null | undefined;
  if (args.scoring_mode !== undefined) {
    if (args.scoring_mode === null || String(args.scoring_mode).trim() === '') {
      scoringMode = null;
    } else {
      const m = String(args.scoring_mode).trim().toUpperCase();
      if (!MODES_SCORING_VALIDES.includes(m) || !(MODES_PAR_TYPE[typeFinal] ?? []).includes(m)) {
        throw new HttpError(400, `Mode de scoring invalide pour ce type de question (${typeFinal}).`);
      }
      scoringMode = m;
    }
  }
  let orientation: string | undefined;
  if (args.orientation !== undefined) {
    const o = String(args.orientation ?? '').trim().toUpperCase() || 'HIGHER_BETTER';
    if (o !== 'HIGHER_BETTER' && o !== 'LOWER_BETTER') {
      throw new HttpError(400, 'Orientation invalide (HIGHER_BETTER ou LOWER_BETTER).');
    }
    orientation = o;
  }

  // Phase L — CES : le mode effectif peut venir de CETTE modification ou
  // être déjà en base. Échelle 1-5 / 1-7 obligatoire et orientation FORCÉE
  // LOWER_BETTER (1 = très facile) : on corrige aussi un CES historique mal
  // orienté, plutôt que de laisser un score inversé en production.
  const modeEffectif = scoringMode !== undefined ? scoringMode : (critere?.scoring_mode ?? null);
  if (modeEffectif === 'CES') {
    const echelleFinale = optionsReponse !== undefined ? optionsReponse : (critere?.options_reponse ?? null);
    const [minStr, maxStr] = String(echelleFinale || '').split(',').map((v) => v.trim());
    const min = Number(minStr);
    const max = Number(maxStr);
    if (min !== 1 || !ECHELLES_CES_VALIDES.includes(max)) {
      throw new HttpError(400, "Question d'effort (CES) : l'échelle doit être 1-5 ou 1-7 (1 = très facile).");
    }
    orientation = 'LOWER_BETTER';
  }

  const toucheScoring =
    typeReponse !== undefined ||
    optionsReponse !== undefined ||
    (args.options !== undefined && args.options.length > 0) ||
    scoringMode !== undefined ||
    orientation !== undefined;

  return await prisma.$transaction(async (tx: any) => {
    const maj = await tx.critere.update({
      where: { id: idCritere },
      data: {
        ...(libelle !== undefined ? { libelle_critere: libelle } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(typeReponse !== undefined ? { type_reponse: typeReponse } : {}),
        ...(optionsReponse !== undefined ? { options_reponse: optionsReponse } : {}),
        ...(scoringMode !== undefined ? { scoring_mode: scoringMode } : {}),
        ...(orientation !== undefined ? { orientation } : {}),
        ...(toucheScoring ? { version: { increment: 1 } } : {}),
        ...(args.obligatoire !== undefined ? { obligatoire: args.obligatoire } : {}),
      },
    });

    // Vague 1 : (re)synchronisation des options + CSV canoniques.
    const typeCourant = maj.type_reponse;
    if (typeCourant === 'QCM' || typeCourant === 'CASES') {
      if (args.options !== undefined && args.options.length > 0) {
        const { csvOptions, csvScores } = await synchroniserOptionsCritere(
          tx, idCritere, args.options, 'EXPLICIT',
        );
        await tx.critere.update({
          where: { id: idCritere },
          data: { options_reponse: csvOptions, scores_reponse: csvScores },
        });
      } else if (optionsReponse !== undefined) {
        const { infererScoreOption } = await import('../shared/scoringQCM');
        const { csvOptions, csvScores } = await synchroniserOptionsCritere(
          tx,
          idCritere,
          parseOptionsCSV(optionsReponse || '').map((libelle) => ({
            libelle,
            score: infererScoreOption(libelle),
          })),
          'INFERRED',
        );
        await tx.critere.update({
          where: { id: idCritere },
          data: { options_reponse: csvOptions, scores_reponse: csvScores },
        });
      } else if (toucheScoring) {
        // Mode/orientation/type changé sans toucher aux options : les CSV
        // legacy restent valides, rien à resynchroniser.
      }
    } else if (typeReponse !== undefined) {
      // Bascule vers un type sans options : désactivation (jamais de
      // suppression — l'historique reste interprétable) + purge CSV legacy.
      await tx.optionCritere.updateMany({
        where: { id_critere: idCritere, actif: true },
        data: { actif: false },
      });
      await tx.critere.update({
        where: { id: idCritere },
        data: { options_reponse: null, scores_reponse: null },
      });
    }
    return maj;
  });
};

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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  const idService = Number(args.id_service);
  if (!Number.isInteger(idCritere) || !Number.isInteger(idService)) {
    throw new HttpError(400, 'Identifiants invalides.');
  }

  await assertCritereAccessible(context, idCritere);
  await assertServiceAccessible(context, idService);

  await prisma.$transaction(async (tx) => {
    const rattachements = await tx.critereService.findMany({
      where: { id_critere: idCritere },
      orderBy: { ordre: 'asc' },
    });
    if (!rattachements.some((r) => r.id_service === idService)) {
      throw new HttpError(409, "Cette question n'est plus rattachée à cette opération. Rechargez la page.");
    }

    // L'éditeur présente chaque question comme une carte unique : si des
    // données anciennes la rattachaient à plusieurs opérations, ne retirer
    // qu'un seul rattachement la ferait « revenir » dans une autre colonne
    // au lieu du vivier « non assignées ». On nettoie partout.
    await tx.critereService.deleteMany({
      where: { id_critere: idCritere },
    });

    // Réordonne chaque opération qui perdait un rattachement.
    const parService = new Map<number, typeof rattachements>();
    for (const r of rattachements) {
      if (r.id_critere === idCritere) continue;
      const liste = parService.get(r.id_service) ?? [];
      liste.push(r);
      parService.set(r.id_service, liste);
    }
    for (const [, restants] of parService) {
      for (let index = 0; index < restants.length; index++) {
        await tx.critereService.update({ where: { id: restants[index].id }, data: { ordre: index } });
      }
    }
  });

  return { success: true };
};

/**
 * Supprime définitivement un critère créé par l'entreprise courante.
 * Les critères "socle" (id_entreprise NULL, fournis par la plateforme) ne
 * sont jamais supprimables. S'il existe déjà des réponses de clients
 * rattachées à ce critère, la suppression est refusée (on perdrait de
 * l'historique d'avis) : on invite plutôt à le désactiver via
 * toggleCritereAgence, ce qui le cache sans effacer les données passées.
 */
export const deleteCritere = async (
  args: { id_critere: number },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  if (!Number.isInteger(idCritere)) {
    throw new HttpError(400, 'Identifiant invalide.');
  }

  const critere = await assertCritereAccessible(context, idCritere);
  if (critere.id_entreprise === null) {
    throw new HttpError(403, "Ce critère fait partie du socle commun de la plateforme et ne peut pas être supprimé. Vous pouvez le désactiver.");
  }

  const nbReponses = await context.entities.Reponse.count({ where: { id_critere: idCritere } });
  if (nbReponses > 0) {
    throw new HttpError(
      409,
      `Ce critère a déjà reçu ${nbReponses} réponse${nbReponses > 1 ? 's' : ''} de clients : le supprimer effacerait cet historique. Désactivez-le plutôt (interrupteur) pour qu'il n'apparaisse plus sans perdre les avis déjà collectés.`
    );
  }

  // AgenceCritere, CritereService et Objectif sont déclarés en cascade côté
  // schéma (onDelete: Cascade sur la relation vers Critere) : leur
  // suppression est automatique dès que le critère l'est.
  await context.entities.Critere.delete({ where: { id: idCritere } });

  return { success: true };
};

/**
 * Duplique un critère existant (y compris un critère "socle" partagé) en
 * une copie appartenant à l'entreprise courante — pratique pour partir d'un
 * standard existant et l'adapter légèrement sans toucher à l'original.
 * La copie reprend les mêmes activations par agence et les mêmes
 * rattachements à des opérations que l'original.
 */
export const duplicateCritere = async (
  args: { id_critere: number },
  context: any
) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idCritere = Number(args.id_critere);
  if (!Number.isInteger(idCritere)) {
    throw new HttpError(400, 'Identifiant invalide.');
  }

  const original = await assertCritereAccessible(context, idCritere);

  // FIX 05/09 (audit) : la copie ne reprend QUE les rattachements du tenant
  // courant. Sans ce scope, dupliquer un critère socle recopiait les liens
  // vers les agences (et services) de TOUTES les entreprises — fuite et
  // corruption inter-tenants.
  const agencesDuTenant = await context.entities.Agence.findMany({
    where: { id_entreprise: context.user.id_entreprise },
    select: { id: true },
  });
  const idsAgencesDuTenant = new Set(agencesDuTenant.map((a: any) => a.id));
  const servicesDuTenant = await context.entities.Service.findMany({
    where: {
      OR: [
        { id_entreprise: null },
        { id_entreprise: context.user.id_entreprise },
      ],
    },
    select: { id: true },
  });
  const idsServicesDuTenant = new Set(servicesDuTenant.map((s: any) => s.id));

  const [agenceLiens, serviceLiens] = await Promise.all([
    context.entities.AgenceCritere.findMany({ where: { id_critere: idCritere } }),
    context.entities.CritereService.findMany({ where: { id_critere: idCritere } }),
  ]);
  const agenceLiensPropres = agenceLiens.filter((lien: any) => idsAgencesDuTenant.has(lien.id_agence));
  const serviceLiensPropres = serviceLiens.filter((lien: any) => idsServicesDuTenant.has(lien.id_service));

  const libelleCopie = `${original.libelle_critere} (copie)`.slice(0, 300);

  const copie = await prisma.$transaction(async (tx) => {
    const created = await tx.critere.create({
      data: {
        libelle_critere: libelleCopie,
        description: original.description,
        type_reponse: original.type_reponse,
        scoring_mode: (original as any).scoring_mode ?? null,
        orientation: (original as any).orientation ?? 'HIGHER_BETTER',
        options_reponse: original.options_reponse,
        // Vague 2 : le CSV des scores suit le CSV des libellés. L'original
        // en était privé (audit P14 e) : la copie se retrouvait avec un jeu de
        // libellés sans barème parallèle, donc une inférence lexique
        // rejouée au lieu des scores réellement configurés.
        scores_reponse: (original as any).scores_reponse ?? null,
        obligatoire: original.obligatoire,
        // La copie devient toujours un critère propre à l'entreprise qui
        // duplique (même si l'original était un critère socle partagé) :
        // c'est ce qui permet de l'adapter librement sans affecter les
        // autres entreprises.
        id_entreprise: context.user.id_entreprise,
      },
    });

    // Vague 1 : la copie reprend les options actives (mêmes scores/poids,
    // provenance conservée) — sinon un QCM dupliqué deviendrait non
    // résolvable (AMBIGU) faute d'options.
    const optionsOriginales = await tx.optionCritere.findMany({
      where: { id_critere: idCritere, actif: true },
      orderBy: { ordre_affichage: 'asc' },
    });
    if (optionsOriginales.length > 0) {
      await tx.optionCritere.createMany({
        data: optionsOriginales.map((o: any) => ({
          id_critere: created.id,
          libelle: o.libelle,
          libelle_normalise: o.libelle_normalise,
          ordre_affichage: o.ordre_affichage,
          actif: true,
          est_scorable: o.est_scorable,
          score: o.score,
          score_provenance: o.score_provenance,
          poids: o.poids,
          valeur_metier: o.valeur_metier,
          code_metier: o.code_metier,
        })),
      });
    }

    for (const lien of agenceLiensPropres) {
      await tx.agenceCritere.create({
        data: { id_agence: lien.id_agence, id_critere: created.id },
      });
    }

    for (const lien of serviceLiensPropres) {
      const nbExistants = await tx.critereService.count({ where: { id_service: lien.id_service } });
      await tx.critereService.create({
        data: { id_critere: created.id, id_service: lien.id_service, ordre: nbExistants },
      });
    }

    return created;
  });

  return copie;
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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Faille corrigée : id_agence fourni par le client n'était jamais vérifié.
  const idAgence = await resolveAgenceId(context, context.entities, args.id_agence);

  if (args.valeur_cible < 0 || args.valeur_cible > 100) {
    throw new HttpError(400, "L'objectif doit être compris entre 0 et 100%.");
  }

  // Bug corrigé : aucune validation ne garantissait que la date de fin
  // suive la date de début. Un objectif avec une plage inversée était
  // silencieusement enregistré, puis getObjectifs ne trouvait jamais de
  // réponses correspondantes (date_reponse entre date_debut et date_fin
  // effective) — l'objectif restait invisible/non évaluable sans aucune
  // erreur expliquant pourquoi.
  const dateDebut = new Date(args.date_debut);
  const dateFin = new Date(args.date_fin);
  if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
    throw new HttpError(400, 'Dates invalides.');
  }
  if (dateFin <= dateDebut) {
    throw new HttpError(400, 'La date de fin doit être postérieure à la date de début.');
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
        date_debut: dateDebut,
        date_fin: dateFin,
      },
    });
  }

  return context.entities.Objectif.create({
    data: {
      id_agence: idAgence,
      id_critere: args.id_critere,
      valeur_cible: args.valeur_cible,
      date_debut: dateDebut,
      date_fin: dateFin,
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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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
  await assertEntrepriseActive(context, context.entities);

  const STATUTS_VALIDES = ['A_FAIRE', 'EN_COURS', 'TERMINEE'];
  if (!STATUTS_VALIDES.includes(args.statut)) {
    throw new HttpError(400, 'Statut invalide.');
  }

  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: BigInt(args.id) },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  // Bug corrigé : seuls DIRECTION/CHEF_AGENCE pouvaient auparavant
  // faire évoluer une tâche — un AGENT auquel une tâche était assignée
  // (cas le plus courant : un chef d'agence délègue l'action corrective à
  // un agent) ne pouvait jamais la faire passer lui-même à "Terminé" et
  // dépendait entièrement de son chef pour clôturer un travail qu'il avait
  // déjà réellement effectué. On autorise donc aussi le responsable
  // désigné de CETTE tâche à changer son propre statut, en plus des rôles
  // de gestion qui gardent le droit de le faire pour n'importe quelle tâche
  // de leur périmètre.
  const estResponsableDeLaTache = tache.id_responsable === context.user.id;
  if (!estResponsableDeLaTache) {
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
  }

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
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

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
// SUPPRESSION D'OBJECTIF (Module 5 — Planification)
// ============================================================================

export const deleteObjectif = async (args: { id: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const objectif = await context.entities.Objectif.findUnique({
    where: { id: args.id },
  });
  if (!objectif) throw new HttpError(404, 'Objectif introuvable.');

  // Vérifier que l'objectif appartient bien à une agence de l'entreprise
  // de l'utilisateur courant (isolation multi-tenant).
  await assertAgenceAccess(context, context.entities, objectif.id_agence, 'objectif');

  return context.entities.Objectif.delete({ where: { id: args.id } });
};

/**
 * Archive manuellement une alerte déjà traitée (le job quotidien
 * `archiverElementsResolusAnciens` le fait automatiquement pour celles de
 * plus de 6 mois, mais un manager peut vouloir alléger sa vue plus tôt).
 * On refuse d'archiver une alerte encore NOUVELLE : elle doit d'abord être
 * traitée, sinon on perdrait sa visibilité opérationnelle par erreur.
 */
export const archiverAlerte = async (args: { id_alerte: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idAlerte = BigInt(args.id_alerte);
  const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, idAlerte);
  await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');

  const alerte = await context.entities.Alerte.findUnique({ where: { id: idAlerte } });
  if (!alerte) throw new HttpError(404, 'Alerte introuvable.');
  if (alerte.statut_alerte !== 'TRAITEE') {
    throw new HttpError(409, "Cette alerte doit d'abord être traitée avant de pouvoir être archivée.");
  }

  return context.entities.Alerte.update({
    where: { id: idAlerte },
    data: { archive: true, date_archivage: new Date() },
  });
};

export const desarchiverAlerte = async (args: { id_alerte: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  const idAlerte = BigInt(args.id_alerte);
  const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, idAlerte);
  await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');

  return context.entities.Alerte.update({
    where: { id: idAlerte },
    data: { archive: false, date_archivage: null },
  });
};

/**
 * Archive manuellement une tâche déjà TERMINEE. Même règle d'autorisation
 * que updateStatutTache : un profil de gestion, ou le responsable de la
 * tâche lui-même.
 */
export const archiverTache = async (args: { id_tache: number }, context: any) => {
  requireAuth(context);

  await assertEntrepriseActive(context, context.entities);
  const idTache = BigInt(args.id_tache);
  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: idTache },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  if (tache.id_responsable !== context.user.id) {
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
  }
  const idAgenceTache = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
  if (!idAgenceTache) throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
  await assertAgenceAccess(context, context.entities, idAgenceTache, 'tâche corrective');

  if (tache.statut_tache !== 'TERMINEE') {
    throw new HttpError(409, "Cette tâche doit d'abord être terminée avant de pouvoir être archivée.");
  }

  return context.entities.TacheCorrective.update({
    where: { id: idTache },
    data: { archive: true, date_archivage: new Date() },
  });
};

export const desarchiverTache = async (args: { id_tache: number }, context: any) => {
  requireAuth(context);

  await assertEntrepriseActive(context, context.entities);
  const idTache = BigInt(args.id_tache);
  const tache = await context.entities.TacheCorrective.findUnique({
    where: { id: idTache },
    include: { alerte: { include: { guichet: true, reponse: true } } },
  });
  if (!tache) throw new HttpError(404, 'Tâche introuvable.');

  if (tache.id_responsable !== context.user.id) {
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
  }
  const idAgenceTache = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
  if (!idAgenceTache) throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
  await assertAgenceAccess(context, context.entities, idAgenceTache, 'tâche corrective');

  return context.entities.TacheCorrective.update({
    where: { id: idTache },
    data: { archive: false, date_archivage: null },
  });
};

export const archiverCritere = async (args: { id_critere: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Audit ZAP #14 : tenant + socle — un critère partagé par la plateforme
  // n'appartient à aucune entreprise, personne ne peut l'archiver.
  const critere = await assertCritereAccessible(context, args.id_critere);
  if (critere.id_entreprise === null) {
    throw new HttpError(403, "Ce critère fait partie du socle commun de la plateforme et ne peut pas être archivé. Désactivez-le dans votre agence.");
  }

  return context.entities.Critere.update({
    where: { id: args.id_critere },
    data: { archive: true, date_archivage: new Date() },
  });
};

export const desarchiverCritere = async (args: { id_critere: number }, context: any) => {
  requireAuth(context);
  await assertEntrepriseActive(context, context.entities);
  requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);

  // Mêmes garde-fous : tenant + socle intouchable.
  const critere = await assertCritereAccessible(context, args.id_critere);
  if (critere.id_entreprise === null) {
    throw new HttpError(403, "Ce critère fait partie du socle commun de la plateforme.");
  }

  return context.entities.Critere.update({
    where: { id: args.id_critere },
    data: { archive: false, date_archivage: null },
  });
};
