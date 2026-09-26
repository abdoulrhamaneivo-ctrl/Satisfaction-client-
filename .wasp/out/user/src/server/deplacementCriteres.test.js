// src/server/deplacementCriteres.test.ts
// ============================================================================
// DÉPLACEMENTS DE QUESTIONS (Kanban « Questions par opération ») —
// `moveCritereToService` et `removeCritereFromService`, sans base réelle.
//
// Un store en mémoire joue le rôle de `tx.critereService` : on affirme
// l'ÉTAT FINAL des lignes (rattachements + ordres), pas seulement que
// « ça n'a pas jeté ». C'est le seul moyen de prouver la réindexation
// (item 2 du plan 26/09) et la transactionnalité sans toucher à Neon.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { prisma } from 'wasp/server';
import { moveCritereToService, removeCritereFromService } from './actions';
function creerTx(seed) {
    const lignes = seed.map((l) => ({ ...l }));
    const ecritures = [];
    const tx = {
        critereService: {
            findMany: async (args) => {
                let rows = [...lignes];
                const w = args?.where ?? {};
                if (w.id_service !== undefined) {
                    if (typeof w.id_service === 'object' && w.id_service.not !== undefined) {
                        rows = rows.filter((r) => r.id_service !== w.id_service.not);
                    }
                    else if (typeof w.id_service === 'object' && Array.isArray(w.id_service.in)) {
                        rows = rows.filter((r) => w.id_service.in.includes(r.id_service));
                    }
                    else {
                        rows = rows.filter((r) => r.id_service === w.id_service);
                    }
                }
                if (w.id_critere !== undefined)
                    rows = rows.filter((r) => r.id_critere === w.id_critere);
                rows.sort((a, b) => (a.id_service - b.id_service) || (a.ordre - b.ordre));
                return rows.map((r) => ({ ...r }));
            },
            deleteMany: async (args) => {
                const w = args?.where ?? {};
                let supprimes = 0;
                for (let i = lignes.length - 1; i >= 0; i--) {
                    const correspondCritere = w.id_critere === undefined || lignes[i].id_critere === w.id_critere;
                    const correspondService = w.id_service === undefined
                        || (typeof w.id_service === 'object' && w.id_service.not !== undefined
                            ? lignes[i].id_service !== w.id_service.not
                            : lignes[i].id_service === w.id_service);
                    if (correspondCritere && correspondService) {
                        lignes.splice(i, 1);
                        supprimes++;
                    }
                }
                return { count: supprimes };
            },
            update: async (args) => {
                const r = lignes.find((x) => x.id === args.where.id);
                if (!r)
                    throw new Error('LIGNE_ABSENTE');
                r.ordre = args.data.ordre;
                ecritures.push(`update id=${r.id} ordre=${r.ordre}`);
                return { ...r };
            },
            upsert: async (args) => {
                const cle = args.where.id_critere_id_service;
                const ex = lignes.find((x) => x.id_critere === cle.id_critere && x.id_service === cle.id_service);
                if (ex) {
                    ex.ordre = args.update.ordre;
                }
                else {
                    lignes.push({ id: Math.max(0, ...lignes.map((x) => x.id)) + 1, ...args.create });
                }
                return {};
            },
        },
    };
    prisma.$transaction = async (fn) => fn(tx);
    return { tx, lignes, ecritures };
}
// Compte DIRECTION sans tenant : `assertEntrepriseActive` revient
// immédiatement, les `assert*Accessible` acceptent les lignes partagées
// (`id_entreprise: null`).
function contexteDirection() {
    return {
        user: { id: 1, role: 'DIRECTION', actif: true, id_entreprise: null },
        entities: {
            Critere: { findUnique: async () => ({ id: 11, id_entreprise: null }) },
            Service: { findUnique: async () => ({ id: 4, id_entreprise: null }) },
        },
    };
}
const parService = (lignes, idService) => lignes.filter((l) => l.id_service === idService).sort((a, b) => a.ordre - b.ordre);
describe('moveCritereToService — déplacement + réindexation', () => {
    test('déplacer la PREMIÈRE question : la source est réindexée sans trou', async () => {
        // Retrait : [11(o0), 12(o1)] · Depot : [4(o0)]. On déplace 11 → Depot.
        const { lignes, ecritures } = creerTx([
            { id: 1, id_critere: 11, id_service: 4, ordre: 0 },
            { id: 2, id_critere: 12, id_service: 4, ordre: 1 },
            { id: 3, id_critere: 4, id_service: 5, ordre: 0 },
        ]);
        await moveCritereToService({ id_critere: 11, id_service: 5, ordre: 0 }, contexteDirection());
        // Destination : 11 en tête, 4 décalé.
        expect(parService(lignes, 5).map((l) => [l.id_critere, l.ordre])).toEqual([[11, 0], [4, 1]]);
        // Source : 12 seul, réindexé à 0 (AVANT : trou `1` laissé tel quel).
        expect(parService(lignes, 4).map((l) => [l.id_critere, l.ordre])).toEqual([[12, 0]]);
        expect(ecritures).toContain('update id=2 ordre=0');
    });
    test('vivier → colonne : aucune réécriture parasite des autres colonnes', async () => {
        const { lignes, ecritures } = creerTx([
            { id: 1, id_critere: 11, id_service: 4, ordre: 0 },
            { id: 2, id_critere: 12, id_service: 4, ordre: 1 },
        ]);
        // 4 n'est rattaché nulle part (question du vivier) → Depot.
        await moveCritereToService({ id_critere: 4, id_service: 5, ordre: 0 }, contexteDirection());
        expect(parService(lignes, 5).map((l) => [l.id_critere, l.ordre])).toEqual([[4, 0]]);
        expect(parService(lignes, 4).map((l) => [l.id_critere, l.ordre])).toEqual([[11, 0], [12, 1]]);
        expect(ecritures).toEqual([]);
    });
    test('réordonnancement interne : la colonne est réécrite, rien d\'autre', async () => {
        const { lignes, ecritures } = creerTx([
            { id: 1, id_critere: 11, id_service: 4, ordre: 0 },
            { id: 2, id_critere: 12, id_service: 4, ordre: 1 },
            { id: 3, id_critere: 4, id_service: 5, ordre: 0 },
        ]);
        await moveCritereToService({ id_critere: 12, id_service: 4, ordre: 0 }, contexteDirection());
        expect(parService(lignes, 4).map((l) => [l.id_critere, l.ordre])).toEqual([[12, 0], [11, 1]]);
        expect(parService(lignes, 5).map((l) => [l.id_critere, l.ordre])).toEqual([[4, 0]]);
        expect(ecritures).toEqual([]);
    });
});
describe('removeCritereFromService — retour au vivier', () => {
    test('la question quitte l\'opération et les autres opérations sont réindexées', async () => {
        // Donnée ancienne : 4 rattaché aux DEUX opérations (doublon historique).
        const { lignes } = creerTx([
            { id: 1, id_critere: 11, id_service: 4, ordre: 0 },
            { id: 2, id_critere: 4, id_service: 4, ordre: 1 },
            { id: 3, id_critere: 4, id_service: 5, ordre: 0 },
            { id: 4, id_critere: 12, id_service: 5, ordre: 1 },
        ]);
        await removeCritereFromService({ id_critere: 4, id_service: 5 }, contexteDirection());
        // 4 n'est plus nulle part (nettoyage total, pas de « retour » ailleurs).
        expect(lignes.some((l) => l.id_critere === 4)).toBe(false);
        // Les deux colonnes sont contiguës, sans trou.
        expect(parService(lignes, 4).map((l) => [l.id_critere, l.ordre])).toEqual([[11, 0]]);
        expect(parService(lignes, 5).map((l) => [l.id_critere, l.ordre])).toEqual([[12, 0]]);
    });
    test('retirer une question déjà absente est refusé 409, pas silencieux', async () => {
        const { lignes } = creerTx([
            { id: 1, id_critere: 11, id_service: 4, ordre: 0 },
        ]);
        let statut = 0;
        try {
            await removeCritereFromService({ id_critere: 11, id_service: 5 }, contexteDirection());
        }
        catch (e) {
            statut = e?.statusCode ?? 500;
        }
        expect(statut).toBe(409);
        expect(lignes).toHaveLength(1);
    });
});
