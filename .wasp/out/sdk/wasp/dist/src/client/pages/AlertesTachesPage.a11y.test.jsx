// src/client/pages/AlertesTachesPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Alertes & Taches ».
//
// L'audit V0 signalait sur cette page des « onglets sans role=tabpanel ».
// L'audit automatisé vérifie si ce point a été traité, et attrape au
// passage ce que la revue de code avait laissé passer.
//
// La page est auditée avec des données (une alerte, une tâche) : un
// écran vide ne contient ni badge, ni onglet, ni tableau.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgentsByAgence, getAlertes, getTacheHistorique, getTachesCorrectives, } from 'wasp/client/operations';
import { AlertesTachesPage } from './AlertesTachesPage';
import { auditerPage } from '../__mocks__/harnaisA11y';
vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());
const AGENTS = [{ id: 3, nom: 'Kouassi', prenom: 'Aya', id_agence: 1, role: 'AGENT' }];
// Noms de champs alignés sur le schéma Prisma : `Alerte.message`,
// `Alerte.statut_alerte` (et non `libelle`/`statut`). Une fixture aux
// noms inventés vide silencieusement la liste — le test échouerait sur son
// propre assertion, sans dire que le problème est la fixture.
const ALERTES = [
    {
        id: 1,
        message: 'Attente trop longue au guichet',
        type_alerte: 'NOTE_CRITIQUE',
        statut_alerte: 'NOUVELLE',
        date_creation: '2026-09-20T09:00:00Z',
        archive: false,
        guichet: { nom_guichet: 'Guichet 1', id_agence: 1 },
        reponse: {
            id_soumission: 's1',
            date_reponse: '2026-09-20T09:00:00Z',
            score_brut: 1,
            reponses: [{ critere: { libelle_critere: 'Satisfaction' }, commentaire_texte: null }],
        },
    },
    {
        id: 2,
        message: 'Silence d’évaluation sur le mois',
        type_alerte: 'SILENCE_EVALUATION',
        statut_alerte: 'TRAITEE',
        date_creation: '2026-09-21T09:00:00Z',
        archive: false,
        guichet: { nom_guichet: 'Guichet 2', id_agence: 1 },
        reponse: { id_soumission: 's2', date_reponse: '2026-09-21T09:00:00Z', score_brut: 3, reponses: [] },
    },
];
const TACHES = [
    {
        id: 10,
        titre: 'Former l’agent au guichet 1',
        description: 'Session de formation de deux heures',
        statut_tache: 'A_FAIRE',
        date_creation: '2026-09-22T09:00:00Z',
        date_echeance: '2026-09-30T00:00:00Z',
        archive: false,
        id_alerte: 1,
    },
];
const monter = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    return render(<QueryClientProvider client={client}>
      <main id="contenu-principal">
        <AlertesTachesPage />
      </main>
    </QueryClientProvider>);
};
beforeEach(() => {
    vi.mocked(getAgentsByAgence).mockResolvedValue(AGENTS);
    vi.mocked(getAlertes).mockResolvedValue(ALERTES);
    vi.mocked(getTachesCorrectives).mockResolvedValue(TACHES);
    vi.mocked(getTacheHistorique).mockResolvedValue([]);
});
describe('A4 — audit axe-core de la page Alertes & Tâches', () => {
    test('la page chargée ne présente aucune violation WCAG', async () => {
        monter();
        await act(async () => {
            await Promise.resolve();
            await new Promise((r) => setTimeout(r, 60));
        });
        // L'état chargé est atteint : sans alerte, on auditerait un écran vide.
        const aDuContenu = screen.queryAllByText(/Attente trop longue/).length > 0
            || screen.queryAllByText(/Former l/).length > 0;
        expect(aDuContenu, 'la page doit afficher au moins une alerte ou une tâche').toBe(true);
        await auditerPage('page Alertes & Tâches — état chargé');
    });
});
//# sourceMappingURL=AlertesTachesPage.a11y.test.jsx.map