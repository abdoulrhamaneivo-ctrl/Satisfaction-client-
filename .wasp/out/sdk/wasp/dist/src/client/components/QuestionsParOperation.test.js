// src/client/components/QuestionsParOperation.test.ts
// ============================================================================
// PRÉDICAT « OPÉRATION VIDÉE » — la confirmation avant de retirer la
// DERNIÈRE question d'une opération. Fonction pure : aucun rendu, aucun
// glisser-déposer, juste les 5 cas qui comptent.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { operationVideeApresDeplacement } from './QuestionsParOperation';
const colonne = (key, id_service, ids) => ({
    key,
    id_service,
    criteres: ids.map((id) => ({ id })),
});
describe('operationVideeApresDeplacement', () => {
    test('dernière question d\'une opération vers une autre → confirmation', () => {
        expect(operationVideeApresDeplacement(colonne('service-5', 5, [4]), 4, 'service-4')).toBe(true);
    });
    test('dernière question d\'une opération vers le vivier → confirmation', () => {
        expect(operationVideeApresDeplacement(colonne('service-5', 5, [4]), 4, 'unassigned')).toBe(true);
    });
    test('opération à 2 questions, une part → pas de confirmation', () => {
        expect(operationVideeApresDeplacement(colonne('service-4', 4, [11, 12]), 11, 'service-5')).toBe(false);
    });
    test('réordonnancement interne → jamais de confirmation', () => {
        expect(operationVideeApresDeplacement(colonne('service-5', 5, [4]), 4, 'service-5')).toBe(false);
    });
    test('le vivier n\'est pas une opération → jamais de confirmation', () => {
        expect(operationVideeApresDeplacement(colonne('unassigned', null, [9]), 9, 'service-4')).toBe(false);
        expect(operationVideeApresDeplacement(null, 9, 'service-4')).toBe(false);
        expect(operationVideeApresDeplacement(undefined, 9, 'service-4')).toBe(false);
    });
    test('colonne d\'une question mais autre id demandé → pas de confirmation', () => {
        // Garde contre une incohérence d'état : on ne confirme que si la
        // question déplacée est bien l'unique occupante de la colonne.
        expect(operationVideeApresDeplacement(colonne('service-5', 5, [4]), 999, 'service-4')).toBe(false);
    });
});
//# sourceMappingURL=QuestionsParOperation.test.js.map