// src/client/pages/SyntheseGlobalePage.test.ts — helpers purs (parsing JSON,
// libellé de période, intervalle de rafraîchissement) : aucune dépendance React.
import { expect, test, describe } from 'vitest';
import { parseJson, libellePeriode, intervalleActualisationSynthese } from './SyntheseGlobalePage';
describe('parseJson : défensif', () => {
    test('JSON valide → valeur', () => {
        expect(parseJson('["a","b"]', [])).toEqual(['a', 'b']);
    });
    test('null / vide / invalide → défaut (jamais de crash de rendu)', () => {
        expect(parseJson(null, ['defaut'])).toEqual(['defaut']);
        expect(parseJson('', { a: 1 })).toEqual({ a: 1 });
        expect(parseJson('{pas du json', ['defaut'])).toEqual(['defaut']);
        expect(parseJson('null', 'defaut')).toBe('defaut');
    });
});
describe('libellePeriode', () => {
    test('SEMAINE → plage de dates', () => {
        const l = libellePeriode({ periode: 'SEMAINE', debut: '2026-09-14T00:00:00Z', fin: '2026-09-20T00:00:00Z' });
        expect(l).toMatch(/^Semaine /);
        expect(l).toContain('2026');
    });
    test('MOIS → mention du mois', () => {
        expect(libellePeriode({ periode: 'MOIS', debut: '2026-08-01T00:00:00Z', fin: '2026-08-31T00:00:00Z' })).toMatch(/^Mois /);
    });
    test('PERSONNALISEE → plage explicite', () => {
        const l = libellePeriode({ periode: 'PERSONNALISEE', debut: '2026-09-01T00:00:00Z', fin: '2026-09-10T00:00:00Z' });
        expect(l).toMatch(/^Période /);
        expect(l).toContain('2026');
    });
});
describe('intervalleActualisationSynthese (régression page blanche /synthese)', () => {
    test('données absentes → pas de rafraîchissement, et surtout pas de crash', () => {
        // C'est ce cas qui tuait la page : au montage, les données valent
        // `undefined`. La forme v5 `(q) => q.state.data…` levait `TypeError`.
        expect(intervalleActualisationSynthese(undefined)).toBe(false);
        expect(intervalleActualisationSynthese(null)).toBe(false);
        expect(intervalleActualisationSynthese('nimportequoi')).toBe(false);
    });
    test('aucune analyse en file → pas de rafraîchissement', () => {
        expect(intervalleActualisationSynthese([])).toBe(false);
        expect(intervalleActualisationSynthese([{ status: 'DONE' }, { status: 'FAILED' }])).toBe(false);
    });
    test('analyse en file → rafraîchissement toutes les 5 s', () => {
        expect(intervalleActualisationSynthese([{ status: 'PENDING' }])).toBe(5000);
        expect(intervalleActualisationSynthese([{ status: 'DONE' }, { status: 'PENDING' }])).toBe(5000);
    });
    test('lignes malformées → ignorées, pas de crash', () => {
        expect(intervalleActualisationSynthese([null, undefined, 42, {}])).toBe(false);
    });
});
describe('lecture NPS persisté (régression NaN affiché)', () => {
    // Le snapshot stocke l'OBJET agrégé, pas le scalaire. `Number(objet)`
    // donnait NaN, affiché tel quel. Ces tests verrouillent la lecture.
    test('objet agrégé → scalaire + ventilation', async () => {
        const { lireNpsValeur, lireNpsDetail } = await import('./SyntheseGlobalePage');
        const ind = { nps: { nps: 42, promoteurs: 6, passifs: 2, detracteurs: 2, volume: 10 } };
        expect(lireNpsValeur(ind)).toBe(42);
        expect(lireNpsDetail(ind)).toBe('6 promoteurs · 2 passifs · 2 détracteurs (10 notes)');
    });
    test('NPS négatif → scalaire négatif', async () => {
        const { lireNpsValeur } = await import('./SyntheseGlobalePage');
        expect(lireNpsValeur({ nps: { nps: -20, volume: 5 } })).toBe(-20);
    });
    test('scalaire historique → repli sans crash', async () => {
        const { lireNpsValeur, lireNpsDetail } = await import('./SyntheseGlobalePage');
        expect(lireNpsValeur({ nps: 30 })).toBe(30);
        expect(lireNpsDetail({ nps: 30 })).toBeUndefined();
    });
    test('null / objet vide / volume 0 → N/A, jamais NaN', async () => {
        const { lireNpsValeur, lireNpsDetail } = await import('./SyntheseGlobalePage');
        expect(lireNpsValeur({ nps: null })).toBeNull();
        expect(lireNpsValeur(null)).toBeNull();
        expect(lireNpsValeur({ nps: { nps: null, volume: 0 } })).toBeNull();
        expect(lireNpsDetail({ nps: { nps: null, volume: 0 } })).toBeUndefined();
        // Garde anti-régression : aucun de ces cas ne produit NaN.
        for (const ind of [{ nps: null }, null, { nps: { volume: 0 } }, { nps: 'x' }]) {
            expect(Number.isNaN(lireNpsValeur(ind))).toBe(false);
        }
    });
});
