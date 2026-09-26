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

/**
 * `ResizeObserver` n'existe pas dans jsdom.
 *
 * Les composants qui mesurent un conteneur (Recharts, tableaux fluides)
 * l'utilisent au montage. Sans double, le test échoue sur une ABSENCE
 * D'API — ce qui n'a rien à voir avec le code que l'on veut auditer, et
 * qui décourage d'ajouter une page à l'audit.
 *
 * On fournit donc une double muette : elle observe, ne notifie jamais.
 * Une page qui dépend réellement d'un redimensionnement ne sera pas
 * testée comme telle — ce que le rendu navigateur couvre de toute façon.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * Délai par défaut du projet `ui`.
 *
 * 5 s est le défaut vitest, et un audit axe-core sur une page interne
 * réelle (tableau de synthèse, cartes, filtres) dépasse ce seuil de façon
 * régulière. Résultat : des tests instables qui échouent sur le temps
 *machine, jamais sur le code — le pire signal possible, parce
 * qu'on apprend à les ignorer.
 *
 * Le délai est relevé pour TOUT le projet UI, pas au cas par cas : un
 * timeout posé sur un seul test masque la variance, alors que le
 * phenomenon est structurel (jsdom + analyse du DOM).
 */
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});
