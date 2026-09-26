// src/client/collecte/payload.test.ts
// Le client n'envoie jamais de position ni de score QCM/CASES.
import { expect, test, describe } from 'vitest';
import { optionsAffichage, payloadSmiley, payloadOuiNon, payloadQCM, payloadTexte, payloadValeur, payloadCases, bornesEchelle, estCritereCES, libellesCES, choixEchelle, } from './payload';
describe('optionsAffichage : ids stables en priorité', () => {
    test('table options → ids conservés dans l’ordre d’affichage', () => {
        const r = optionsAffichage({
            options: [
                { id: 'o2', libelle: 'Neutre' },
                { id: 'o1', libelle: 'Très satisfait' },
            ],
            options_reponse: 'IGNORE,ME',
        });
        expect(r).toEqual([
            { id: 'o2', libelle: 'Neutre' },
            { id: 'o1', libelle: 'Très satisfait' },
        ]);
    });
    test('sans table → repli CSV sans id (compat serveur)', () => {
        expect(optionsAffichage({ options_reponse: 'Oui, Non' })).toEqual([
            { id: null, libelle: 'Oui' },
            { id: null, libelle: 'Non' },
        ]);
        expect(optionsAffichage({})).toEqual([]);
    });
});
describe('payloads : identifiants et valeurs, jamais de position', () => {
    test('QCM avec id → optionId seul (aucun score, aucun index)', () => {
        expect(payloadQCM(12, { id: 'o-ts', libelle: 'Très satisfait' })).toEqual({
            critereId: 12, optionId: 'o-ts',
        });
    });
    test('QCM sans id → texte (compat MIGRATED serveur)', () => {
        expect(payloadQCM(12, { id: null, libelle: 'Neutre' })).toEqual({
            critereId: 12, texte: 'Neutre',
        });
    });
    test('CASES avec ids → optionIds', () => {
        expect(payloadCases(15, [
            { id: 'opt_1', libelle: 'Attente' },
            { id: 'opt_4', libelle: 'Info' },
        ])).toEqual({ critereId: 15, optionIds: ['opt_1', 'opt_4'] });
    });
    test('CASES sans ids → texte joint •', () => {
        expect(payloadCases(15, [
            { id: null, libelle: 'Attente' },
            { id: null, libelle: 'Info' },
        ])).toEqual({ critereId: 15, texte: 'Attente • Info' });
    });
    test('TEXTE → verbatim trimé, sans score', () => {
        expect(payloadTexte(14, '  merci  ')).toEqual({ critereId: 14, texte: 'merci' });
    });
    test('OUI_NON → booléen ; SMILEY → note ; ECHELLE/NPS → valeur', () => {
        expect(payloadOuiNon(2, true)).toEqual({ critereId: 2, valeurOui: true });
        expect(payloadSmiley(1, 4)).toEqual({ critereId: 1, score: 4 });
        expect(payloadValeur(3, 8)).toEqual({ critereId: 3, valeur: 8 });
    });
    test('bornesEchelle : défaut 1-5 si illisible', () => {
        expect(bornesEchelle({ options_reponse: '1,10' })).toEqual({ min: 1, max: 10 });
        expect(bornesEchelle({})).toEqual({ min: 1, max: 5 });
        expect(bornesEchelle({ options_reponse: 'nawak' })).toEqual({ min: 1, max: 5 });
    });
});
describe('Phase L — libellés d\'effort (CES) sur le formulaire public', () => {
    test('estCritereCES : seul scoring_mode = CES compte', () => {
        expect(estCritereCES({ scoring_mode: 'CES' })).toBe(true);
        expect(estCritereCES({ scoring_mode: 'ces' })).toBe(true);
        expect(estCritereCES({ scoring_mode: 'NUMERIC' })).toBe(false);
        expect(estCritereCES({ scoring_mode: null })).toBe(false);
        expect(estCritereCES({})).toBe(false);
    });
    test('libellés 1-5 : un libellé par niveau, 1 = très facile', () => {
        const l = libellesCES(5);
        expect(l).toHaveLength(5);
        expect(l[0]).toBe('Très facile');
        expect(l[4]).toBe('Très difficile');
    });
    test('libellés 1-7 : 7 libellés, extrema corrects', () => {
        const l = libellesCES(7);
        expect(l).toHaveLength(7);
        expect(l[0]).toBe('Très facile');
        expect(l[6]).toBe('Très difficile');
    });
    test('échelle non supportée (1-10) → aucun libellé inventé', () => {
        expect(libellesCES(10)).toEqual([]);
    });
    test('choixEchelle sur un CES 1-7 : libellés + aria vocalisés', () => {
        const r = choixEchelle({ scoring_mode: 'CES', options_reponse: '1,7' });
        expect(r).toHaveLength(7);
        expect(r[0]).toEqual({ valeur: 1, libelle: 'Très facile', aria: 'Effort : Très facile' });
        expect(r[6].valeur).toBe(7);
        expect(r[6].libelle).toBe('Très difficile');
    });
    test('choixEchelle sur une note classique → chiffres, aria inchangé', () => {
        const r = choixEchelle({ options_reponse: '1,10' });
        expect(r).toHaveLength(10);
        expect(r[0]).toEqual({ valeur: 1, libelle: '1', aria: 'Note 1 sur 10' });
    });
    test('CES sur échelle non supportée (1-10) → repli sur les chiffres', () => {
        const r = choixEchelle({ scoring_mode: 'CES', options_reponse: '1,10' });
        expect(r[0].libelle).toBe('1');
        expect(r[9].aria).toBe('Note 10 sur 10');
    });
    test('bornes non 1 : les valeurs restent alignées sur les libellés', () => {
        // Défense : si un jour min≠1, on n'aligne pas un libellé « Très facile »
        // sur une valeur qui ne l'est pas — on retombe sur les chiffres.
        const r = choixEchelle({ scoring_mode: 'CES', options_reponse: '0,5' });
        expect(r[0].libelle).toBe('0');
        expect(r[1].libelle).toBe('1');
    });
});
//# sourceMappingURL=payload.test.js.map