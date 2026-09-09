// src/server/isolation.test.ts
// ============================================================================
// Tests d'isolation multi-tenant (audit 09/2026) : chaque rôle ne touche que
// son périmètre, sans mélange entre agences ni entre entreprises.
// Les modules Wasp ('wasp/server', 'wasp/server/auth') sont mockés — voir
// vitest.config.ts + src/server/__mocks__/.
// ============================================================================
import { expect, test, vi } from 'vitest';
import { updateAgent, deleteAgent } from './actions';
import { getAIStatus } from './queries';
const ENTREPRISE_A = 10;
const ENTREPRISE_B = 20;
const chefA = { id: 'chef-a', role: 'CHEF_AGENCE', id_agence: 1, id_entreprise: ENTREPRISE_A, actif: true, email: 'chef@a.ci' };
const directionA = { id: 'dir-a', role: 'DIRECTION', id_agence: null, id_entreprise: ENTREPRISE_A, actif: true, email: 'dir@a.ci' };
const agentA = { id: 'ag-1', role: 'AGENT', id_agence: 1, id_entreprise: ENTREPRISE_A, actif: true, email: 'ag@a.ci', nom: 'A', prenom: 'G' };
const agentB = { id: 'ag-2', role: 'AGENT', id_agence: 5, id_entreprise: ENTREPRISE_B, actif: true, email: 'ag@b.ci', nom: 'B', prenom: 'G' };
const entitiesPour = (utilisateurs) => ({
    Entreprise: { findUnique: async () => ({ status: 'ACTIVE' }) },
    Agence: { findMany: async () => [{ id: 1 }, { id: 2 }] },
    User: {
        findUnique: async ({ where }) => utilisateurs.find((u) => u.id === where.id) ?? null,
        update: async ({ where, data }) => ({ ...utilisateurs.find((u) => u.id === where.id), ...data }),
    },
    AnalyseAvisIA: { count: async () => 0 },
});
const ctx = (user, utilisateurs) => ({ user, entities: entitiesPour(utilisateurs) });
async function erreurHttp(fn) {
    try {
        await fn();
    }
    catch (e) {
        return { statusCode: e?.statusCode, message: String(e?.message ?? e) };
    }
    throw new Error('AUCUNE_ERREUR_LEVEE');
}
// ── updateAgent ─────────────────────────────────────────────────────────────
test("updateAgent : un CHEF ne peut pas modifier un compte d'une autre entreprise", async () => {
    const err = await erreurHttp(() => updateAgent({ id: 'ag-2', nom: 'X' }, ctx(chefA, [chefA, agentB])));
    expect(err.statusCode).toBe(403);
});
test('updateAgent : un CHEF ne peut pas modifier un compte DIRECTION', async () => {
    const err = await erreurHttp(() => updateAgent({ id: 'dir-a', nom: 'X' }, ctx(chefA, [chefA, directionA])));
    expect(err.statusCode).toBe(403);
});
test("updateAgent : cas légitime chef → agent de sa propre agence", async () => {
    const entities = entitiesPour([chefA, agentA]);
    const maj = vi.fn(async ({ where, data }) => ({ id: where.id, ...data }));
    entities.User.update = maj;
    await updateAgent({ id: 'ag-1', nom: 'NouveauNom' }, { user: chefA, entities });
    expect(maj).toHaveBeenCalledOnce();
});
// ── deleteAgent ─────────────────────────────────────────────────────────────
test('deleteAgent : un CHEF ne peut pas suspendre un compte DIRECTION', async () => {
    const err = await erreurHttp(() => deleteAgent({ id: 'dir-a' }, ctx(chefA, [chefA, directionA])));
    expect(err.statusCode).toBe(403);
});
test("deleteAgent : un CHEF ne peut pas suspendre un agent d'une autre entreprise", async () => {
    const err = await erreurHttp(() => deleteAgent({ id: 'ag-2' }, ctx(chefA, [chefA, agentB])));
    expect(err.statusCode).toBe(403);
});
// ── getAIStatus ─────────────────────────────────────────────────────────────
test('getAIStatus : un AGENT est refusé (page Paramètres réservée Direction)', async () => {
    const agentSimple = { ...agentA, role: 'AGENT' };
    const err = await erreurHttp(() => getAIStatus(undefined, ctx(agentSimple, [agentSimple])));
    expect(err.statusCode).toBe(403);
});
test('getAIStatus : le modèle NVIDIA par défaut est supporté', async () => {
    const precedent = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'nvidia';
    try {
        const statut = await getAIStatus(undefined, ctx(directionA, [directionA]));
        expect(statut.provider).toBe('Nvidia');
        expect(statut.model).toBe('mistralai/mistral-nemotron');
    }
    finally {
        if (precedent === undefined)
            delete process.env.AI_PROVIDER;
        else
            process.env.AI_PROVIDER = precedent;
    }
});
//# sourceMappingURL=isolation.test.js.map