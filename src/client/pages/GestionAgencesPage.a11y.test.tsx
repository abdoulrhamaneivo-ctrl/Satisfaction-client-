// src/client/pages/GestionAgencesPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Agences ».
//
// Les agences sont pilotées depuis la direction. Une liste d'agences sans nom accessible sur ses actions (archivage, édition) oblige l'utilisateur à deviner le bouton.
//
// Monté dans son ÉTAT CHARGÉ, avec une assertion qui le prouve avant
// d'auditer : sans elle, le test passerait sur un écran vide.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgences } from 'wasp/client/operations';
import { GestionAgencesPage } from './GestionAgencesPage';
import { auditerPage } from '../__mocks__/harnaisA11y';

vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
// La gestion du réseau d'agences est une page de DIRECTION : le mock
// d'authentification prend ici un rôle de direction. `platformRole`
// doit être présent et valoir NONE — sans lui, `RequireEnterpriseRole`
// considère tout compte comme un compte plateforme et redirige vers
// /platform, si bien que la page auditée n'est jamais montée.
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock({ role: 'DIRECTION', id_agence: null, platformRole: 'NONE' }));

// `utilisateurs` porte le chef en place : sans lui, la carte bascule sur
// le rendu « aucun chef désigné », qui propose une action. La fixture en
// fournit un pour couvrir les DEUX branches de ce rendu.
const AGENCES = [
  {
    id: 1,
    nom_agence: 'Agence Centrale',
    commune: 'Abidjan',
    archive: false,
    date_creation: '2026-01-05T09:00:00Z',
    utilisateurs: [{ id: 4, nom: 'Traoré', prenom: 'Yao', role: 'CHEF_AGENCE' }],
  },
  {
    id: 2,
    nom_agence: 'Agence Yopougon',
    commune: 'Abidjan',
    archive: false,
    date_creation: '2026-02-05T09:00:00Z',
    utilisateurs: [],
  },
];


const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <main id="contenu-principal">
        <GestionAgencesPage />
      </main>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getAgences).mockResolvedValue(AGENCES as any);
});

describe('A4 — audit axe-core de la page Agences', () => {
  test('la page chargée ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getAllByText(/Agence Centrale/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Yopougon/).length).toBeGreaterThan(0);
    await auditerPage('page Agences — état chargé');
  });
});
