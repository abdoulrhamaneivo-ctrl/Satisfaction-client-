// src/client/pages/CollectePage.a11y.test.tsx
// ============================================================================
// VAGUE 4 / A4 — audit automatique axe-core sur le parcours public.
//
// Pourquoi ce fichier existe
// -------------------------
// Jusqu'ici, les règles d'accessibilité étaient vérifiées par des tests
// écrits à la main, un par un. C'est fragile : chaque règle non prévue
// passe silencieusement, et un test manuel forgets ce qu'il couvrait.
//
// axe-core applique le jeu de règles WCAG 2.x automatiquement. Ce test ne
// vérifie donc pas « ce que je pensais avoir corrigé » mais « ce que
// l'auditeur automatique trouve encore » — y compris les cas que je n'ai
// pas su prévoir.
//
// Ce qu'axe-core NE PEUT PAS vérifier sous jsdom, et qui reste donc
// ouvert (voir docs/accessibility/WCAG_22_AA_AUDIT.md, §4) :
//   - 1.4.3 contraste : jsdom ne calcule pas de rendu, donc pas de
//     couleur composite réelle (c'est couvert à part, par les tests de
//     src/shared/branding.test.ts qui composent l'opacité) ;
//   - 2.4.13 focus visible et 2.5.8 taille de cible : ce sont des
//     propriétés de rendu et de géométrie, hors de portée d'un DOM.
//
// L'alternative serait Playwright + un vrai navigateur : beaucoup plus
// coûteux (téléchargement du navigateur, il faut faire tourner l'app
// entière avec sa base) pour un gain réel mais circonscrit.
// ============================================================================
import axe from 'axe-core';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFormDefinitionForGuichet, soumettreAvis, completerSoumission } from 'wasp/client/operations';
import { CollectePage } from './CollectePage';
import { auditerPage } from '../__mocks__/harnaisA11y';

// --- Mocks : mêmes qu'un parcours jsdom classique -----------------------------
// Mocks partagés — import DYNAMIQUE dans chaque factory, `vi.mock` étant
// hissé (cf. harnaisA11y.tsx).
vi.mock('react-router-dom', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router', async () => (await import('../__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const formDef = {
  guichetName: 'Guichet Centre',
  services: [
    {
      id: 10,
      libelle_service: 'Retrait',
      criteres: [
        { id: 1, libelle_critere: 'Satisfaction', description: null, type_reponse: 'SMILEY', obligatoire: true, options: [] },
        { id: 2, libelle_critere: 'Accueil', description: null, type_reponse: 'OUI_NON', obligatoire: true, options: [] },
      ],
    },
  ],
  agencyCriteres: [],
  brandConfig: null,
};

const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      {/* Le <main> est fourni par App.tsx en production (route /q/*) : sans
          lui, axe-core signale à juste titre `region` (« All page content
          should be contained by landmarks »), la page étant rendue seule
          dans ce harnais. On reproduit donc le landmark réel plutôt que de
          désactiver la règle — sinon on perdrait la moitié des contrôles
          structurels. Cf. src/client/App.tsx, branche `standaloneRoutes`. */}
      <main id="contenu-principal">
        <CollectePage />
      </main>
    </QueryClientProvider>,
  );
};

describe('A4 — audit axe-core du parcours public', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getFormDefinitionForGuichet).mockReset();
    vi.mocked(getFormDefinitionForGuichet).mockResolvedValue(formDef as any);
    vi.mocked(soumettreAvis).mockReset();
    vi.mocked(soumettreAvis).mockResolvedValue({ ok: true } as any);
    vi.mocked(completerSoumission).mockReset();
    vi.mocked(completerSoumission).mockResolvedValue({ ok: true } as any);
  });

  test('la première question ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText('Satisfaction')).toBeTruthy();
    await auditerPage('question SMILEY affichée');
  });

  test('la question Oui/Non ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    // Réponse à la première question pour atteindre la seconde.
    const smiley = screen.getAllByRole('radio')[4];
    await act(async () => {
      smiley.click();
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getAllByRole('radiogroup').length).toBeGreaterThan(0);
    await auditerPage('question OUI_NON affichée');
  });

  test("l'étape commentaire ne présente aucune violation WCAG", async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const smileys = screen.getAllByRole('radio');
    await act(async () => {
      smileys[4].click();
      await vi.advanceTimersByTimeAsync(3000);
    });
    const ouiNon = screen.getAllByRole('radio');
    await act(async () => {
      ouiNon[ouiNon.length - 1].click();
      await vi.advanceTimersByTimeAsync(3000);
    });
    await auditerPage('étape commentaire affichée');
  });
});

/* ============================================================================
 * Le test qui empêche les trois ci-dessus de passer à vide.
 * ============================================================================
 * axe-core sous jsdom peut silencieusement ne rien signaler — une
 * configuration incompatible, une règle désactivée à tort, une API qui ne
 * résout plus. Les trois tests ci-dessus verdiraient alors sans que quoi
 * que ce soit n'ait été vérifié.
 *
 * Ce test témoin installe volontairement des violations évidentes
 * évidentes (bouton sans nom, image sans alternative, liste sans
 * structure) et exige qu'axe les trouve. S'il ne les voit pas, c'est
 * l'auditeur qui est cassé, pas la page qu'il examine.
 */
describe('A4 — l\'auditeur fonctionne (témoin)', () => {
  test('axe-core signale une violation volontairement injectée', async () => {
    const { container } = render(
      <main>
        <button>{/* aucun nom accessible */}</button>
        <img src="/logo.png" />
        <ul>
          <div>élément enfant direct d'une liste</div>
        </ul>
        <input type="text" />
      </main>,
    );
    const resultats = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    const ids = (resultats.violations as Array<{ id: string }>).map((v) => v.id);
    expect(ids, `axe n'a rien signalé — l'auditeur est cassé (ids: ${ids})`).toContain('button-name');
    expect(ids).toContain('image-alt');
    expect(ids.length, 'seulement ' + ids.length + ' violation(s) détectée(s)').toBeGreaterThanOrEqual(3);
  });
});
