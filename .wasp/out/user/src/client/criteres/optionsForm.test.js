// src/client/criteres/optionsForm.test.ts — helpers purs de l'éditeur.
import { expect, test, describe } from 'vitest';
import { csvVersOptions, baseVersOptions, optionsVersPayload, optionVide } from './optionsForm';
describe('csvVersOptions : migration douce', () => {
    test('découpe, trim, ignore les vides, scores à Auto', () => {
        const r = csvVersOptions('Très satisfait,  ,Neutre,Insatisfait,');
        expect(r.map((o) => o.libelle)).toEqual(['Très satisfait', 'Neutre', 'Insatisfait']);
        expect(r.every((o) => o.score === null && o.poids === null)).toBe(true);
        expect(new Set(r.map((o) => o.cle)).size).toBe(3);
    });
    test('vide → []', () => {
        expect(csvVersOptions('')).toEqual([]);
    });
});
describe('baseVersOptions : lignes base → éditables', () => {
    test('conserve id/score/poids/code', () => {
        const r = baseVersOptions([
            { id: 'abc', libelle: 'Oui', score: 5, poids: null, code_metier: null },
        ]);
        expect(r[0]).toMatchObject({ cle: 'abc', libelle: 'Oui', score: 5, poids: null, code_metier: '' });
    });
});
describe('optionsVersPayload : filtre + normalise', () => {
    test('vides écartées, code en majuscules, sans code omis', () => {
        const r = optionsVersPayload([
            { ...optionVide(), libelle: '  Aucun  ', score: null, poids: 0, code_metier: 'exclusif' },
            { ...optionVide(), libelle: '   ', score: 5, poids: null, code_metier: '' },
            { ...optionVide(), libelle: 'Attente', score: 2, poids: -20, code_metier: '' },
        ]);
        expect(r).toEqual([
            { libelle: 'Aucun', score: null, poids: 0, code_metier: 'EXCLUSIF' },
            { libelle: 'Attente', score: 2, poids: -20 },
        ]);
    });
});
