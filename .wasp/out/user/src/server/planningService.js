// src/server/planningService.ts
// ============================================================================
// Logique métier du planning — partagée entre actions (manuel) et jobs.
// ============================================================================
// A. Semaine type (ModeleHoraire) → génération d'AffectationGuichet.
// B. Reconduction 1-clic (hier / même jour semaine dernière).
// C. Suggestion auto (heuristique explicable : même jour semaine dernière,
//    agents indisponibles remplacés par les moins chargés).
//
// Règle d'or : on ne crée JAMAIS une affectation invalide — chaque ligne
// est revalidée (guichet actif, agent AGENT actif de l'agence, pas de
// chevauchement). Ce qui ne passe pas est compté en `ignores` avec la
// raison, jamais créé en silence : c'est ça qui élimine les signalements
// bizarres (avis attribués à un agent absent, alertes sur guichet fermé).
// ============================================================================
import { HttpError } from 'wasp/server';
/** Chevauchement de créneaux "HH:MM" (comparaison alphabétique valide). */
function chevauche(d1, f1, d2, f2) {
    return d1 < f2 && f1 > d2;
}
function jourSemaineUTC(dateStr) {
    return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay(); // 0 dim … 6 sam
}
function ajouterJours(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
/**
 * Revalide une ligne de planning avant création : guichet existant/actif/
 * non archivé, agent AGENT + actif + même agence, pas de chevauchement ce
 * jour-là pour cet agent. Lève HttpError si invalide.
 */
async function validerLigne(entities, idAgence, idGuichet, idAgent, dateStr, heureDebut, heureFin, exclureAffectationId) {
    if (!heureDebut || !heureFin || heureFin <= heureDebut) {
        throw new HttpError(400, "L'heure de fin doit être postérieure à l'heure de début.");
    }
    const guichet = await entities.Guichet.findUnique({ where: { id: idGuichet } });
    if (!guichet || guichet.id_agence !== idAgence) {
        throw new HttpError(400, 'Guichet introuvable dans cette agence.');
    }
    if (!guichet.actif || guichet.archive) {
        throw new HttpError(400, `Le guichet « ${guichet.nom_guichet} » est fermé ou archivé.`);
    }
    const agent = await entities.User.findUnique({ where: { id: idAgent } });
    if (!agent || agent.role !== 'AGENT' || agent.actif !== true || agent.id_agence !== idAgence) {
        throw new HttpError(400, "L'agent n'est plus disponible (désactivé, déplacé ou rôle modifié).");
    }
    const conflit = await entities.AffectationGuichet.findFirst({
        where: {
            id_agent: idAgent,
            date_affectation: new Date(dateStr),
            ...(exclureAffectationId ? { id: { not: exclureAffectationId } } : {}),
            heure_debut: { lt: heureFin },
            heure_fin: { gt: heureDebut },
        },
        include: { guichet: { select: { nom_guichet: true } } },
    });
    if (conflit) {
        throw new HttpError(409, `Déjà planifié sur « ${conflit.guichet?.nom_guichet || 'un autre guichet'} » (${conflit.heure_debut}–${conflit.heure_fin}).`);
    }
    return {
        nomGuichet: guichet.nom_guichet,
        nomAgent: `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'Agent',
    };
}
/** Crée les lignes valides, comptabilise les refusées avec leur raison. */
async function creerLignes(entities, idAgence, dateStr, lignes) {
    const resultat = { crees: 0, ignores: [] };
    for (const l of lignes) {
        try {
            await validerLigne(entities, idAgence, l.id_guichet, l.id_agent, dateStr, l.heure_debut, l.heure_fin);
            await entities.AffectationGuichet.create({
                data: {
                    date_affectation: new Date(dateStr),
                    heure_debut: l.heure_debut,
                    heure_fin: l.heure_fin,
                    id_guichet: l.id_guichet,
                    id_agent: l.id_agent,
                },
            });
            resultat.crees++;
        }
        catch (err) {
            resultat.ignores.push({
                guichet: `guichet #${l.id_guichet}`,
                agent: `agent ${String(l.id_agent).slice(0, 8)}…`,
                raison: err?.message || 'Ligne invalide.',
            });
        }
    }
    return resultat;
}
// ── A. Génération depuis la semaine type ──────────────────────────────
export async function genererDepuisModeles(entities, idAgence, dateDebut, dateFin) {
    const total = { crees: 0, ignores: [], jours: 0 };
    let curseur = dateDebut;
    let garde = 0;
    while (curseur <= dateFin && garde < 45) {
        garde++;
        const jour = jourSemaineUTC(curseur);
        const modeles = await entities.ModeleHoraire.findMany({
            where: { id_agence: idAgence, jour_semaine: jour },
        });
        if (modeles.length > 0) {
            total.jours++;
            const res = await creerLignes(entities, idAgence, curseur, modeles.map((m) => ({
                id_guichet: m.id_guichet,
                id_agent: m.id_agent,
                heure_debut: m.heure_debut,
                heure_fin: m.heure_fin,
            })));
            total.crees += res.crees;
            total.ignores.push(...res.ignores);
        }
        curseur = ajouterJours(curseur, 1);
    }
    return total;
}
// ── B. Reconduction d'une journée existante ───────────────────────────
export async function reconduireJournee(entities, idAgence, dateSource, dateCible) {
    if (dateSource === dateCible) {
        throw new HttpError(400, 'La date source et la date cible doivent être différentes.');
    }
    const existantes = await entities.AffectationGuichet.findMany({
        where: {
            date_affectation: new Date(dateSource),
            guichet: { id_agence: idAgence },
        },
    });
    if (existantes.length === 0) {
        throw new HttpError(404, 'Aucune affectation à reconduire à la date source.');
    }
    return creerLignes(entities, idAgence, dateCible, existantes.map((a) => ({
        id_guichet: a.id_guichet,
        id_agent: a.id_agent,
        heure_debut: a.heure_debut,
        heure_fin: a.heure_fin,
    })));
}
export async function suggererJournee(entities, idAgence, dateCible) {
    const memeJourSemaineDerniere = ajouterJours(dateCible, -7);
    const veille = ajouterJours(dateCible, -1);
    const charger = (dateStr) => entities.AffectationGuichet.findMany({
        where: { date_affectation: new Date(dateStr), guichet: { id_agence: idAgence } },
        include: {
            guichet: { select: { id: true, nom_guichet: true, actif: true, archive: true } },
            agent: { select: { id: true, nom: true, prenom: true, role: true, actif: true, id_agence: true } },
        },
    });
    let source = memeJourSemaineDerniere;
    let lignes = await charger(source);
    if (lignes.length === 0) {
        source = veille;
        lignes = await charger(source);
    }
    if (lignes.length === 0) {
        // Dernier recours : la semaine type du jour visé.
        const jour = jourSemaineUTC(dateCible);
        const modeles = await entities.ModeleHoraire.findMany({
            where: { id_agence: idAgence, jour_semaine: jour },
            include: {
                guichet: { select: { id: true, nom_guichet: true, actif: true, archive: true } },
                agent: { select: { id: true, nom: true, prenom: true, role: true, actif: true, id_agence: true } },
            },
        });
        if (modeles.length === 0)
            return { source: null, propositions: [] };
        source = `semaine type (jour ${jour})`;
        lignes = modeles.map((m) => ({
            id_guichet: m.id_guichet,
            id_agent: m.id_agent,
            heure_debut: m.heure_debut,
            heure_fin: m.heure_fin,
            guichet: m.guichet,
            agent: m.agent,
        }));
    }
    // Charge existante le jour cible (pour équilibrer les remplacements).
    const dejaPrevus = await entities.AffectationGuichet.findMany({
        where: { date_affectation: new Date(dateCible), guichet: { id_agence: idAgence } },
        select: { id_agent: true, heure_debut: true, heure_fin: true },
    });
    const chargeParAgent = new Map();
    for (const d of dejaPrevus)
        chargeParAgent.set(d.id_agent, (chargeParAgent.get(d.id_agent) || 0) + 1);
    const agentsActifs = await entities.User.findMany({
        where: { id_agence: idAgence, role: 'AGENT', actif: true },
        select: { id: true, nom: true, prenom: true },
    });
    const propositions = [];
    for (const l of lignes) {
        const agentOk = l.agent && l.agent.role === 'AGENT' && l.agent.actif === true && l.agent.id_agence === idAgence;
        const guichetOk = l.guichet && l.guichet.actif === true && l.guichet.archive !== true;
        if (!guichetOk)
            continue; // guichet fermé : on ne propose rien dessus
        if (agentOk) {
            // Conflit avec ce qui est déjà prévu ce jour-là ? → on signale.
            const conflit = dejaPrevus.some((d) => d.id_agent === l.id_agent && chevauche(d.heure_debut, d.heure_fin, l.heure_debut, l.heure_fin));
            propositions.push({
                id_guichet: l.id_guichet,
                nom_guichet: l.guichet.nom_guichet,
                id_agent: l.id_agent,
                nom_agent: `${l.agent.prenom || ''} ${l.agent.nom || ''}`.trim(),
                heure_debut: l.heure_debut,
                heure_fin: l.heure_fin,
                raison: conflit ? 'Reprise — attention : chevauchement possible avec le prévu.' : 'Reprise à l’identique.',
            });
            continue;
        }
        // Agent indisponible → remplaçant le moins chargé et sans chevauchement.
        const candidats = agentsActifs
            .map((a) => ({
            id: a.id,
            nom: a.nom,
            prenom: a.prenom,
            charge: chargeParAgent.get(a.id) || 0,
        }))
            .sort((x, y) => x.charge - y.charge)
            .filter((a) => !dejaPrevus.some((d) => d.id_agent === a.id && chevauche(d.heure_debut, d.heure_fin, l.heure_debut, l.heure_fin)));
        if (candidats.length === 0)
            continue;
        const remplacant = candidats[0];
        chargeParAgent.set(remplacant.id, (chargeParAgent.get(remplacant.id) || 0) + 1);
        propositions.push({
            id_guichet: l.id_guichet,
            nom_guichet: l.guichet.nom_guichet,
            id_agent: remplacant.id,
            nom_agent: `${remplacant.prenom || ''} ${remplacant.nom || ''}`.trim(),
            heure_debut: l.heure_debut,
            heure_fin: l.heure_fin,
            raison: 'Remplaçant proposé (agent habituel indisponible).',
        });
    }
    return { source, propositions };
}
/** Applique des propositions (suggestion validée par le chef) : revalide tout. */
export async function appliquerPropositions(entities, idAgence, dateCible, lignes) {
    return creerLignes(entities, idAgence, dateCible, lignes);
}
