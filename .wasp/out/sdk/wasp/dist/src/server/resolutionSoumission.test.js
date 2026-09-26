// src/server/resolutionSoumission.test.ts
// Tests DB-free de la résolution serveur (§67 : entrées invalides, hors
// périmètre logique, compat legacy). La base n'est jamais touchée : les
// lignes Critere sont fabriquées en mémoire (avec options + version).
import { expect, test, describe } from 'vitest';
import { HttpError } from 'wasp/server';
import { normaliserEntree, resoudreEntree, messageAmbigu, } from './resolutionSoumission';
function qcmInverseOrdre(withProvenance = 'INFERRED') {
    return {
        id: 12,
        type_reponse: 'QCM',
        scoring_mode: null,
        orientation: 'HIGHER_BETTER',
        version: 3,
        options: [
            { id: 'o-ins', libelle: 'Insatisfait', score: 2, poids: null, est_scorable: true, actif: true, code_metier: null, score_provenance: withProvenance },
            { id: 'o-ts', libelle: 'Très satisfait', score: 5, poids: null, est_scorable: true, actif: true, code_metier: null, score_provenance: withProvenance },
            { id: 'o-neu', libelle: 'Neutre', score: 3, poids: null, est_scorable: true, actif: true, code_metier: null, score_provenance: withProvenance },
        ],
    };
}
function casCases() {
    return {
        id: 15,
        type_reponse: 'CASES',
        scoring_mode: 'CASES_WEIGHTED',
        orientation: 'HIGHER_BETTER',
        version: 1,
        options: [
            { id: 'opt_1', libelle: 'Attente longue', score: null, poids: -20, est_scorable: true, actif: true, code_metier: null, score_provenance: null },
            { id: 'opt_4', libelle: 'Information insuffisante', score: null, poids: -15, est_scorable: true, actif: true, code_metier: null, score_provenance: null },
            { id: 'opt_0', libelle: 'Aucun problème', score: null, poids: 0, est_scorable: true, actif: true, code_metier: 'EXCLUSIF', score_provenance: null },
        ],
    };
}
describe('normaliserEntree : bornes anti-abus', () => {
    test('trim, plafond 50 ids, ignore les non-chaînes', () => {
        const e = normaliserEntree({
            critereId: '12', texte: '  bonjour ', optionIds: ['a', 42, '', 'b'],
        });
        expect(e).toEqual({ critereId: 12, texte: 'bonjour', optionIds: ['a', 'b'] });
        const gros = normaliserEntree({ critereId: 1, optionIds: Array.from({ length: 80 }, (_, i) => `o${i}`) });
        expect(gros.optionIds).toHaveLength(50);
    });
});
describe('QCM : identité, jamais position', () => {
    test('optionId résout le score sémantique (ordre affiché inversé)', () => {
        const r = resoudreEntree(qcmInverseOrdre(), normaliserEntree({ critereId: 12, optionId: 'o-ts' }));
        expect(r.score_officiel).toBe(5);
        expect(r.score_normalise).toBe(100);
        expect(r.score_source).toBe('INFERRED');
        expect(r.critere_version).toBe(3);
        expect(r.libelleOption).toBe('Très satisfait');
        expect(r.optionsRetnues).toEqual(['o-ts']);
        // brut = officiel, jamais un index.
        expect(r.score_brut).toBe(5);
    });
    test('provenance EXPLICIT propagée', () => {
        const r = resoudreEntree(qcmInverseOrdre('EXPLICIT'), normaliserEntree({ critereId: 12, optionId: 'o-ins' }));
        expect(r.score_officiel).toBe(2);
        expect(r.score_source).toBe('EXPLICIT');
    });
    test('legacy texte : apparié par libellé (accents/casse), stampé MIGRATED', () => {
        const r = resoudreEntree(qcmInverseOrdre(), normaliserEntree({ critereId: 12, score: 1, texte: '  tres SATISFAIT ' }));
        expect(r.score_officiel).toBe(5);
        expect(r.score_source).toBe('MIGRATED');
        expect(r.libelleOption).toBe('Très satisfait');
    });
    test('legacy texte inconnu → 400 (pas de score inventé)', () => {
        expect(() => resoudreEntree(qcmInverseOrdre(), normaliserEntree({ critereId: 12, score: 9, texte: 'Fantôme' }))).toThrowError(HttpError);
    });
    test('optionId inconnue → 400', () => {
        expect(() => resoudreEntree(qcmInverseOrdre(), normaliserEntree({ critereId: 12, optionId: 'zzz' }))).toThrowError(HttpError);
    });
    test('option inactive → 400', () => {
        const c = qcmInverseOrdre();
        c.options[0].actif = false;
        expect(() => resoudreEntree(c, normaliserEntree({ critereId: 12, optionId: 'o-ins' }))).toThrowError(HttpError);
    });
    test('sans optionId ni texte → 400', () => {
        expect(() => resoudreEntree(qcmInverseOrdre(), normaliserEntree({ critereId: 12, score: 3 }))).toThrowError(HttpError);
    });
});
describe('CASES : ids, pondéré, exclusivité', () => {
    test('optionIds pondérés : 100 − 20 − 15 = 65', () => {
        const r = resoudreEntree(casCases(), normaliserEntree({ critereId: 15, optionIds: ['opt_1', 'opt_4'] }));
        expect(r.score_normalise).toBe(65);
        expect(r.score_officiel).toBe(3);
        expect(r.optionsRetnues).toEqual(['opt_1', 'opt_4']);
        expect(r.libelleOption).toBe('Attente longue • Information insuffisante');
    });
    test('legacy texte joint → mêmes ids, source MIGRATED', () => {
        const r = resoudreEntree(casCases(), normaliserEntree({ critereId: 15, texte: 'Attente longue • Information insuffisante' }));
        expect(r.score_normalise).toBe(65);
        expect(r.score_source).toBe('MIGRATED');
    });
    test('« Aucun » + autre → 400', () => {
        expect(() => resoudreEntree(casCases(), normaliserEntree({ critereId: 15, optionIds: ['opt_0', 'opt_1'] }))).toThrowError(HttpError);
    });
    test('CASES catégoriel : NULL partout, ids retenus', () => {
        const c = casCases();
        c.scoring_mode = 'CASES_CATEGORICAL';
        const r = resoudreEntree(c, normaliserEntree({ critereId: 15, optionIds: ['opt_1'] }));
        expect(r.score_officiel).toBeNull();
        expect(r.score_normalise).toBeNull();
        expect(r.score_source).toBeNull();
        expect(r.optionsRetnues).toEqual(['opt_1']);
    });
});
describe('TEXTE : jamais noté', () => {
    test('verbatim long → NULL + NULL, texte conservé', () => {
        const c = { id: 14, type_reponse: 'TEXTE', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [] };
        const r = resoudreEntree(c, normaliserEntree({ critereId: 14, score: 3, texte: 'Le personnel était très gentil.' }));
        expect(r.score_brut).toBeNull();
        expect(r.score_officiel).toBeNull();
        expect(r.score_normalise).toBeNull();
        expect(r.texte).toBe('Le personnel était très gentil.');
    });
    test('TEXTE vide → 400', () => {
        const c = { id: 14, type_reponse: 'TEXTE', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [] };
        expect(() => resoudreEntree(c, normaliserEntree({ critereId: 14 }))).toThrowError(HttpError);
    });
});
describe('directs : SMILEY / OUI_NON / ECHELLE / NPS', () => {
    const smiley = { id: 1, type_reponse: 'SMILEY', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [] };
    test('SMILEY 4 → 4, 75/100, EXPLICIT ; hors bornes → 400', () => {
        const r = resoudreEntree(smiley, normaliserEntree({ critereId: 1, score: 4 }));
        expect(r.score_officiel).toBe(4);
        expect(r.score_normalise).toBe(75);
        expect(r.score_source).toBe('EXPLICIT');
        expect(() => resoudreEntree(smiley, normaliserEntree({ critereId: 1, score: 6 }))).toThrowError(HttpError);
    });
    test('OUI_NON : booléen + orientation ; legacy 5/1', () => {
        const c = { id: 2, type_reponse: 'OUI_NON', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [] };
        expect(resoudreEntree(c, normaliserEntree({ critereId: 2, valeurOui: true })).score_officiel).toBe(5);
        expect(resoudreEntree(c, normaliserEntree({ critereId: 2, score: 1 })).score_officiel).toBe(1);
        const cInv = { ...c, orientation: 'LOWER_BETTER' };
        expect(resoudreEntree(cInv, normaliserEntree({ critereId: 2, valeurOui: true })).score_officiel).toBe(1);
        expect(resoudreEntree(cInv, normaliserEntree({ critereId: 2, valeurOui: false })).score_officiel).toBe(5);
    });
    test('ECHELLE 8/10 → 8 et ~77.78 ; 11 → 400', () => {
        const c = { id: 3, type_reponse: 'ECHELLE', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [], options_reponse: '1,10' };
        const r = resoudreEntree(c, normaliserEntree({ critereId: 3, valeur: 8 }));
        expect(r.score_officiel).toBe(8);
        expect(r.score_normalise).toBeCloseTo(77.777, 2);
        expect(() => resoudreEntree(c, normaliserEntree({ critereId: 3, valeur: 11 }))).toThrowError(HttpError);
    });
    test('NPS 9 → PROMOTEUR côté moteur (catégorie vérifiée unitairement)', () => {
        const c = { id: 4, type_reponse: 'NPS', scoring_mode: null, orientation: 'HIGHER_BETTER', version: 1, options: [] };
        const r = resoudreEntree(c, normaliserEntree({ critereId: 4, valeur: 9 }));
        expect(r.score_officiel).toBe(9);
        expect(r.score_normalise).toBe(90);
        expect(() => resoudreEntree(c, normaliserEntree({ critereId: 4, valeur: 11 }))).toThrowError(HttpError);
    });
});
describe('messageAmbigu : messages actionnables, jamais techniques', () => {
    test.each([
        ['OPTION_INCONNUE', /questionnaire modifié/],
        ['SELECTION_VIDE', /cochez/],
        ['EXCLUSIVITE_VIOLEE', /Aucun problème/],
        ['NPS_HORS_BORNES', /0 et 10/],
        ['QUELQUE chose', /Réponse invalide/],
    ])('%s → %s', (raison, motif) => {
        expect(messageAmbigu(raison, 'QCM')).toMatch(motif);
    });
});
//# sourceMappingURL=resolutionSoumission.test.js.map