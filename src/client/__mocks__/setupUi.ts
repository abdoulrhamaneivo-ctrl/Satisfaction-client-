// src/client/__mocks__/setupUi.ts
// ============================================================================
// Environnement de test des parcours (jsdom).
// Ajoute ce qui manque à jsdom pour que la page de collecte se comporte
// comme dans un navigateur réel : crypto.randomUUID, matchMedia, scrollIntoView.
// ============================================================================
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom ne fournit pas crypto.randomUUID : sans lui, la soumission échoue
// silencieusement (le défaut constaté par l'audit, P13).
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis.crypto as any).randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = () => '00000000-0000-4000-8000-000000000000';
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});
