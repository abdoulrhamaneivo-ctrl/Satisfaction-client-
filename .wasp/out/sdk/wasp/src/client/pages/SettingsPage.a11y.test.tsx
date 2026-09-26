// src/client/pages/SettingsPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Réglages ».
//
// La page de réglages expose le statut de l'IA (fournisseur, modèle, compteurs) et la charte. C'est un écran de configuration avancée : les compteurs et les libellés techniques y sont denses, et un statut affiché par couleur seule est invisible au lecteur d'écran.
//
// Monté dans son ÉTAT CHARGÉ, avec une assertion qui le prouve avant
// d'auditer : sans elle, le test passerait sur un écran vide.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAIStatus, getBranding } from 'wasp/client/operations';
import { SettingsPage } from './SettingsPage';
import { auditerPage } from '../__mocks__/harnaisA11y';

vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());

const AI_STATUS = {
  configured: true,
  provider: 'OpenRouter',
  model: 'nvidia/nemotron-3.5-lightning:free',
  baseUrl: 'https://openrouter.ai/api/v1',
  stats: { total: 120, done: 110, pending: 6, failed: 4 },
};

const BRANDING = {
  platform_name: 'Yéba',
  form_title: 'Votre avis compte !',
  form_subtitle: 'Notez-nous en 10 secondes',
  hide_yeba_branding: false,
  color_primary: '148 100% 26%',
};


const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <main id="contenu-principal">
        <SettingsPage />
      </main>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getAIStatus).mockResolvedValue(AI_STATUS as any);
  vi.mocked(getBranding).mockResolvedValue(BRANDING as any);
});

describe('A4 — audit axe-core de la page Réglages', () => {
  test('la page chargée ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getAllByText(/OpenRouter/).length).toBeGreaterThan(0);
    await auditerPage('page Réglages — état chargé');
  });
});
