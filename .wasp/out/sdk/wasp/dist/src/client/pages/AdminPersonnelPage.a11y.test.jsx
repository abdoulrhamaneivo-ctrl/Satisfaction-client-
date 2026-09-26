// src/client/pages/AdminPersonnelPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Personnel ».
//
// Cinquième écran audité. Le harness est en place : ce fichier ne décrit
// que les DONNÉES et l'AFFIRMATION d'état chargé.
//
// Cette page manipule des données nominatives (agents, rôles). Si les
// rôles étaient annoncés comme une liste déroulante sans nom, un lecteur
// d'écran ne pourrait pas dire QUEL rôle est en cours de modification —
// l'audit le vérifie.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgences, getAgentsByAgence } from 'wasp/client/operations';
import { AdminPersonnelPage } from './AdminPersonnelPage';
import { auditerPage } from '../__mocks__/harnaisA11y';
vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());
const AGENCES = [{ id: 1, nom_agence: 'Agence Centrale', commune: 'Abidjan', archive: false }];
const AGENTS = [
    {
        id: 3,
        nom: 'Kouassi',
        prenom: 'Aya',
        email: 'aya.kouassi@agence.ci',
        role: 'AGENT',
        actif: true,
        statut: 'ACTIF',
        id_agence: 1,
        date_creation: '2026-01-10T09:00:00Z',
    },
    {
        id: 4,
        nom: 'Traoré',
        prenom: 'Yao',
        email: 'yao.traore@agence.ci',
        role: 'CHEF_AGENCE',
        actif: false,
        statut: 'SUSPENDU',
        id_agence: 1,
        date_creation: '2026-02-11T09:00:00Z',
    },
];
const monter = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    return render(<QueryClientProvider client={client}>
      <main id="contenu-principal">
        <AdminPersonnelPage />
      </main>
    </QueryClientProvider>);
};
beforeEach(() => {
    vi.mocked(getAgences).mockResolvedValue(AGENCES);
    vi.mocked(getAgentsByAgence).mockResolvedValue(AGENTS);
});
describe('A4 — audit axe-core de la page Personnel', () => {
    test('la page chargée ne présente aucune violation WCAG', async () => {
        monter();
        await act(async () => {
            await Promise.resolve();
            await new Promise((r) => setTimeout(r, 0));
        });
        // État chargé : l'agent ACTIF est affiché. L'agent suspendu ne l'est
        // pas — le filtre par statut vaut « ACTIFS » par défaut, c'est le
        // comportement attendu et non un défaut de rendu.
        expect(screen.getAllByText(/Kouassi/).length).toBeGreaterThan(0);
        await auditerPage('page Personnel — état chargé');
    });
});
//# sourceMappingURL=AdminPersonnelPage.a11y.test.jsx.map