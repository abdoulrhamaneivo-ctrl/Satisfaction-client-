// src/server/volumesAvis.test.ts
// ============================================================================
// VOLUMES (correctif 2026-10-05) : « Total Avis » et tous les compteurs de
// volume comptent TOUS les avis (soumissions distinctes), pas les seuls
// avis notés. Cas réel : 3 lignes non notées (QCM/CASES sans scores) = 1
// avis affichaient « Total Avis : 0 ». Moyennes et taux restent calculés
// sur les seuls avis notés (dénominateurs inchangés).
// ============================================================================
import { describe, test, expect, beforeEach } from 'vitest';
import { prisma } from 'wasp/server';
import { getKPIsPeriode, getComparaisonAgences, getTendanceMensuelle } from './queries';
import { calculeStatsAgence } from './jobs/rapportMensuel';
const ligne = (partiel) => ({
    id: 1,
    id_soumission: 's-test',
    id_agence: 1,
    id_guichet: 1,
    id_service: 1,
    score_brut: null,
    score_officiel: null,
    score_normalise: null,
    date_reponse: new Date(),
    critere: { type_reponse: 'QCM', options_reponse: null, scoring_mode: null },
    service: { id: 1, libelle_service: 'Op1' },
    ...partiel,
});
// 1 avis = 3 lignes non notées (le cas production du 2026-10-03).
const AVIS_NON_NOTE = [
    ligne({ id: 4, id_critere: 3 }),
    ligne({ id: 5, id_critere: 1 }),
    ligne({ id: 6, id_critere: 2 }),
];
// 1 avis noté SMILEY 5/5.
const AVIS_NOTE = [
    ligne({
        id: 7, id_soumission: 's-note', id_critere: 11,
        score_normalise: 100, score_officiel: 5,
        critere: { type_reponse: 'SMILEY', options_reponse: null, scoring_mode: null },
    }),
];
function ctxAvec(reponses) {
    return {
        user: { id: 'u', role: 'DIRECTION', actif: true, id_entreprise: 1 },
        entities: {
            Entreprise: { findUnique: async () => ({ status: 'ACTIVE' }) },
            Agence: { findMany: async () => [{ id: 1, nom_agence: 'A1', commune: 'X' }] },
            Reponse: { findMany: async () => reponses },
        },
    };
}
beforeEach(() => {
    prisma.agence = {
        findUnique: async () => ({ id: 1, nom_agence: 'A1', commune: 'X' }),
    };
    prisma.reponse = { findMany: async () => [] };
    prisma.alerte = { count: async () => 0 };
    prisma.tacheCorrective = { count: async () => 0 };
});
describe('getKPIsPeriode : le volume compte tous les avis', () => {
    test('1 avis non noté → nb = 1 (avant : 0), moyenne et taux à 0', async () => {
        const r = await getKPIsPeriode({ nbJours: 30 }, ctxAvec(AVIS_NON_NOTE));
        expect(r.periode_actuelle.nb).toBe(1);
        expect(r.periode_actuelle.moyenne).toBe(0);
        expect(r.periode_actuelle.satisfaction).toBe(0);
    });
    test('1 noté + 1 non noté → nb = 2, moyenne et taux sur le seul noté', async () => {
        const r = await getKPIsPeriode({ nbJours: 30 }, ctxAvec([...AVIS_NOTE, ...AVIS_NON_NOTE]));
        expect(r.periode_actuelle.nb).toBe(2);
        expect(r.periode_actuelle.moyenne).toBe(5);
        expect(r.periode_actuelle.satisfaction).toBe(100);
    });
    test('par_operation : même règle dans les groupes', async () => {
        const r = await getKPIsPeriode({ nbJours: 30 }, ctxAvec(AVIS_NON_NOTE));
        expect(r.par_operation).toHaveLength(1);
        expect(r.par_operation[0].nb).toBe(1);
    });
});
describe('getComparaisonAgences : agence non notée affichée avec son volume', () => {
    test('1 avis non noté → nb_avis = 1, score_moyen null (avant : 0)', async () => {
        const r = await getComparaisonAgences({ nbJours: 30 }, ctxAvec(AVIS_NON_NOTE));
        expect(r.agences).toHaveLength(1);
        expect(r.agences[0].nb_avis).toBe(1);
        expect(r.agences[0].score_moyen).toBeNull();
    });
});
describe('getTendanceMensuelle : mois non noté avec son volume', () => {
    test('le mois compte les avis, même sans note', async () => {
        const r = await getTendanceMensuelle({}, ctxAvec(AVIS_NON_NOTE));
        const total = r.reduce((s, m) => s + (m.nb_avis ?? 0), 0);
        expect(total).toBe(1);
    });
});
describe('rapport mensuel : totalAvis = tous les avis', () => {
    test('1 avis non noté → rapport produit avec totalAvis = 1', async () => {
        prisma.reponse = { findMany: async () => AVIS_NON_NOTE };
        const stats = await calculeStatsAgence(1, new Date('2026-09-01'), new Date('2026-10-01'));
        expect(stats?.totalAvis).toBe(1);
        expect(stats?.noteMoyenne).toBe(0);
        expect(stats?.tauxSatisfaction).toBe(0);
    });
});
//# sourceMappingURL=volumesAvis.test.js.map