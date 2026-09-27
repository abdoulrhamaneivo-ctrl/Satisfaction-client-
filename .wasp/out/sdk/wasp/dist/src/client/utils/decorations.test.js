// src/client/utils/decorations.test.ts
import { describe, test, expect } from 'vitest';
import { afficherBlobsGlobaux } from './decorations';
describe('afficherBlobsGlobaux : zéro blob sur les pages de saisie', () => {
    test('login et pages auth → pas de blobs', () => {
        for (const route of [
            '/login',
            '/apres-connexion',
            '/request-password-reset',
            '/password-reset',
            '/email-verification',
        ]) {
            expect(afficherBlobsGlobaux(route), route).toBe(false);
        }
    });
    test('collecte QR → pas de blobs (comportement existant conservé)', () => {
        expect(afficherBlobsGlobaux('/q/ABCDEF1234')).toBe(false);
        expect(afficherBlobsGlobaux('/q/x')).toBe(false);
    });
    test('pilotage → blobs conservés', () => {
        for (const route of ['/dashboard', '/avis', '/criteres', '/guichets', '/', '/platform']) {
            expect(afficherBlobsGlobaux(route), route).toBe(true);
        }
    });
    test('chemin vide/inconnu → blobs (jamais de page nue par défaut)', () => {
        expect(afficherBlobsGlobaux('')).toBe(true);
    });
});
//# sourceMappingURL=decorations.test.js.map