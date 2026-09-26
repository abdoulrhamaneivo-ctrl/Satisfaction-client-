// src/client/pages/SyntheseGlobalePage.test.ts — helpers purs (parsing JSON,
// libellé de période) : aucune dépendance React.
import { expect, test, describe } from 'vitest';
import { parseJson, libellePeriode } from './SyntheseGlobalePage';
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
});
//# sourceMappingURL=SyntheseGlobalePage.test.js.map