// src/client/pages/ConfigurationCriteresPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Configuration des critères ».
//
// La page la plus riche en contrôles de l'application : filtres d'agence, éditeur de critères, listes d'options, scores par option, mode de mesure, orientation. Chaque contrôle non nommé y est un obstacle pour un lecteur d'écran — et l'écran où se joue la qualité de la mesure elle-même.
//
// Monté dans son ÉTAT CHARGÉ, avec une assertion qui le prouve avant
// d'auditer : sans elle, le test passerait sur un écran vide.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgenceCriteres, getAgences, getCriteres, getServices } from 'wasp/client/operations';
import { ConfigurationCriteresPage } from './ConfigurationCriteresPage';
import { auditerPage } from '../__mocks__/harnaisA11y';

vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
// Page de DIRECTION : sans `platformRole: 'NONE'`,
// `RequireEnterpriseRole` redirige vers /platform et la page n'est jamais
// montée — le test passerait sans rien vérifier.
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock({ role: 'DIRECTION', id_agence: null, platformRole: 'NONE' }));

const AGENCES = [
  { id: 1, nom_agence: 'Agence Centrale', commune: 'Abidjan', archive: false },
  { id: 2, nom_agence: 'Agence Yopougon', commune: 'Abidjan', archive: false },
];

const SERVICES = [
  { id: 10, libelle_service: 'Retrait', id_agence: 1, archive: false, criteres: [] },
  { id: 11, libelle_service: 'Dépôt', id_agence: 1, archive: false, criteres: [] },
];

// `getCriteres` renvoie un TABLEAU de critères (pas un objet) — la page
// fait `criteres.filter(...)`. Les options portent `est_scorable` et
// `score` : l'éditeur les affiche, elles doivent donc exister.
const CRITERES = [
    {
      id: 1,
      libelle_critere: 'Satisfaction globale',
      description: null,
      type_reponse: 'SMILEY',
      obligatoire: true,
      archive: false,
      scoring_mode: 'SMILEY',
      orientation: 'HIGHER_BETTER',
      version: 1,
      options: [],
    },
    {
      id: 2,
      libelle_critere: 'Recommanderiez-nous cet guichet ?',
      description: null,
      type_reponse: 'QCM',
      obligatoire: true,
      archive: false,
      scoring_mode: 'QCM',
      orientation: 'HIGHER_BETTER',
      version: 1,
      options: [
        { id: 21, libelle: 'Oui', score: 100, poids: 1, est_scorable: true, actif: true, code_metier: 'OUI', ordre_affichage: 1, score_provenance: 'EXPLICIT' },
        { id: 22, libelle: 'Non', score: 0, poids: 1, est_scorable: true, actif: true, code_metier: 'NON', ordre_affichage: 2, score_provenance: 'EXPLICIT' },
      ],
    },
];

const AGENCE_CRITERES = [1, 2];


const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <main id="contenu-principal">
        <ConfigurationCriteresPage />
      </main>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getAgences).mockResolvedValue(AGENCES as any);
  vi.mocked(getServices).mockResolvedValue(SERVICES as any);
  vi.mocked(getCriteres).mockResolvedValue(CRITERES as any);
  vi.mocked(getAgenceCriteres).mockResolvedValue(AGENCE_CRITERES as any);
});

describe('A4 — audit axe-core de la page Configuration des critères', () => {
  test('la page chargée ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getAllByText(/Satisfaction globale/).length).toBeGreaterThan(0);
    await auditerPage('page Configuration des critères — état chargé');
  });
});
