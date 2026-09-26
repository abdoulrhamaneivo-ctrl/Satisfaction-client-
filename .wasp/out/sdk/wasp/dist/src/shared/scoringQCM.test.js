// src/shared/scoringQCM.test.ts
// Tests du lexique FR d'inférence (§61-62) : valence correcte ET surtout
// aucun faux positif par sous-chaîne (« Abonnement » ⊃ « bonne »,
// « Annonce » ⊃ « non » ne doivent pas scorer).
import { expect, test, describe } from 'vitest';
import { infererScoreOption, infererScoresOptions, normaliserLibelle } from './scoringQCM';
describe('§61 inférence : ordres et valences', () => {
    test('5 niveaux → [5,3,1,4,2] quel que soit le contenu exact', () => {
        expect(infererScoresOptions(['Très satisfait', 'Neutre', 'Très insatisfait', 'Satisfait', 'Insatisfait'])).toEqual([5, 3, 1, 4, 2]);
    });
    test('négation forte + intensifieur → 1, sinon 2', () => {
        expect(infererScoreOption('Très insatisfait')).toBe(1);
        expect(infererScoreOption('Insatisfait')).toBe(2);
        expect(infererScoreOption('Pas du tout satisfait')).toBe(1);
    });
    test('« ni … ni … » → 3 (neutre, prioritaire)', () => {
        expect(infererScoreOption('Ni bon ni mauvais')).toBe(3);
    });
    test('négation préfixe d’un positif → 2', () => {
        expect(infererScoreOption('Non satisfait')).toBe(2);
        expect(infererScoreOption('Pas clair')).toBe(2);
    });
    test('binaire exact : Oui=5, Non=1', () => {
        expect(infererScoreOption('Oui')).toBe(5);
        expect(infererScoreOption('Non')).toBe(1);
    });
    test('positifs forts=5, simples=4, neutres=3', () => {
        expect(infererScoreOption('Excellent')).toBe(5);
        expect(infererScoreOption('Parfait')).toBe(5);
        expect(infererScoreOption('Satisfaisant')).toBe(4);
        expect(infererScoreOption('Moyen')).toBe(3);
        expect(infererScoreOption('Correct')).toBe(3);
    });
});
describe('§62 anti-faux-positifs (frontières de mots)', () => {
    test('« Abonnement » ne matche ni « bonne » ni « bon »', () => {
        expect(infererScoreOption('Abonnement')).toBeNull();
    });
    test('« Annonce » ne matche pas « non »', () => {
        expect(infererScoreOption('Annonce')).toBeNull();
    });
    test('mots entiers : « Bonne » vaut 4', () => {
        expect(infererScoreOption('Bonne')).toBe(4);
    });
    test('forme nominale « Satisfaction » : pas de valence inventée', () => {
        expect(infererScoreOption('Satisfaction')).toBeNull();
    });
    test('« Insatisfaction » : négatif détecté par racine, jamais ≥ 4', () => {
        const s = infererScoreOption('Insatisfaction');
        expect(s).not.toBeNull();
        expect(s).toBeLessThanOrEqual(2);
    });
    test('normalisation : casse/accents/espaces équivalents', () => {
        expect(normaliserLibelle('  TRÈS   Satisfait ')).toBe(normaliserLibelle('tres satisfait'));
    });
    test('vide / inconnu → null (pas de devinette)', () => {
        expect(infererScoreOption('')).toBeNull();
        expect(infererScoreOption('Guichet 3')).toBeNull();
        expect(infererScoreOption('Ouverture de compte')).toBeNull();
    });
});
//# sourceMappingURL=scoringQCM.test.js.map