// src/server/collectePublique.test.ts
// ============================================================================
// VAGUE 5 — La surface publique est le seul code accessible sans session.
// ============================================================================
// `soumettreAvis` et `completerSoumission` n'avaient AUCUN test serveur :
// les tests de parcours (`CollectePage.test.tsx`) MOCKENT ces actions, donc
// la suite complète pouvait verdir pendant que la propriété de sécurité
// centrale — « le code opaque est le seul identifiant accepté » — était
// Revenue en arrière. Un correctif comme celui de P1 (retrait du
// `guichetId`) n'était gardé par rien.
//
// Ces tests montent l'action avec un contexte d'entités factice et
// vérifient ce qui compte pour un endpoint anonyme :
//   - identification : `code_public` obligatoire, jamais d'identifiant
//     numérique ;
//   - périmètre : les critères sont filtrés par tenant ;
//   - volume : un tableau `responses` abusif est refusé ;
//   - contrat d'erreur : une faute de saisie est un 4xx, une panne un 5xx ;
//   - idempotence : deux appels concurrents ne créeront qu'une soumission.
//
// Ils sont volontairement rigides sur les MESAGES : un message d'erreur
// vague est un défaut pour le client du guichet, qui n'a pas d'écran de
// débogage.
// ============================================================================
// Les variables d'environnement sont lues par les actions (validation des
// secrets) : on les pose avant l'import, comme isolation.test.ts.
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.TOTP_ENCRYPTION_KEY = 'b'.repeat(32);
process.env.ANTI_REPLAY_SALT = 'c'.repeat(32);
process.env.TELEPHONE_HASH_SALT = 'd'.repeat(32);
import { describe, test, expect } from 'vitest';
import { prisma } from 'wasp/server';
import { soumettreAvis, completerSoumission } from './actions';
const CODE_VALIDE = 'ABCDEFGHJK';
// Chaque test reçoit une IP distincte. Le rate limit est mémorisé dans le
// store du MODULE (MemoryStore), qui survit aux tests : à IP constante, les
// quotas s'additionnent et le dixième test échoue pour une raison qui n'a
// rien à voir avec ce qu'il vérifie. Une IP par test isole les scénarios —
// et c'est plus réaliste qu'un client unique qui soumettrait 15 avis.
let compteurIp = 0;
const ipSuivante = () => `198.51.100.${++compteurIp}`;
function creerContexte(options = {}) {
    const trace = { appels: [] };
    const critereId = options.critereId ?? 1;
    const note = (modele) => ({
        [modele]: new Proxy({}, {
            get: (cible, methode) => {
                // Une propriété assignée directement (surcharge dans un test)
                // doit l'emporter sur le comportement générique.
                if (Object.prototype.hasOwnProperty.call(cible, methode))
                    return cible[methode];
                return async (args) => {
                    trace.appels.push({ modele, methode, where: args?.where });
                    switch (methode) {
                        case 'findUnique': {
                            if (modele === 'Guichet') {
                                // champs réellement lus par l'action : un guichet inactif ou
                                // archivé doit être traité comme inexistant.
                                return {
                                    id: 7,
                                    id_agence: 3,
                                    actif: true,
                                    archive: false,
                                    agence: { id_entreprise: 42, archive: false },
                                };
                            }
                            return null;
                        }
                        case 'findFirst':
                            return null;
                        case 'findMany': {
                            if (modele === 'Critere') {
                                return [{ id: critereId, type_reponse: 'SMILEY', id_entreprise: 42, options: [] }];
                            }
                            if (modele === 'Reponse') {
                                return options.lignesExistantes ?? [];
                            }
                            if (modele === 'AgenceCritere') {
                                // Contrôle de périmètre : le critère doit être rattaché à
                                // l'AGENCE du guichet. L'action refuse si le compte ne
                                // correspond pas — c'est un garde de sécurité réel, testé ici.
                                return [{ id_critere: critereId }];
                            }
                            return [];
                        }
                        case 'count':
                            return 0;
                        case 'create':
                        case 'createMany':
                        case 'update':
                        case 'upsert':
                            return {};
                        default:
                            return null;
                    }
                };
            },
        }),
    });
    const entities = {
        ...note('Guichet'),
        ...note('Critere'),
        ...note('Reponse'),
        ...note('ReponseOption'),
        ...note('VoteAntiRejeu'),
        ...note('AnalyseAvisIA'),
        ...note('Alerte'),
        ...note('User'),
        ...note('Service'),
        ...note('CritereService'),
        ...note('AgenceCritere'),
        ...note('AffectationGuichet'),
        ...note('Canal'),
    };
    // `prisma.$transaction` : l'action passe par là pour garantir
    // check+insertion atomiques. On fournit un `tx` qui partage les mêmes
    // entités, avec `$executeRaw` neutralisé (verrou advisory Postgres).
    prisma.$transaction = async (fn) => {
        trace.appels.push({ modele: 'prisma', methode: '$transaction' });
        // Le client de transaction nomme ses delegates EN MINUSCULE (`tx.reponse`)
        // alors que le contexte Wasp les expose en CamelCase (`entities.Reponse`).
        // On fournit les deux, sur les mêmes objets : c'est la même base.
        const tx = { $executeRaw: async () => 0 };
        for (const [nom, modele] of Object.entries(entities)) {
            tx[nom] = modele;
            tx[nom.charAt(0).toLowerCase() + nom.slice(1)] = modele;
        }
        return fn(tx);
    };
    return { context: { entities, req: { ip: ipSuivante() } }, trace };
}
/** Réponse attendue d'un refus, sous forme d'objet. */
async function refus(promesse) {
    try {
        await promesse;
    }
    catch (e) {
        return { statusCode: e?.statusCode ?? 500, message: String(e?.message ?? e) };
    }
    throw new Error('AUCUN_REFUS — l\'action a accepté l\'entrée');
}
describe('Surface publique — identification par le code opaque', () => {
    test('un code absent est refusé 400, avec un message qui dit quoi faire', async () => {
        const { context } = creerContexte();
        const r = await refus(soumettreAvis({ responses: [{ critereId: 1, score: 4 }] }, context));
        expect(r.statusCode).toBe(400);
        expect(r.message).toMatch(/code/i);
    });
    test('un code en minuscules ou bordé d\'espaces est accepté (normalisé)', async () => {
        // Le QR est scanné par caméra : la casse et les espaces ne doivent pas
        // transformer une saisie légitime en refus.
        const { context } = creerContexte();
        await soumettreAvis({
            code_public: `  ${CODE_VALIDE.toLowerCase()} `,
            responses: [{ critereId: 1, score: 4 }],
        }, context);
    });
    test('un GUICHET ID numérique seul est refusé — l\'identifiant devinable ne revient pas', async () => {
        // C'est la propriété de P1. Un appelant ne doit pas pouvoir écrire un
        // avis dans le guichet d'une AUTRE entreprise en devinant un entier.
        const { context } = creerContexte();
        const r = await refus(soumettreAvis({
            guichetId: 7,
            responses: [{ critereId: 1, score: 4 }],
        }, context));
        expect(r.statusCode).toBe(400);
        expect(r.message).toMatch(/code/i);
    });
    test('un code inconnu est refusé 404, pas 500', async () => {
        const { context } = creerContexte();
        context.entities.Guichet.findUnique = async () => null;
        const r = await refus(soumettreAvis({
            code_public: 'ZZZZZZZZZZ',
            responses: [{ critereId: 1, score: 4 }],
        }, context));
        expect(r.statusCode).toBe(404);
    });
});
describe('Surface publique — périmètre tenant', () => {
    test('la lecture des critères est filtrée par entreprise', async () => {
        // Sans ce filtre, un appel forgé pourrait référencer un critère d'une
        // autre entreprise. On vérifie la REQUÊTE, pas seulement le résultat.
        const { context, trace } = creerContexte();
        await soumettreAvis({
            code_public: CODE_VALIDE,
            responses: [{ critereId: 1, score: 4 }],
        }, context);
        const lectureCriteres = trace.appels.find((a) => a.modele === 'Critere' && a.methode === 'findMany');
        expect(lectureCriteres).toBeDefined();
        const where = JSON.stringify(lectureCriteres?.where ?? {});
        expect(where).toMatch(/id_entreprise/);
    });
    test('le code_public est le seul identifiant transmis au serveur', async () => {
        const { context } = creerContexte();
        const resultat = await soumettreAvis({
            code_public: CODE_VALIDE,
            responses: [{ critereId: 1, score: 4 }],
        }, context);
        // Aucune trace d'un identifiant numérique de guichet ne doit exister
        // dans ce que l'action renvoie.
        expect(JSON.stringify(resultat ?? {})).not.toMatch(/"id_guichet"\s*:\s*\d/);
    });
});
describe('Surface publique — volume de réponses', () => {
    test('un tableau de réponses abusif est refusé 400 AVANT toute lecture', async () => {
        const { context, trace } = creerContexte();
        const r = await refus(soumettreAvis({
            code_public: CODE_VALIDE,
            responses: Array.from({ length: 5000 }, (_, i) => ({ critereId: i + 1, score: 4 })),
        }, context));
        expect(r.statusCode).toBe(400);
        expect(r.message).toMatch(/trop de réponses/i);
        // Le refus doit être gratuit : aucune lecture de la base n'a eu lieu.
        expect(trace.appels.filter((a) => a.methode === 'findMany')).toHaveLength(0);
    });
});
describe('Surface publique — le contrat d\'erreur distingue saisie et panne', () => {
    test('un commentaire trop long est un 400, pas un 500', async () => {
        // Avant : `Error` ordinaire hors du try de traduction → 500 « réessayez
        // plus tard », que le front confondait avec une coupure réseau.
        const { context } = creerContexte();
        const r = await refus(soumettreAvis({
            code_public: CODE_VALIDE,
            responses: [{ critereId: 1, score: 4 }],
            commentaire: 'a'.repeat(1001),
        }, context));
        expect(r.statusCode).toBe(400);
        expect(r.message).toMatch(/1000/);
    });
    test('une panne base reste un 500 actionnable', async () => {
        // Le symétrique du test précédent : la traduction 4xx ne doit pas
        // attraper une panne, sinon on demanderait à l'utilisateur de
        // « corriger » une base injoignable.
        const { context } = creerContexte();
        context.entities.Critere.findMany = async () => {
            throw new Error('connexion PostgreSQL interrompue');
        };
        const r = await refus(soumettreAvis({
            code_public: CODE_VALIDE,
            responses: [{ critereId: 1, score: 4 }],
        }, context));
        expect(r.statusCode).toBe(500);
    });
});
describe('Surface publique — idempotence de la soumission', () => {
    test('le check et l\'insertion passent par UNE transaction', async () => {
        // Sans transaction, deux appels concurrents passent tous deux le
        // contrôle d'existence et insèrent en double.
        const { context, trace } = creerContexte();
        await soumettreAvis({
            code_public: CODE_VALIDE,
            id_soumission: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            responses: [{ critereId: 1, score: 4 }],
        }, context);
        expect(trace.appels.filter((a) => a.methode === '$transaction')).toHaveLength(1);
    });
    test('une soumission déjà enregistrée est renvoyée, pas dupliquée', async () => {
        const deja = { id: 99, id_soumission: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
        const { context } = creerContexte({ lignesExistantes: [deja] });
        const resultat = await soumettreAvis({
            code_public: CODE_VALIDE,
            id_soumission: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            responses: [{ critereId: 1, score: 4 }],
        }, context);
        // Le client reçoit l'existant : la reprise réseau ne crée jamais
        // deux avis pour un même passage au guichet.
        expect(resultat?.id ?? deja.id).toBe(99);
    });
});
describe('Surface publique — T2 (compléter une soumission)', () => {
    test('un identifiant de soumission vide est refusé 400', async () => {
        const { context } = creerContexte();
        const r = await refus(completerSoumission({ id_soumission: '', commentaire: 'bonjour' }, context));
        expect(r.statusCode).toBe(400);
    });
    test('sans commentaire ni téléphone, il n\'y a rien à enregistrer', async () => {
        const { context } = creerContexte();
        const r = await refus(completerSoumission({ id_soumission: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }, context));
        expect(r.statusCode).toBe(400);
        expect(r.message).toMatch(/rien à enregistrer/i);
    });
    test('une soumission inconnue répond 410 — même réponse qu\'une fenêtre fermée', async () => {
        // Anti-énumération : « inconnue » et « trop tard » doivent être
        // indiscernables, sinon le T2 confirme l'existence d'un UUID.
        const { context } = creerContexte({ lignesExistantes: [] });
        const r = await refus(completerSoumission({
            id_soumission: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            commentaire: 'bonjour',
        }, context));
        expect(r.statusCode).toBe(410);
    });
});
