// src/server/actions.ts
import { HttpError } from 'wasp/server';
import { prisma } from 'wasp/server';
import { emailSender } from 'wasp/server/email';
import { createProviderId, createUser, sanitizeAndSerializeProviderData, } from 'wasp/server/auth';
import crypto from 'node:crypto';
import { envoyerAlerteWhatsApp } from './notifications/gateway';
import { checkRateLimit, extraireIp } from './rateLimit';
import { requireAuth, requireRole, assertAgenceAccess, assertEntrepriseActive, resolveAgenceId, } from './middleware/rowLevelSecurity';
// Utilisé pour construire des liens directs vers l'application dans les
// notifications SMS/WhatsApp (ex. lien vers /alertes-taches).
const FRONTEND_URL = process.env.WASP_WEB_CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
// Sel d'environnement pour le hachage des numéros de téléphone (ARTCI).
// En production, un sel manquant compromettrait l'anti-rejeu (hachage
// prévisible / attaquable par dictionnaire) : on refuse de démarrer plutôt
// que de retomber silencieusement sur une valeur par défaut connue de tous.
if (!process.env.TELEPHONE_HASH_SALT && process.env.NODE_ENV === 'production') {
    throw new Error("TELEPHONE_HASH_SALT doit être défini en production (voir .env.server).");
}
const TELEPHONE_SALT = process.env.TELEPHONE_HASH_SALT || 'yeba-default-salt-change-me';
/** Résout l'id_agence auquel se rattache une Alerte (via son guichet ou sa réponse). */
async function resolveAlerteAgenceId(entities, id_alerte) {
    const alerte = await entities.Alerte.findUnique({
        where: { id: id_alerte },
        include: { guichet: true, reponse: true },
    });
    if (!alerte)
        throw new HttpError(404, 'Alerte introuvable.');
    const idAgence = alerte.guichet?.id_agence ?? alerte.reponse?.id_agence;
    if (!idAgence)
        throw new HttpError(400, "Impossible de déterminer l'agence de cette alerte.");
    return idAgence;
}
// Alphabet QR public : sans 0/O/1/l pour éviter toute confusion à la lecture
// d'un QR imprimé. 10 caractères = 32^10 ≈ 10^15 combinaisons.
const ALPHABET_CODE_PUBLIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const genererCodePublic = () => {
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
export const createGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['CHEF_AGENCE']);
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
    if (serviceIds && serviceIds.length > 0) {
        const agence = await context.entities.Agence.findUnique({
            where: { id: id_agence },
            select: { id_entreprise: true },
        });
        const servicesValides = await context.entities.Service.findMany({
            where: {
                id: { in: serviceIds.map(Number) },
                OR: [
                    { id_entreprise: null },
                    { id_entreprise: agence?.id_entreprise ?? -1 },
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
    const agencesIds = await context.entities.Agence.findMany({
        where: { id_entreprise: (await context.entities.Agence.findUnique({ where: { id: id_agence }, select: { id_entreprise: true } }))?.id_entreprise },
        select: { id: true },
    });
    const entrepriseQuotaGuichets = await context.entities.Entreprise.findUnique({
        where: { id: agencesIds[0]?.id_entreprise },
        select: { limite_guichets: true },
    });
    if (entrepriseQuotaGuichets) {
        const nbGuichets = await context.entities.Guichet.count({
            where: { id_agence: { in: agencesIds.map((a) => a.id) }, archive: false },
        });
        if (nbGuichets >= entrepriseQuotaGuichets.limite_guichets) {
            throw new HttpError(403, `Limite du plan atteinte (${entrepriseQuotaGuichets.limite_guichets} guichets). Passez à un plan supérieur ou contactez Yeba.`);
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
export const updateGuichetServices = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['CHEF_AGENCE']);
    const guichet = await context.entities.Guichet.findUnique({
        where: { id: args.id_guichet }
    });
    if (!guichet)
        throw new HttpError(404, 'Guichet introuvable.');
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
export const archiverGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
    if (!guichet)
        throw new HttpError(404, 'Guichet introuvable.');
    await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');
    if (guichet.archive)
        return guichet; // déjà archivé : idempotent, pas d'erreur
    return context.entities.Guichet.update({
        where: { id: args.id_guichet },
        data: { archive: true, date_archivage: new Date() },
    });
};
export const desarchiverGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
    if (!guichet)
        throw new HttpError(404, 'Guichet introuvable.');
    await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');
    return context.entities.Guichet.update({
        where: { id: args.id_guichet },
        data: { archive: false, date_archivage: null },
    });
};
export const assignAgent = async (args, context) => {
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
    if (!guichet)
        throw new HttpError(404, 'Guichet introuvable.');
    await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');
    const agent = await context.entities.User.findUnique({ where: { id: args.id_agent } });
    if (!agent)
        throw new HttpError(404, 'Agent introuvable.');
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
        throw new HttpError(409, `Cet agent est déjà affecté au guichet « ${chevauchement.guichet?.nom_guichet || 'inconnu'} » de ${chevauchement.heure_debut} à ${chevauchement.heure_fin}. Les créneaux ne peuvent pas se chevaucher.`);
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
export const updateAffectationGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    if (!args.id)
        throw new HttpError(400, "Identifiant d'affectation manquant.");
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
    if (!affectation)
        throw new HttpError(404, 'Affectation introuvable.');
    // L'affectation doit rester dans le périmètre de l'appelant (agence d'origine).
    await assertAgenceAccess(context, context.entities, affectation.guichet.id_agence, 'affectation');
    const guichet = await context.entities.Guichet.findUnique({ where: { id: args.id_guichet } });
    if (!guichet)
        throw new HttpError(404, 'Guichet introuvable.');
    // Le nouveau guichet ciblé doit aussi rester dans le périmètre de l'appelant.
    await assertAgenceAccess(context, context.entities, guichet.id_agence, 'guichet');
    const agent = await context.entities.User.findUnique({ where: { id: args.id_agent } });
    if (!agent)
        throw new HttpError(404, 'Agent introuvable.');
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
        throw new HttpError(409, `Cet agent est déjà affecté au guichet « ${chevauchement.guichet?.nom_guichet || 'inconnu'} » de ${chevauchement.heure_debut} à ${chevauchement.heure_fin}. Les créneaux ne peuvent pas se chevaucher.`);
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
export const deleteAffectationGuichet = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    if (!args.id)
        throw new HttpError(400, "Identifiant d'affectation manquant.");
    const affectation = await context.entities.AffectationGuichet.findUnique({
        where: { id: args.id },
        include: { guichet: { select: { id_agence: true } } },
    });
    if (!affectation)
        throw new HttpError(404, 'Affectation introuvable.');
    await assertAgenceAccess(context, context.entities, affectation.guichet.id_agence, 'affectation');
    await context.entities.AffectationGuichet.delete({ where: { id: args.id } });
    return { success: true };
};
// ============================================================================
// COLLECTE D'AVIS (avec anti-rejeu + notifications)
// ============================================================================
const soumettreAvisImpl = async (args, context) => {
    const { guichetId, code_public, score, critereId, canalId, commentaire, telephone, serviceId, responses } = args;
    let hachageTelephone = null;
    // FIX QR OPAQUE (05/09) : la page de collecte par code envoie le
    // code_public ; on le résout en guichet ici, côté serveur.
    let idGuichetEffectif = guichetId;
    if (!idGuichetEffectif && code_public) {
        const guichetParCode = await context.entities.Guichet.findUnique({
            where: { code_public: String(code_public).toUpperCase().trim() },
            select: { id: true },
        });
        if (!guichetParCode) {
            throw new HttpError(404, "Guichet introuvable.");
        }
        idGuichetEffectif = guichetParCode.id;
    }
    if (!idGuichetEffectif) {
        throw new HttpError(400, "Identifiant du guichet requis.");
    }
    // ANTI-ABUS (Doc 11 §9 S8 adapté à la route publique) : la route de
    // collecte est anonyme — sans rate limiting, un script peut saturer la
    // base de faux avis. Deux niveaux :
    //  - par (IP, guichet) : 8 avis / min de rafale, recharge 2/min → un
    //    humain qui aide plusieurs clients au guichet passe toujours ;
    //  - par IP seule : 30 avis / min → un même point d'accès NAT (café,
    //    opérateur mobile) servant plusieurs guichets reste fluide.
    // Le téléphone seul ne suffit pas comme protection car il est optionnel.
    const ipClient = extraireIp(context);
    const rl1 = checkRateLimit(`avis:${ipClient}:${idGuichetEffectif}`, { capacity: 8, refillPerMinute: 2 });
    if (!rl1.allowed) {
        throw new HttpError(429, `Trop de soumissions depuis cet appareil pour ce guichet. Réessayez dans ${rl1.retryAfterSeconds} s.`);
    }
    const rl2 = checkRateLimit(`avis:${ipClient}`, { capacity: 30, refillPerMinute: 10 });
    if (!rl2.allowed) {
        throw new HttpError(429, `Trop de soumissions depuis cette connexion. Réessayez dans ${rl2.retryAfterSeconds} s.`);
    }
    // --- ANTI-REJEU : hachage SHA-256 du numéro de téléphone ---
    if (telephone) {
        hachageTelephone = crypto
            .createHash('sha256')
            .update(TELEPHONE_SALT + telephone.replace(/\s+/g, ''))
            .digest('hex');
        const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existant = await context.entities.VoteAntiRejeu.findFirst({
            where: {
                hachage_tel: hachageTelephone,
                date_vote: { gte: hier },
            },
        });
        if (existant) {
            throw new HttpError(429, "Vous avez déjà soumis un avis depuis ce numéro ces dernières 24h.");
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
    const CANAUX_CONNUS = {
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
        if (soumissionExistante)
            return soumissionExistante;
    }
    // Normalize responses list
    let itemsToInsert = [];
    if (responses && Array.isArray(responses) && responses.length > 0) {
        itemsToInsert = responses.map((r) => ({
            critereId: Number(r.critereId),
            score: Number(r.score),
            texte: typeof r.texte === 'string' ? r.texte.trim().slice(0, 1000) : undefined,
        }));
    }
    else if (score !== undefined && score !== null && critereId !== undefined) {
        itemsToInsert = [{
                critereId: Number(critereId),
                score: Number(score)
            }];
    }
    else {
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
    const critereIds = [...new Set(itemsToInsert.map((i) => i.critereId))];
    const criteresExistants = await context.entities.Critere.findMany({
        where: { id: { in: critereIds } },
        select: { id: true, type_reponse: true, options_reponse: true },
    });
    const critereById = new Map(criteresExistants.map((c) => [c.id, c]));
    const idsExistants = new Set(criteresExistants.map((c) => c.id));
    const idsManquants = critereIds.filter((id) => !idsExistants.has(id));
    if (idsManquants.length > 0) {
        throw new HttpError(400, "Ce guichet n'a aucun critère de notation configuré. Demandez à votre administrateur de configurer les critères de l'agence avant de collecter des avis.");
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
        const rattachements = await context.entities.CritereService.findMany({
            where: {
                id_service: serviceDuGuichet.id,
                id_critere: { in: critereIds },
            },
            select: { id_critere: true },
        });
        if (rattachements.length !== critereIds.length) {
            throw new HttpError(400, "Un ou plusieurs critères ne font pas partie de l’opération sélectionnée.");
        }
    }
    // Validation des scores : bornée à l'échelle propre à chaque critère
    // (ex. 1-10 pour une question de type ECHELLE configurée sur 10), 1-5
    // sinon (SMILEY, OUI_NON, QCM, TEXTE, CASES restent sur l'échelle
    // historique — TEXTE/CASES envoient un score neutre fixe, pas une vraie
    // note, donc 1-5 leur suffit).
    for (const item of itemsToInsert) {
        const critere = critereById.get(item.critereId);
        let min = 1;
        let max = 5;
        if (critere?.type_reponse === 'ECHELLE') {
            const [minStr, maxStr] = (critere.options_reponse || '1,5').split(',');
            min = Number(minStr);
            max = Number(maxStr);
            if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
                min = 1;
                max = 5;
            }
        }
        if (!Number.isInteger(item.score) || item.score < min || item.score > max) {
            throw new HttpError(400, `Le score doit être un entier compris entre ${min} et ${max}.`);
        }
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
    if (hachageTelephone) {
        await context.entities.VoteAntiRejeu.upsert({
            where: { hachage_tel: hachageTelephone },
            update: { date_vote: new Date() },
            create: { hachage_tel: hachageTelephone },
        });
    }
    // Score normalisé sur 5 : sert uniquement à détecter les avis critiques
    // (worstScore <= 2) et le seuil confetti, indépendamment de l'échelle
    // réelle de saisie (une ECHELLE configurée 1-10 ne doit pas être comparée
    // brute à un seuil pensé pour du 1-5).
    const normaliserScoreSur5 = (critere, score) => {
        if (critere?.type_reponse === 'TEXTE' || critere?.type_reponse === 'CASES' || critere?.type_reponse === 'QCM') {
            return null;
        }
        if (critere?.type_reponse === 'ECHELLE') {
            const [minStr, maxStr] = (critere.options_reponse || '1,5').split(',');
            const min = Number(minStr) || 1;
            const max = Number(maxStr) || 5;
            if (max <= min)
                return score;
            const ratio = (score - min) / (max - min);
            return Math.max(1, Math.min(5, Math.round(1 + ratio * 4)));
        }
        return score;
    };
    // PERFORMANCE QR (Doc 11 §10, priorité 1) : createMany remplace la boucle
    // d'INSERT individuels. 5 critères = 1 requête SQL multi-VALUES au lieu de
    // 5 allers-retours — la différence est décisive quand plusieurs clients
    // soumettent simultanément. Le reroll canal (FK manquante sur base non
    // seedée) est appliqué au lot entier si nécessaire.
    const construireLigne = (item) => ({
        score_brut: item.score,
        // Correctif : chaque ligne porte désormais son propre texte ; on ne
        // retombe sur le commentaire final que s'il n'y en a pas.
        commentaire_texte: (item.texte && item.texte.length > 0) ? item.texte : (commentaire || ""),
        id_soumission: submissionId,
        id_critere: item.critereId,
        id_canal: idCanalResolved,
        id_agence: guichet.id_agence,
        id_guichet: guichet.id,
        id_service: serviceId ? Number(serviceId) : null,
        id_agent: affectation?.id_agent || null,
    });
    const lignes = itemsToInsert.map(construireLigne);
    let createdReponses;
    // FIX 05/09 (audit) : check + insertion atomiques. Sans transaction, deux
    // requêtes concurrentes avec le même id_soumission passent toutes les deux
    // le contrôle d'existence (plus haut) puis insèrent en double. Ici le
    // verrou consultatif sérialise les jumelles DANS la transaction : la
    // seconde voit les lignes de la première et renvoie l'existant.
    const insererLignes = async (tx) => {
        try {
            await tx.reponse.createMany({ data: lignes });
        }
        catch (e) {
            // Reroll ciblé : violation FK id_canal uniquement (canal absent d'une
            // base non seedée). P2003 = Foreign key constraint violated (Prisma).
            const isFkCanal = e?.code === 'P2003' && String(e?.meta?.field_name ?? '').includes('id_canal');
            if (!isFkCanal)
                throw e;
            await assurerCanalExiste();
            await tx.reponse.createMany({ data: lignes });
        }
    };
    try {
        createdReponses = await prisma.$transaction(async (tx) => {
            if (idempotenceDemandee) {
                try {
                    await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtextextended(${submissionId}, 0))`;
                }
                catch {
                    // Base non-Postgres en dev local : on continue sans verrou.
                }
                const deja = await tx.reponse.findFirst({
                    where: { id_soumission: submissionId },
                    orderBy: { date_reponse: 'asc' },
                });
                if (deja)
                    return [deja];
            }
            await insererLignes(tx);
            // createMany ne renvoie pas les lignes : une seule lecture pour
            // récupérer les IDs générés (nécessaire pour l'analyse IA et l'alerte
            // critique).
            return await tx.reponse.findMany({
                where: { id_soumission: submissionId },
                orderBy: { id: 'asc' },
            });
        });
    }
    catch (e) {
        // Reroll ciblé : violation FK id_canal uniquement (canal absent d'une
        // base non seedée). P2003 = Foreign key constraint violated (Prisma).
        const isFkCanal = e?.code === 'P2003' && String(e?.meta?.field_name ?? '').includes('id_canal');
        if (!isFkCanal)
            throw e;
        await assurerCanalExiste();
        await context.entities.Reponse.createMany({ data: lignes });
        createdReponses = await context.entities.Reponse.findMany({
            where: { id_soumission: submissionId },
            orderBy: { id: 'asc' },
        });
    }
    let worstScore = null;
    for (const item of itemsToInsert) {
        const scoreNormalise = normaliserScoreSur5(critereById.get(item.critereId), item.score);
        if (scoreNormalise !== null && (worstScore === null || scoreNormalise < worstScore)) {
            worstScore = scoreNormalise;
        }
    }
    // --- ANALYSE IA ASYNCHRONE (DeepSeek) — UNE SEULE par avis ---
    // On n'analyse que le commentaire final (s'il existe), une seule fois par
    // soumission, au lieu d'une entrée par réponse (qui dupliquait l'analyse
    // du même commentaire sur chaque critère noté).
    const commentaireFinal = (commentaire || '').trim().slice(0, 1000);
    if (commentaireFinal.length > 0 && createdReponses.length > 0) {
        try {
            if (context.entities.AnalyseAvisIA) {
                // On conserve la note (score du critère noté, sinon la première
                // réponse chiffrée) pour le croisement note ↔ texte côté job IA.
                const reponseNotee = createdReponses.find((r) => typeof r.score_brut === 'number');
                await context.entities.AnalyseAvisIA.create({
                    data: {
                        reponseId: createdReponses[0].id,
                        commentaireTexte: commentaireFinal,
                        noteBrut: reponseNotee?.score_brut ?? null,
                        status: 'PENDING',
                    },
                });
            }
        }
        catch (aiErr) {
            console.warn('[SOUMETTRE_AVIS_IA] Avertissement non-bloquant:', aiErr);
        }
    }
    // --- ALERTE + NOTIFICATIONS si note critique ---
    if (worstScore !== null && worstScore <= 2) {
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
        const destinataire = chefAgence ||
            utilisateursEntreprise.find((u) => u.role === 'DIRECTION') ||
            null;
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
                const msgAlerte = `⚠️ Yeba ALERTE — Note critique ${worstScore}/5 au guichet "${guichet.nom_guichet}".${extraitCommentaire} Traitez : ${FRONTEND_URL}/alertes-taches`;
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
export const soumettreAvis = async (args, context) => {
    try {
        return await soumettreAvisImpl(args, context);
    }
    catch (error) {
        if (error instanceof HttpError)
            throw error;
        console.error('[SOUMETTRE_AVIS] Échec inattendu', {
            message: error?.message,
            code: error?.code,
            meta: error?.meta,
            guichetId: args?.guichetId,
        });
        throw new HttpError(500, "Nous ne pouvons pas enregistrer votre avis pour le moment. Veuillez réessayer dans quelques instants.");
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
export const updateAgent = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
        await prisma.$transaction(async (tx) => {
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
export const deleteAgent = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
export const reactivateAgent = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
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
export const promouvoirAgent = async (args, context) => {
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
// GESTION DES AGENCES
// ============================================================================
// Le seed unique (src/server/scripts/dbSeeds.ts) crée l'Entreprise et
// l'Agence unique au démarrage. createAgence reste disponible dans le code
// pour un agrandissement futur (ajout d'une 2ᵉ agence par le chef
// d'entreprise, rôle DIRECTION) mais n'est pas exposé dans l'UI tant que le
// déploiement reste mono-agence (voir décision produit associée).
export const createAgence = async (args, context) => {
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
    const entreprise = await context.entities.Entreprise.findUnique({
        where: { id: context.user.id_entreprise },
        select: { limite_agences: true, _count: { select: { agences: true } } },
    });
    if (entreprise && entreprise._count.agences >= entreprise.limite_agences) {
        throw new HttpError(403, `Limite du plan atteinte (${entreprise.limite_agences} agences). Passez à un plan supérieur ou contactez Yeba.`);
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
export const archiverAgence = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION']);
    await assertAgenceAccess(context, context.entities, args.id_agence, 'agence');
    const agence = await context.entities.Agence.findUnique({ where: { id: args.id_agence } });
    if (!agence)
        throw new HttpError(404, 'Agence introuvable.');
    if (agence.archive)
        return agence;
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
export const desarchiverAgence = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION']);
    await assertAgenceAccess(context, context.entities, args.id_agence, 'agence');
    const agence = await context.entities.Agence.findUnique({ where: { id: args.id_agence } });
    if (!agence)
        throw new HttpError(404, 'Agence introuvable.');
    return context.entities.Agence.update({
        where: { id: args.id_agence },
        data: { archive: false, date_archivage: null },
    });
};
export const inviteAgent = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    // Règle métier (Doc 02 §matrice rôles — référence absolue) : le chef
    // d'entreprise structure le réseau (chefs d'agence, auditeurs qualité) ;
    // le chef d'agence ne gère que SON équipe de terrain (agents), jamais des
    // auditeurs qualité qui relèvent de la Direction. L'auditeur qualité
    // analyse de manière indépendante — il ne peut pas être nommé par la
    // personne dont il audite le travail.
    const ROLES_PAR_INVITEUR = {
        DIRECTION: ['CHEF_AGENCE'],
        CHEF_AGENCE: ['AGENT'],
    };
    const rolesAutorises = ROLES_PAR_INVITEUR[context.user.role ?? ''] || [];
    if (!rolesAutorises.includes(args.role)) {
        throw new HttpError(403, context.user.role === 'DIRECTION'
            ? "En tant que direction, vous ne pouvez créer que des Chefs d'Agence."
            : "En tant que Chef d'Agence, vous ne pouvez créer que des Agents de guichet.");
    }
    const targetAgenceId = await resolveAgenceId(context, context.entities, args.id_agence);
    const targetAgence = await context.entities.Agence.findUnique({ where: { id: targetAgenceId } });
    if (!targetAgence)
        throw new HttpError(404, 'Agence introuvable.');
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
    // QUOTA SAAS : limite d'utilisateurs du plan, vérifiée côté serveur.
    const entrepriseQuota = await context.entities.Entreprise.findUnique({
        where: { id: targetAgence.id_entreprise },
        select: { limite_utilisateurs: true, _count: { select: { utilisateurs: true } } },
    });
    if (entrepriseQuota && entrepriseQuota._count.utilisateurs >= entrepriseQuota.limite_utilisateurs) {
        throw new HttpError(403, `Limite du plan atteinte (${entrepriseQuota.limite_utilisateurs} utilisateurs). Passez à un plan supérieur ou contactez Yeba.`);
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
        const providerData = await sanitizeAndSerializeProviderData({
            hashedPassword: tempPassword,
            isEmailVerified: true,
            emailVerificationSentAt: null,
            passwordResetSentAt: null,
        });
        newUser = await createUser(providerId, providerData, {
            email: normalizedEmail,
            ...additionalUserData,
        });
    }
    else {
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
        await emailSender.send({
            to: normalizedEmail,
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
                `1. Définissez votre mot de passe : ${frontendUrl}/request-password-reset`,
                `2. Connectez-vous sur : ${frontendUrl}/login`,
                `3. Retrouvez votre espace Yeba depuis votre tableau de bord.`,
                ``,
                `Yeba — Plateforme de satisfaction client`,
            ].join('\n'),
        });
        console.log(`event=invite_email_sent role=CHEF_AGENCE agence=${targetAgenceId}`);
    }
    else {
        // AGENT simple → créé silencieusement, pas d'email
        // Il sera assigné aux guichets via le planning sans jamais se connecter.
        console.log(`event=agent_created_silent agence=${targetAgenceId}`);
    }
    return newUser;
};
// ============================================================================
// CRITÈRES D'ÉVALUATION
// ============================================================================
export const toggleCritereAgence = async (args, context) => {
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
        const existing = await context.entities.AgenceCritere.findFirst({
            where: { id_agence: idAgence, id_critere: args.id_critere },
        });
        if (!existing) {
            return context.entities.AgenceCritere.create({
                data: { id_agence: idAgence, id_critere: args.id_critere },
            });
        }
        return existing;
    }
    else {
        return context.entities.AgenceCritere.deleteMany({
            where: { id_agence: idAgence, id_critere: args.id_critere },
        });
    }
};
export const createService = async (args, context) => {
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
export const createCritere = async (args, context) => {
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
    const typesValides = ['SMILEY', 'OUI_NON', 'QCM', 'TEXTE', 'ECHELLE', 'CASES'];
    const typeReponse = args.type_reponse && typesValides.includes(args.type_reponse) ? args.type_reponse : 'SMILEY';
    if ((typeReponse === 'QCM' || typeReponse === 'CASES') && !args.options_reponse?.trim()) {
        throw new HttpError(400, 'Les choix sont requis pour ce type de réponse.');
    }
    if ((typeReponse === 'QCM' || typeReponse === 'CASES')) {
        const nbOptions = args.options_reponse.split(',').map((o) => o.trim()).filter(Boolean).length;
        if (nbOptions < 2) {
            throw new HttpError(400, 'Il faut au moins 2 choix.');
        }
    }
    let optionsEchelle = null;
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
        }
        else {
            optionsEchelle = '1,5';
        }
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
                options_reponse: typeReponse === 'QCM' || typeReponse === 'CASES'
                    ? args.options_reponse?.trim() || null
                    : typeReponse === 'ECHELLE'
                        ? optionsEchelle
                        : null,
                obligatoire: args.obligatoire !== false,
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
// Permet à la DIRECTION / CHEF_AGENCE de déplacer une question
// (Critere) vers une opération (Service), de la retirer, et de réordonner
// librement les questions au sein d'une opération, comme une liste de tâches.
/** Vérifie qu'un critère est bien visible/gérable par l'entreprise de l'utilisateur courant. */
async function assertCritereAccessible(context, idCritere) {
    const critere = await context.entities.Critere.findUnique({ where: { id: idCritere } });
    if (!critere)
        throw new HttpError(404, 'Critère introuvable.');
    if (critere.id_entreprise !== null && critere.id_entreprise !== context.user.id_entreprise) {
        throw new HttpError(403, 'Ce critère ne fait pas partie de votre entreprise.');
    }
    return critere;
}
/** Vérifie qu'une opération est bien visible/gérable par l'entreprise de l'utilisateur courant. */
async function assertServiceAccessible(context, idService) {
    const service = await context.entities.Service.findUnique({ where: { id: idService } });
    if (!service)
        throw new HttpError(404, 'Opération introuvable.');
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
export const updateCritere = async (args, context) => {
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
        if (!libelle)
            throw new HttpError(400, 'Le libellé est requis.');
        if (libelle.length > 300)
            throw new HttpError(400, 'Le libellé ne doit pas dépasser 300 caractères.');
    }
    const description = args.description?.trim();
    if (description !== undefined && description.length > 1000) {
        throw new HttpError(400, 'La description ne doit pas dépasser 1000 caractères.');
    }
    const typesValides = ['SMILEY', 'OUI_NON', 'QCM', 'TEXTE', 'ECHELLE', 'CASES'];
    let typeReponse;
    let optionsReponse;
    if (args.type_reponse !== undefined) {
        typeReponse = typesValides.includes(args.type_reponse) ? args.type_reponse : 'SMILEY';
        if (typeReponse === 'QCM' || typeReponse === 'CASES') {
            const brut = args.options_reponse?.trim();
            if (!brut)
                throw new HttpError(400, 'Les choix sont requis pour ce type de réponse.');
            const nbOptions = brut.split(',').map((o) => o.trim()).filter(Boolean).length;
            if (nbOptions < 2)
                throw new HttpError(400, 'Il faut au moins 2 choix.');
            optionsReponse = brut;
        }
        else if (typeReponse === 'ECHELLE') {
            const brut = args.options_reponse?.trim();
            if (brut) {
                const [minStr, maxStr] = brut.split(',').map((v) => v.trim());
                const min = Number(minStr);
                const max = Number(maxStr);
                if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 20 || max <= min) {
                    throw new HttpError(400, "Échelle invalide : indiquez un minimum et un maximum entiers cohérents (ex. 1,10).");
                }
                optionsReponse = `${min},${max}`;
            }
            else {
                optionsReponse = '1,5';
            }
        }
        else {
            optionsReponse = null;
        }
    }
    return context.entities.Critere.update({
        where: { id: idCritere },
        data: {
            ...(libelle !== undefined ? { libelle_critere: libelle } : {}),
            ...(description !== undefined ? { description: description || null } : {}),
            ...(typeReponse !== undefined ? { type_reponse: typeReponse } : {}),
            ...(optionsReponse !== undefined ? { options_reponse: optionsReponse } : {}),
            ...(args.obligatoire !== undefined ? { obligatoire: args.obligatoire } : {}),
        },
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
export const moveCritereToService = async (args, context) => {
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
export const removeCritereFromService = async (args, context) => {
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
        const parService = new Map();
        for (const r of rattachements) {
            if (r.id_critere === idCritere)
                continue;
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
export const deleteCritere = async (args, context) => {
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
        throw new HttpError(409, `Ce critère a déjà reçu ${nbReponses} réponse${nbReponses > 1 ? 's' : ''} de clients : le supprimer effacerait cet historique. Désactivez-le plutôt (interrupteur) pour qu'il n'apparaisse plus sans perdre les avis déjà collectés.`);
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
export const duplicateCritere = async (args, context) => {
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
    const idsAgencesDuTenant = new Set(agencesDuTenant.map((a) => a.id));
    const servicesDuTenant = await context.entities.Service.findMany({
        where: {
            OR: [
                { id_entreprise: null },
                { id_entreprise: context.user.id_entreprise },
            ],
        },
        select: { id: true },
    });
    const idsServicesDuTenant = new Set(servicesDuTenant.map((s) => s.id));
    const [agenceLiens, serviceLiens] = await Promise.all([
        context.entities.AgenceCritere.findMany({ where: { id_critere: idCritere } }),
        context.entities.CritereService.findMany({ where: { id_critere: idCritere } }),
    ]);
    const agenceLiensPropres = agenceLiens.filter((lien) => idsAgencesDuTenant.has(lien.id_agence));
    const serviceLiensPropres = serviceLiens.filter((lien) => idsServicesDuTenant.has(lien.id_service));
    const libelleCopie = `${original.libelle_critere} (copie)`.slice(0, 300);
    const copie = await prisma.$transaction(async (tx) => {
        const created = await tx.critere.create({
            data: {
                libelle_critere: libelleCopie,
                description: original.description,
                type_reponse: original.type_reponse,
                options_reponse: original.options_reponse,
                obligatoire: original.obligatoire,
                // La copie devient toujours un critère propre à l'entreprise qui
                // duplique (même si l'original était un critère socle partagé) :
                // c'est ce qui permet de l'adapter librement sans affecter les
                // autres entreprises.
                id_entreprise: context.user.id_entreprise,
            },
        });
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
export const reorderCriteresInService = async (args, context) => {
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
    await prisma.$transaction(orderedIds.map((idCritere, index) => prisma.critereService.updateMany({
        where: { id_critere: idCritere, id_service: idService },
        data: { ordre: index },
    })));
    return { success: true };
};
// ============================================================================
// OBJECTIFS DE SATISFACTION (Module 1 — Planification)
// ============================================================================
export const upsertObjectif = async (args, context) => {
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
export const createTacheCorrective = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    if (!args.titre?.trim())
        throw new HttpError(400, 'Le titre de la tâche est requis.');
    // Faille corrigée : l'alerte ciblée n'était jamais vérifiée — un
    // CHEF_AGENCE pouvait créer une tâche corrective sur une alerte d'une
    // AUTRE agence.
    const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, BigInt(args.id_alerte));
    await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');
    const responsable = await context.entities.User.findUnique({ where: { id: args.id_responsable } });
    if (!responsable)
        throw new HttpError(404, 'Responsable introuvable.');
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
            commentaire: `Tâche créée par ${context.user.email || context.user.id}`,
            id_auteur: context.user.id,
        },
    });
    return tache;
};
export const updateStatutTache = async (args, context) => {
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
    if (!tache)
        throw new HttpError(404, 'Tâche introuvable.');
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
    if (!idAgenceTache)
        throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
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
export const marquerAlerteTraitee = async (args, context) => {
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
export const deleteObjectif = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    const objectif = await context.entities.Objectif.findUnique({
        where: { id: args.id },
    });
    if (!objectif)
        throw new HttpError(404, 'Objectif introuvable.');
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
export const archiverAlerte = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    const idAlerte = BigInt(args.id_alerte);
    const idAgenceAlerte = await resolveAlerteAgenceId(context.entities, idAlerte);
    await assertAgenceAccess(context, context.entities, idAgenceAlerte, 'alerte');
    const alerte = await context.entities.Alerte.findUnique({ where: { id: idAlerte } });
    if (!alerte)
        throw new HttpError(404, 'Alerte introuvable.');
    if (alerte.statut_alerte !== 'TRAITEE') {
        throw new HttpError(409, "Cette alerte doit d'abord être traitée avant de pouvoir être archivée.");
    }
    return context.entities.Alerte.update({
        where: { id: idAlerte },
        data: { archive: true, date_archivage: new Date() },
    });
};
export const desarchiverAlerte = async (args, context) => {
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
export const archiverTache = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const idTache = BigInt(args.id_tache);
    const tache = await context.entities.TacheCorrective.findUnique({
        where: { id: idTache },
        include: { alerte: { include: { guichet: true, reponse: true } } },
    });
    if (!tache)
        throw new HttpError(404, 'Tâche introuvable.');
    if (tache.id_responsable !== context.user.id) {
        requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    }
    const idAgenceTache = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
    if (!idAgenceTache)
        throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
    await assertAgenceAccess(context, context.entities, idAgenceTache, 'tâche corrective');
    if (tache.statut_tache !== 'TERMINEE') {
        throw new HttpError(409, "Cette tâche doit d'abord être terminée avant de pouvoir être archivée.");
    }
    return context.entities.TacheCorrective.update({
        where: { id: idTache },
        data: { archive: true, date_archivage: new Date() },
    });
};
export const desarchiverTache = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    const idTache = BigInt(args.id_tache);
    const tache = await context.entities.TacheCorrective.findUnique({
        where: { id: idTache },
        include: { alerte: { include: { guichet: true, reponse: true } } },
    });
    if (!tache)
        throw new HttpError(404, 'Tâche introuvable.');
    if (tache.id_responsable !== context.user.id) {
        requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
    }
    const idAgenceTache = tache.alerte?.guichet?.id_agence ?? tache.alerte?.reponse?.id_agence;
    if (!idAgenceTache)
        throw new HttpError(400, "Impossible de déterminer l'agence de cette tâche.");
    await assertAgenceAccess(context, context.entities, idAgenceTache, 'tâche corrective');
    return context.entities.TacheCorrective.update({
        where: { id: idTache },
        data: { archive: false, date_archivage: null },
    });
};
export const archiverCritere = async (args, context) => {
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
export const desarchiverCritere = async (args, context) => {
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
