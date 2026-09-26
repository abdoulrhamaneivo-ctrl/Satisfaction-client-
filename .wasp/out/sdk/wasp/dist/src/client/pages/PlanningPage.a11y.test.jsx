// src/client/pages/PlanningPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Planning ».
//
// Le planning est le seul écran de l'application construit comme un
// GRID (7 jours × créneaux) : c'est là que les sémantiques de tableau,
// les en-têtes de colonne et les libellés de cellule sont censés porter
// l'information. Un audit a11y y a donc plus de chances de trouver un
// défaut structurel que sur une page de cartes.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAffectationsDuJour, getAgents, getGuichets, getModelesHoraires } from 'wasp/client/operations';
import { PlanningPage } from './PlanningPage';
import { auditerPage } from '../__mocks__/harnaisA11y';
vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const AGENTS = [
    { id: 3, nom: 'Kouassi', prenom: 'Aya', role: 'AGENT', actif: true, id_agence: 1 },
    { id: 4, nom: 'Traoré', prenom: 'Yao', role: 'AGENT', actif: true, id_agence: 1 },
];
const GUICHETS = [
    { id: 7, nom_guichet: 'Guichet 1', actif: true, archive: false, id_agence: 1 },
];
const AFFECTATIONS = AGENTS.map((agent, i) => ({
    id: 100 + i,
    id_agent: agent.id,
    id_guichet: GUICHETS[0].id,
    date: '2026-09-28',
    heure_debut: '08:00',
    heure_fin: '16:00',
    agent,
    guichet: GUICHETS[0],
}));
const MODELES = JOURS.flatMap((_, index) => [
    { id: index * 2 + 1, jour_semaine: index, heure_debut: '08:00', heure_fin: '12:00', role: 'AGENT' },
    { id: index * 2 + 2, jour_semaine: index, heure_debut: '12:00', heure_fin: '16:00', role: 'AGENT' },
]);
const monter = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    return render(<QueryClientProvider client={client}>
      <main id="contenu-principal">
        <PlanningPage />
      </main>
    </QueryClientProvider>);
};
beforeEach(() => {
    vi.mocked(getAgents).mockResolvedValue(AGENTS);
    vi.mocked(getGuichets).mockResolvedValue(GUICHETS);
    vi.mocked(getAffectationsDuJour).mockResolvedValue(AFFECTATIONS);
    vi.mocked(getModelesHoraires).mockResolvedValue(MODELES);
});
describe('A4 — audit axe-core de la page Planning', () => {
    test('la page chargée ne présente aucune violation WCAG', async () => {
        monter();
        await act(async () => {
            await Promise.resolve();
            await new Promise((r) => setTimeout(r, 0));
        });
        // État chargé : un agent affecté doit apparaître.
        const afficheAgent = screen.queryAllByText(/Kouassi|Traoré/).length > 0
            || screen.queryAllByText(/Aya|Yao/).length > 0;
        expect(afficheAgent, 'le planning doit afficher au moins un agent affecté').toBe(true);
        await auditerPage('page Planning — état chargé');
    });
});
//# sourceMappingURL=PlanningPage.a11y.test.jsx.map