// src/client/pages/ArchivesPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Archives ».
//
// Les archives rassemblent guichets, agences, alertes et tâches. C'est l'écran le plus hétérogène de l'application : quatre types d'objets dans un même écran, donc le risque le plus élevé de listes, filtres et libellés sans nom.
//
// Monté dans son ÉTAT CHARGÉ, avec une assertion qui le prouve avant
// d'auditer : sans elle, le test passerait sur un écran vide.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getArchives } from 'wasp/client/operations';
import { ArchivesPage } from './ArchivesPage';
import { auditerPage } from '../__mocks__/harnaisA11y';
vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());
// Forme réelle de `getArchives` : { guichets, agences, alertes, taches }.
const ARCHIVES = {
    guichets: [
        { id: 7, nom_guichet: 'Guichet 1', code_public: 'ABCDEFGHJK', archive: true, date_archivage: '2026-03-01T09:00:00Z' },
    ],
    agences: [
        { id: 3, nom_agence: 'Agence Bassam', commune: 'Bassam', date_archivage: '2026-02-01T09:00:00Z' },
    ],
    alertes: [
        { id: 1, message: 'Attente trop longue', statut_alerte: 'TRAITEE', date_creation: '2026-01-15T09:00:00Z', archive: true },
    ],
    taches: [
        { id: 10, titre: 'Former l’agent', statut_tache: 'TERMINEE', date_creation: '2026-01-16T09:00:00Z', archive: true },
    ],
};
const monter = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    return render(<QueryClientProvider client={client}>
      <main id="contenu-principal">
        <ArchivesPage />
      </main>
    </QueryClientProvider>);
};
beforeEach(() => {
    vi.mocked(getArchives).mockResolvedValue(ARCHIVES);
});
describe('A4 — audit axe-core de la page Archives', () => {
    test('la page chargée ne présente aucune violation WCAG', async () => {
        monter();
        await act(async () => {
            await Promise.resolve();
            await new Promise((r) => setTimeout(r, 0));
        });
        expect(screen.getAllByText(/Guichet 1/).length).toBeGreaterThan(0);
        await auditerPage('page Archives — état chargé');
    });
});
//# sourceMappingURL=ArchivesPage.a11y.test.jsx.map