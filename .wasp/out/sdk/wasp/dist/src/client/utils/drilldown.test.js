// src/client/utils/drilldown.test.ts
// ============================================================================
// DRILL-DOWN : l'URL construite doit être sûre et prévisible — jamais de
// paramètre invalide, jamais de date corrompue, ordre stable.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { construireUrlAvis, formaterDateUrl } from './drilldown';
describe('construireUrlAvis', () => {
    test('filtres + période → URL complète', () => {
        expect(construireUrlAvis({ agence: 2, service: 4 }, { debut: '2026-09-21T00:00:00.000Z', fin: new Date('2026-09-27T23:59:59.999Z') })).toBe('/avis?agence=2&service=4&debut=2026-09-21&fin=2026-09-27');
    });
    test('sans rien → base seule, sans point d’interrogation', () => {
        expect(construireUrlAvis({})).toBe('/avis');
    });
    test('ids invalides ignorés (0, négatif, NaN, non-entier)', () => {
        expect(construireUrlAvis({ agence: 0, guichet: -3, service: NaN })).toBe('/avis');
        expect(construireUrlAvis({ agence: 2.5 })).toBe('/avis');
    });
    test('score hors 1-5 ignoré', () => {
        expect(construireUrlAvis({ score: 9 })).toBe('/avis');
        expect(construireUrlAvis({ score: 4 })).toBe('/avis?score=4');
    });
    test('thème encodé et borné', () => {
        expect(construireUrlAvis({ theme: 'TEMPS_ATTENTE & co' })).toBe('/avis?theme=TEMPS_ATTENTE%20%26%20co');
    });
    test('dates invalides ignorées', () => {
        expect(construireUrlAvis({ agence: 1 }, { debut: 'nimporte', fin: null })).toBe('/avis?agence=1');
    });
});
describe('formaterDateUrl', () => {
    test('Date, ISO et timestamp → AAAA-MM-JJ', () => {
        expect(formaterDateUrl(new Date('2026-09-01T12:00:00Z'))).toBe('2026-09-01');
        expect(formaterDateUrl('2026-09-27')).toBe('2026-09-27');
    });
    test('invalide → chaîne vide', () => {
        expect(formaterDateUrl('pas une date')).toBe('');
        expect(formaterDateUrl(null)).toBe('');
        expect(formaterDateUrl(undefined)).toBe('');
    });
});
//# sourceMappingURL=drilldown.test.js.map