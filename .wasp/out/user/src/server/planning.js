// src/server/planning.ts
// ============================================================================
// Semaine type + reconduction + suggestion — queries & actions Wasp.
// ============================================================================
// - getModelesHoraires : grille hebdo d'une agence (CHEF_AGENCE de l'agence,
//   DIRECTION de l'entreprise).
// - upsertModeleHoraire / deleteModeleHoraire : édition de la grille.
// - genererPlanning : crée les AffectationGuichet d'une période depuis la
//   grille (bouton manuel + job quotidien).
// - reconduirePlanning : copie une journée existante vers une date cible.
// - suggererPlanning (lecture seule) + appliquerSuggestion (écriture).
// ============================================================================
import { HttpError } from 'wasp/server';
import { requireAuth, requireRole, assertEntrepriseActive, assertAgenceAccess, } from './middleware/rowLevelSecurity';
import { genererDepuisModeles, reconduireJournee, suggererJournee, appliquerPropositions, } from './planningService';
const HEURE_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function exigerRoleGestion(context) {
    requireRole(context, ['DIRECTION', 'CHEF_AGENCE']);
}
function exigerJour(val) {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > 6) {
        throw new HttpError(400, 'Jour de semaine invalide (0 = dimanche … 6 = samedi).');
    }
    return n;
}
function exigerHeures(debut, fin) {
    if (typeof debut !== 'string' || typeof fin !== 'string' || !HEURE_RE.test(debut) || !HEURE_RE.test(fin)) {
        throw new HttpError(400, 'Heures invalides (format HH:MM attendu).');
    }
    if (fin <= debut)
        throw new HttpError(400, "L'heure de fin doit être postérieure à l'heure de début.");
}
// ── Lecture de la grille ─────────────────────────────────────────────
export const getModelesHoraires = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    if (!args?.id_agence)
        throw new HttpError(400, 'Agence requise.');
    await assertAgenceAccess(context, context.entities, Number(args.id_agence), 'agence');
    return context.entities.ModeleHoraire.findMany({
        where: { id_agence: Number(args.id_agence) },
        include: {
            guichet: { select: { id: true, nom_guichet: true, actif: true, archive: true } },
            agent: { select: { id: true, nom: true, prenom: true, actif: true } },
        },
        orderBy: [{ jour_semaine: 'asc' }, { heure_debut: 'asc' }],
    });
};
// ── Édition de la grille ─────────────────────────────────────────────
export const upsertModeleHoraire = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    exigerRoleGestion(context);
    if (!args?.id_agence || !args?.id_guichet || !args?.id_agent) {
        throw new HttpError(400, 'Agence, guichet et agent sont requis.');
    }
    const idAgence = Number(args.id_agence);
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    const jour = exigerJour(args.jour_semaine);
    exigerHeures(args.heure_debut, args.heure_fin);
    const guichet = await context.entities.Guichet.findUnique({ where: { id: Number(args.id_guichet) } });
    if (!guichet || guichet.id_agence !== idAgence) {
        throw new HttpError(400, 'Guichet introuvable dans cette agence.');
    }
    const agent = await context.entities.User.findUnique({ where: { id: String(args.id_agent) } });
    if (!agent || agent.role !== 'AGENT' || agent.id_agence !== idAgence) {
        throw new HttpError(400, "L'agent doit appartenir à cette agence (rôle AGENT).");
    }
    // Chevauchement dans la grille : même agent, même jour.
    const conflit = await context.entities.ModeleHoraire.findFirst({
        where: {
            id_agence: idAgence,
            jour_semaine: jour,
            id_agent: String(args.id_agent),
            ...(args.id ? { id: { not: Number(args.id) } } : {}),
            heure_debut: { lt: args.heure_fin },
            heure_fin: { gt: args.heure_debut },
        },
    });
    if (conflit) {
        throw new HttpError(409, `Cet agent est déjà prévu ce jour-là (${conflit.heure_debut}–${conflit.heure_fin}).`);
    }
    if (args.id) {
        const existant = await context.entities.ModeleHoraire.findUnique({ where: { id: Number(args.id) } });
        if (!existant || existant.id_agence !== idAgence) {
            throw new HttpError(404, 'Ligne de semaine type introuvable.');
        }
        return context.entities.ModeleHoraire.update({
            where: { id: Number(args.id) },
            data: {
                jour_semaine: jour,
                heure_debut: args.heure_debut,
                heure_fin: args.heure_fin,
                id_guichet: Number(args.id_guichet),
                id_agent: String(args.id_agent),
            },
        });
    }
    return context.entities.ModeleHoraire.create({
        data: {
            id_agence: idAgence,
            jour_semaine: jour,
            heure_debut: args.heure_debut,
            heure_fin: args.heure_fin,
            id_guichet: Number(args.id_guichet),
            id_agent: String(args.id_agent),
        },
    });
};
export const deleteModeleHoraire = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    exigerRoleGestion(context);
    if (!args?.id)
        throw new HttpError(400, 'Identifiant requis.');
    const existant = await context.entities.ModeleHoraire.findUnique({ where: { id: Number(args.id) } });
    if (!existant)
        throw new HttpError(404, 'Ligne de semaine type introuvable.');
    await assertAgenceAccess(context, context.entities, existant.id_agence, 'agence');
    await context.entities.ModeleHoraire.delete({ where: { id: Number(args.id) } });
    return { ok: true };
};
// ── Génération / reconduction / suggestion ───────────────────────────
export const genererPlanning = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    exigerRoleGestion(context);
    if (!args?.id_agence || !args?.date_debut || !args?.date_fin) {
        throw new HttpError(400, 'Agence et période requises.');
    }
    if (args.date_fin < args.date_debut) {
        throw new HttpError(400, 'La date de fin doit suivre la date de début.');
    }
    const idAgence = Number(args.id_agence);
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    return genererDepuisModeles(context.entities, idAgence, args.date_debut, args.date_fin);
};
export const reconduirePlanning = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    exigerRoleGestion(context);
    if (!args?.id_agence || !args?.date_source || !args?.date_cible) {
        throw new HttpError(400, 'Agence, date source et date cible requises.');
    }
    const idAgence = Number(args.id_agence);
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    return reconduireJournee(context.entities, idAgence, args.date_source, args.date_cible);
};
export const suggererPlanning = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    if (!args?.id_agence || !args?.date)
        throw new HttpError(400, 'Agence et date requises.');
    const idAgence = Number(args.id_agence);
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    return suggererJournee(context.entities, idAgence, args.date);
};
export const appliquerSuggestion = async (args, context) => {
    requireAuth(context);
    await assertEntrepriseActive(context, context.entities);
    exigerRoleGestion(context);
    if (!args?.id_agence || !args?.date || !Array.isArray(args?.lignes) || args.lignes.length === 0) {
        throw new HttpError(400, 'Agence, date et lignes à appliquer requises.');
    }
    const idAgence = Number(args.id_agence);
    await assertAgenceAccess(context, context.entities, idAgence, 'agence');
    return appliquerPropositions(context.entities, idAgence, args.date, args.lignes);
};
