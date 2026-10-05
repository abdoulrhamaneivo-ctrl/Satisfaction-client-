// src/server/avisGroupes.test.ts
// ============================================================================
// RESTITUTION (correctif 2026-10-05) : `getAvisGroupes` chargeait les options
// choisies (join `option.libelle`) puis les JETTAIT dans le mapping — les
// réponses QCM sans commentaire affichaient « Réponse non restituable »
// alors que l'option choisie est en base. Le mapping doit transmettre
// `optionsChoisies` (+ scores) tel quel au front.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { getAvisGroupes } from './queries';
const ligneQCM = (partiel) => ({
    id: 11,
    id_soumission: 's-1',
    id_agence: 1,
    score_brut: null,
    score_officiel: null,
    score_normalise: null,
    commentaire_texte: null,
    date_reponse: new Date(),
    critere: { type_reponse: 'QCM', libelle_critere: 'Satisfaction' },
    analyseIA: null,
    guichet: { nom_guichet: 'G1' },
    service: null,
    agence: { nom_agence: 'A1' },
    agent: null,
    optionsChoisies: [
        { id_option: 'opt-1', option: { id: 'opt-1', libelle: '🙁 Peu satisfait' } },
    ],
    ...partiel,
});
function ctxAvec(lignes) {
    return {
        user: { id: 'u', role: 'CHEF_AGENCE', actif: true, id_entreprise: 1, id_agence: 1 },
        entities: {
            Entreprise: { findUnique: async () => ({ status: 'ACTIVE' }) },
            Reponse: {
                groupBy: async () => [{ id_soumission: 's-1' }],
                findMany: async () => lignes,
            },
        },
    };
}
describe('getAvisGroupes : les options choisies survivent au mapping', () => {
    test('QCM sans commentaire mais avec option liée → libellé transmis', async () => {
        const r = await getAvisGroupes({ page: 1, pageSize: 20 }, ctxAvec([ligneQCM({})]));
        const ligne = r.avis[0].reponses[0];
        expect(ligne.optionsChoisies).toEqual([
            { id_option: 'opt-1', option: { id: 'opt-1', libelle: '🙁 Peu satisfait' } },
        ]);
    });
    test('scores transmis (futures notes SMILEY/ECHELLE)', async () => {
        const r = await getAvisGroupes({ page: 1, pageSize: 20 }, ctxAvec([ligneQCM({ score_officiel: 5, score_normalise: 100 })]));
        const ligne = r.avis[0].reponses[0];
        expect(ligne.score_officiel).toBe(5);
        expect(ligne.score_normalise).toBe(100);
    });
    test('sans options ni commentaire → champs vides mais présents (le front décide)', async () => {
        const r = await getAvisGroupes({ page: 1, pageSize: 20 }, ctxAvec([ligneQCM({ optionsChoisies: [] })]));
        const ligne = r.avis[0].reponses[0];
        expect(ligne.optionsChoisies).toEqual([]);
        expect(ligne.commentaire_texte).toBeNull();
    });
});
