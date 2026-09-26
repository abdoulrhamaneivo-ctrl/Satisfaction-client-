// src/client/pages/GuichetsPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Guichets ».
//
// Troisième page auditee. Le harnais partagé (`__mocks__/harnaisA11y`)
// évite de recopier les mocks de route, d'authentification et de motion :
// ce fichier ne décrit que les DONNÉES et les AFFIRMATIONS.
//
// La page est auditée chargée (des guichets existent) : les violations
// d'accessibilité vivent dans les états riches — badges de statut, liens
// d'action, tableaux de codes QR — pas sur un écran vide.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgences, getGuichets, getServices } from 'wasp/client/operations';
import { GuichetsPage } from './GuichetsPage';
import { auditerPage } from '../__mocks__/harnaisA11y';

vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());

const AGENCES = [{ id: 1, nom_agence: 'Agence Centrale', commune: 'Abidjan' }];
const SERVICES = [{ id: 10, libelle_service: 'Retrait', id_agence: 1 }];
const GUICHETS = [
  {
    id: 7,
    nom_guichet: 'Guichet 1',
    code_public: 'ABCDEFGHJK',
    type_guichet: 'BANQUE',
    actif: true,
    archive: false,
    id_agence: 1,
    service: { libelle_service: 'Retrait' },
    agents: [{ id: 3, nom: 'Kouassi', prenom: 'Aya', role: 'AGENT' }],
  },
  {
    id: 8,
    nom_guichet: 'Guichet 2',
    code_public: 'LMNPQRSTUV',
    type_guichet: 'CAISSE',
    actif: false,
    archive: false,
    id_agence: 1,
    service: { libelle_service: 'Retrait' },
    agents: [],
  },
];

const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <main id="contenu-principal">
        <GuichetsPage />
      </main>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getAgences).mockResolvedValue(AGENCES as any);
  vi.mocked(getServices).mockResolvedValue(SERVICES as any);
  vi.mocked(getGuichets).mockResolvedValue(GUICHETS as any);
});

describe('A4 — audit axe-core de la page Guichets', () => {
  test('la page chargée ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    // L'état chargé est atteint : sans cette affirmation, on auditerait un
    // écran vide et le test passerait sans rien prouver.
    expect(screen.getAllByText(/Guichet 1/).length).toBeGreaterThan(0);
    await auditerPage('page Guichets — état chargé');
  });
});
