// src/shared/csat.test.ts
// ============================================================================
// VAGUE 6 — La règle du CSAT, en un seul endroit.
//
// Deux exigences documentées, que le moteur global ne respectait que
// partiellement (il appliquait la première à son CSAT global, et aucune
// des deux à ses ventilations par agence, service et guichet) :
//
//   1. « 1 avis = 1 soumission » (docs/logique-avis-uniques.md) —
//      compter des LIGNES est le bug que ce document déclare corrigé ;
//   2. seuls les critères de SATISFACTION entrent dans la moyenne — un
//      NPS 0/10 ou un CES « très difficile » ne sont pas des notes de
//      satisfaction.
//
// Ces tests portent sur la règle elle-même ; l'intégration au moteur est
// vérifiée dans moteurGlobal.test.ts.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { grouperParAvis, compterAvisDans, scoreAvis100, csatParAvis, scoresAvisSatisfaction, distributionParAvis, FACTEUR_NOTE5_VERS_100, } from './csat';
const SMILEY = { type_reponse: 'SMILEY', scoring_mode: 'SMILEY' };
const NPS = { type_reponse: 'NPS', scoring_mode: 'NPS' };
const CES = { type_reponse: 'ECHELLE', scoring_mode: 'CES' };
/** Une ligne notée sur 100 (comme la colonne `score_normalise`). */
const ligne = (soumission, sur100, critere = SMILEY, type = 'SMILEY') => ({
    id_soumission: soumission,
    score_normalise: sur100,
    critere: { type_reponse: type, scoring_mode: critere.scoring_mode },
});
describe('Règle 1 — 1 avis = 1 soumission', () => {
    test('quatre questions d\u2019un même client comptent pour UN avis', () => {
        // Le cas que la fixture du moteur ne couvrait pas : un formulaire
        // à 5 questions ne doit pas peser 5× un formulaire à 1 question.
        const avis = [ligne('a', 80), ligne('a', 100), ligne('a', 60), ligne('a', 80)];
        expect(compterAvisDans(avis)).toBe(1);
        expect(grouperParAvis(avis)).toHaveLength(1);
    });
    test('le volume compte les avis, pas les lignes', () => {
        const lignes = [ligne('a', 80), ligne('a', 80), ligne('b', 80), ligne('c', 80)];
        expect(compterAvisDans(lignes)).toBe(3);
        expect(lignes).toHaveLength(4);
    });
    test('un formulaire à 5 questions ne pèse pas plus qu\u2019un formulaire à 1', () => {
        // Sans la règle, la moyenne serait (5×100 + 1×20) / 6 ≈ 87 au lieu
        // de 60 : un client très satisfait et un client mécontent pèseraient
        // chacun selon la longueur de LEUR formulaire.
        const long = [ligne('a', 100), ligne('a', 100), ligne('a', 100), ligne('a', 100), ligne('a', 100)];
        const court = [ligne('b', 20)];
        const scores = [...scoresAvisSatisfaction(long), ...scoresAvisSatisfaction(court)];
        expect(scores).toHaveLength(2);
        expect(csatParAvis([...long, ...court])).toBeCloseTo(60, 5);
    });
    test('le score d\u2019un avis est la moyenne de ses questions', () => {
        expect(scoreAvis100([ligne('a', 100), ligne('a', 60)])).toBe(80);
    });
    test('une ligne sans soumission reste son propre avis (jamais fusionnée)', () => {
        // Règle explicite du document : on ne fusionne pas des lignes dont on
        // n\u2019est pas sûr qu\u2019elles viennent du même envoi.
        const orphelines = [
            { id_soumission: null, score_normalise: 100, critere: SMILEY },
            { id_soumission: null, score_normalise: 20, critere: SMILEY },
        ];
        expect(compterAvisDans(orphelines)).toBe(2);
        expect(csatParAvis(orphelines)).toBeCloseTo(60, 5);
    });
});
describe('Règle 2 — seuls les critères de satisfaction comptent', () => {
    test('un NPS 0/10 ne fait pas plummir le CSAT', () => {
        const lignes = [ligne('a', 80), ligne('a', 80), ligne('b', 0, NPS, 'NPS')];
        // La ligne NPS est à 0/100 : l'inclure ferait tomber le CSAT à 53.
        expect(csatParAvis(lignes)).toBe(80);
    });
    test('un CES « très difficile » ne fait pas plummir le CSAT', () => {
        const lignes = [ligne('a', 80), ligne('a', 80), ligne('b', 0, CES, 'ECHELLE')];
        expect(csatParAvis(lignes)).toBe(80);
    });
    test('la répartition ne compte que les avis de satisfaction', () => {
        const lignes = [
            ligne('a', 80), ligne('a', 80), // avis de 80 → bande 4
            ligne('b', 20), // avis de 20 → bande 1
            ligne('c', 0, NPS, 'NPS'), // exclu
        ];
        const distribution = distributionParAvis(lignes);
        expect(distribution['4']).toBe(1);
        expect(distribution['1']).toBe(1);
        expect(distribution['2']).toBe(0);
    });
    test('un avis sans aucune note de satisfaction ne compte pas', () => {
        const lignes = [ligne('a', 80), ligne('b', 0, CES, 'ECHELLE')];
        // Le second avis n'a que du CES : il ne produit ni score ni bande.
        expect(scoresAvisSatisfaction(lignes)).toHaveLength(1);
    });
});
describe('Conversion et cas limites', () => {
    test('le facteur de conversion est explicite', () => {
        // La faute la plus probable sur ce fichier : * 100 au lieu de * 20,
        // qui donne un CSAT de 400 chez un client ayant mis 4/5.
        expect(FACTEUR_NOTE5_VERS_100).toBe(20);
        expect(scoreAvis100([ligne('a', 100)])).toBe(100);
        expect(scoreAvis100([ligne('a', 40)])).toBe(40);
    });
    test('un jeu vide ne produit pas de score (jamais 0 inventé)', () => {
        expect(csatParAvis([])).toBeNull();
        expect(csatParAvis([ligne('a', 100, CES, 'ECHELLE')])).toBeNull();
        expect(scoresAvisSatisfaction([])).toEqual([]);
    });
    test('les bandes restent dans 1..5 même pour une note hors bornes', () => {
        const distribution = distributionParAvis([ligne('a', 120), ligne('b', -10)]);
        expect(Object.keys(distribution)).toEqual(['1', '2', '3', '4', '5']);
        expect(distribution['5'] + distribution['1']).toBe(2);
    });
});
