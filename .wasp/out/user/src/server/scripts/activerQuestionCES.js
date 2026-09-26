// src/server/scripts/activerQuestionCES.ts
// ============================================================================
// Active une question d'effort (CES) de démonstration — vague 1, Phase O.
//
// POURQUOI UN SCRIPT ET PAS LE SEED : le CES n'est utile que si le
// questionnaire de l'entreprise l'utilise. Plutôt que d'imposer cette
// question à tout le monde (seed), on fournit un outil opt-in, rejouable et
// sans risque : il crée UNE question CES et l'active partout (agences +
// opérations) de l'entreprise visée.
//
// GARDE-FOUS :
// - idempotent : si un critère CES existe déjà pour l'entreprise, RIEN n'est
//   créé (relançable sans effet de bord) ;
// - pas de DELETE : si le critère existe mais est archivé, il est
//   simplement réactivé ;
// - échelle 1-7 + scoring_mode CES + orientation LOWER_BETTER : exactement ce
//   que le moteur et `createCritere` valident (le serveur est ici la seule
//   voie d'écriture, comme toujours dans ce projet) ;
// - non obligatoire : une question d'effort ne doit jamais bloquer la
//   collecte.
//
// Usage :
//   npx tsx src/server/scripts/activerQuestionCES.ts            // 1re entreprise ACTIVE
//   npx tsx src/server/scripts/activerQuestionCES.ts 42         // id_entreprise précis
// ============================================================================
import { PrismaClient } from '@prisma/client';
const LIBELLE = "L'opération a-t-elle été facile à réaliser ?";
const DESCRIPTION = "Effort perçu : 1 = très facile, 7 = très difficile. Une seule question, ~3 secondes.";
export async function activerQuestionCES(client, idEntreprise) {
    const entreprise = await client.entreprise.findFirst({
        where: idEntreprise ? { id: idEntreprise } : { status: 'ACTIVE' },
        orderBy: { id: 'asc' },
        select: { id: true, nom_entreprise: true, status: true },
    });
    if (!entreprise) {
        throw new Error('Aucune entreprise trouvée (créez-en une avant).');
    }
    // Idempotence : un seul critère CES par entreprise suffit.
    const existant = await client.critere.findFirst({
        where: { id_entreprise: entreprise.id, scoring_mode: 'CES' },
        orderBy: { id: 'desc' },
        select: { id: true, libelle_critere: true, archive: true },
    });
    // Un id est TOUJOURS connu ici : soit celui trouvé, soit celui créé.
    let critereId;
    let cree = false;
    let reactives = false;
    if (existant) {
        critereId = existant.id;
        if (existant.archive) {
            await client.critere.update({ where: { id: existant.id }, data: { archive: false } });
            reactives = true;
        }
    }
    else {
        const creee = await client.critere.create({
            data: {
                libelle_critere: LIBELLE,
                description: DESCRIPTION,
                type_reponse: 'ECHELLE',
                scoring_mode: 'CES',
                // LOWER_BETTER : imposé par la convention CES (1 = meilleure
                // expérience). Le moteur l'applique de toute façon côté scoring.
                orientation: 'LOWER_BETTER',
                options_reponse: '1,7',
                scores_reponse: null,
                // Facultative : une question d'effort ne bloque jamais la collecte.
                obligatoire: false,
                id_entreprise: entreprise.id,
            },
            select: { id: true },
        });
        critereId = creee.id;
        cree = true;
    }
    // Activation : toutes les agences actives de l'entreprise.
    const agences = await client.agence.findMany({
        where: { id_entreprise: entreprise.id, archive: false },
        select: { id: true },
    });
    let agencesLiees = 0;
    for (const a of agences) {
        const r = await client.agenceCritere.upsert({
            where: { id_agence_id_critere: { id_agence: a.id, id_critere: critereId } },
            update: {},
            create: { id_agence: a.id, id_critere: critereId },
        });
        if (r)
            agencesLiees += 1;
    }
    // Rattachement : première opération de chaque agence (ordre = fin de
    // paragraphe, pour ne pas doubler la question dans le parcours).
    const services = await client.service.findMany({
        where: { OR: [{ id_entreprise: entreprise.id }, { id_entreprise: null }] },
        orderBy: { id: 'asc' },
        select: { id: true, id_entreprise: true },
    });
    const servicesParEntreprise = services.filter((s) => s.id_entreprise === entreprise.id);
    const cibles = servicesParEntreprise.length > 0 ? servicesParEntreprise.slice(0, 1) : services.slice(0, 1);
    let servicesLies = 0;
    for (const s of cibles) {
        const ordre = await client.critereService.count({ where: { id_service: s.id } });
        await client.critereService.upsert({
            where: { id_critere_id_service: { id_critere: critereId, id_service: s.id } },
            update: {},
            create: { id_critere: critereId, id_service: s.id, ordre },
        });
        servicesLies += 1;
    }
    return {
        entreprise: entreprise.nom_entreprise,
        cree,
        reactives,
        critereId,
        agencesLiees,
        servicesLies,
        message: cree
            ? `Question CES créée et activée (${agencesLiees} agence(s), ${servicesLies} opération(s)).`
            : reactives
                ? `Question CES existante réactivée (${agencesLiees} agence(s) liées).`
                : `Une question CES existe déjà : aucune modification (relance sans effet).`,
    };
}
// Exécution directe (CLI) — importé comme module, rien ne s'exécute.
const lanceEnCLI = process.argv[1]?.endsWith('activerQuestionCES.ts') ?? false;
if (lanceEnCLI) {
    const prisma = new PrismaClient();
    const brut = process.argv[2];
    const id = brut ? Number(brut) : undefined;
    activerQuestionCES(prisma, Number.isInteger(id) ? id : undefined)
        .then((r) => {
        console.log(`[activerQuestionCES] ${r.message}`);
        console.log(`[activerQuestionCES] entreprise=${r.entreprise} critere_id=${r.critereId} ` +
            `agences=${r.agencesLiees} services=${r.servicesLies}`);
    })
        .catch((e) => {
        console.error('[activerQuestionCES] ÉCHEC :', e?.message ?? e);
        process.exitCode = 1;
    })
        .finally(() => {
        void prisma.$disconnect();
    });
}
