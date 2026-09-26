// src/client/pages/AvisPage.a11y.test.tsx
// ============================================================================
// VAGUE 4 (A4) — Audit axe-core de la page « Avis » (back-office).
//
// L'audit a11y automatisé ne portait que sur le parcours PUBLIC
// (`CollectePage.a11y.test.tsx`). C'est une limite : la page « Avis » est
// l'écran interne le plus consulté — un tableau de synthèse d'avis, lu
// au quotidien par les chefs d'agence et la direction.
//
// La page est auditée dans son état CHARGÉ, pas à vide : les violations
// d'accessibilité vivent dans les états riches (tableaux, badges, liens
// d'action), pas dans un écran vide de données.
//
// Rappel de ce que jsdom ne peut pas vérifier (voir §4 de
// docs/accessibility/WCAG_22_AA_AUDIT.md) : contraste rendu, focus
// visible, taille de cible réelle. Ces trois-là relèvent d'un navigateur.
// ============================================================================
import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import {
  getAgences,
  getAvisGroupes,
  getGuichets,
  getServices,
} from 'wasp/client/operations';
import { AvisPage } from './AvisPage';

// La page importe depuis 'react-router' (et non react-router-dom) : les
// deux doivent être mockés, sinon `useLocation` est undefined.
vi.mock('react-router', () => ({
  useParams: () => ({ code: 'ABCDEFGHJK' }),
  useLocation: () => ({ pathname: '/avis', search: '', hash: '' }),
  useNavigate: () => () => undefined,
  Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  // NavLink sert aux onglets de PageShell.
  NavLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  // Le routeur Wasp est résolu via ses routes générées.
  routes: { LoginRoute: { to: '/login' }, AccountRoute: { to: '/account' } },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ code: 'ABCDEFGHJK' }),
  Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  NavLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useNavigate: () => () => undefined,
  useLocation: () => ({ pathname: '/avis', search: '', hash: '' }),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// RequireAuth redirige vers /login tant que `useAuth().data` est undefined :
// sans cet utilisateur, la page auditée ne serait jamais montée et le test
// passerait sur la page de connexion.
vi.mock('wasp/client/auth', () => ({
  useAuth: () => ({
    isLoading: false,
    data: { id: 1, email: 'chef@agence.ci', role: 'CHEF_AGENCE', id_agence: 1, id_entreprise: 42, actif: true },
  }),
}));

vi.mock('framer-motion', async () => {
  const ReactLocal = await import('react');
  const transversal = (Tag: any) => {
    const Composant = ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        variants, layout, layoutId, onAnimationStart, onAnimationComplete,
        ...reste
      } = props;
      return ReactLocal.createElement(Tag, reste, children);
    };
    Composant.displayName = 'motion-' + (typeof Tag === 'string' ? Tag : 'component');
    return Composant;
  };
  return {
    motion: new Proxy({}, { get: (_t, cle) => transversal(cle === 'create' ? 'div' : String(cle)) }),
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => true,
    LayoutGroup: ({ children }: any) => children,
    MotionConfig: ({ children }: any) => children,
  };
});

vi.mock('../context/BrandContext', () => ({
  useBrand: () => ({ brandConfig: {}, loading: false, isCustom: false }),
}));

// --- Données de test : un avis par soumission, avec commentaire et note ---
const AGENCES = [{ id: 1, nom_agence: 'Agence Centrale', commune: 'Abidjan' }];
const SERVICES = [{ id: 10, libelle_service: 'Retrait', id_agence: 1 }];
const GUICHETS = [{ id: 7, nom_guichet: 'Guichet 1', id_agence: 1, actif: true, archive: false }];

const avis = (i: number) => ({
  id_soumission: `soumission-${i}`,
  date_reponse: new Date('2026-09-20T10:00:00Z').toISOString(),
  score_moyen: [5, 4, 3, 2, 1][i % 5],
  score_officiel: [5, 4, 3, 2, 1][i % 5],
  score_normalise: [100, 80, 60, 40, 20][i % 5],
  commentaire_texte: i % 2 === 0 ? `Commentaire ${i}` : null,
  sentiments_retenus: ['POSITIVE', 'NEGATIVE', 'NEUTRE'][i % 3],
  score_ia: 50,
  guichet: { nom_guichet: `Guichet ${(i % 3) + 1}` },
  service: { libelle_service: 'Retrait' },
  agence: { nom_agence: 'Agence Centrale' },
  reponses: [
    {
      id: i * 10,
      score_officiel: [5, 4, 3, 2, 1][i % 5],
      score_normalise: [100, 80, 60, 40, 20][i % 5],
      commentaire_texte: null,
      critere: { libelle_critere: 'Satisfaction globale', type_reponse: 'SMILEY' },
    },
    {
      id: i * 10 + 1,
      score_officiel: null,
      score_normalise: null,
      commentaire_texte: `Détail ${i}`,
      critere: { libelle_critere: 'Amélioration', type_reponse: 'TEXTE' },
    },
  ],
});

// La query renvoie une PAGE : { avis, hasMore }. Renvoyer un tableau
// simple laisserait la page dans son état vide — et le test auditerait
// l'écran « aucun avis » sans que rien ne le signale.
const AVIS_PAGE = { avis: [1, 2, 3, 4, 5].map(avis), hasMore: false };

const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <main id="contenu-principal">
        <AvisPage />
      </main>
    </QueryClientProvider>,
  );
};

const auditer = async (libelle: string) => {
  const resultats = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    // Le contraste et la géométrie sont hors de portée de jsdom.
    rules: { 'color-contrast': { enabled: false } },
  });
  const violations = resultats.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    aide: v.help,
    noeuds: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)),
  }));
  expect(violations, `${libelle} — ${violations.length} violation(s) axe-core`).toEqual([]);
};

beforeEach(() => {
  vi.mocked(getAgences).mockResolvedValue(AGENCES as any);
  vi.mocked(getServices).mockResolvedValue(SERVICES as any);
  vi.mocked(getGuichets).mockResolvedValue(GUICHETS as any);
  vi.mocked(getAvisGroupes).mockResolvedValue(AVIS_PAGE as any);
});

describe('A4 — audit axe-core de la page Avis', () => {
  test('la page chargée avec des avis ne présente aucune violation WCAG', async () => {
    monter();
    await act(async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    // L'état chargé est bien atteint : sans cette affirmation, le test
    // auditerait un écran vide et ne prouverait rien. On cherche le texte
    // d'un commentaire de jeu de données, pas un rôle de tableau : la page
    // rend une liste de cartes, pas un <table>.
    // La carte d'un avis affiche son service et son score : on s'appuie sur
    // un texte que la page rend réellement, plutôt que sur le commentaire
    // (qui n'apparaît que dans le détail dépliable).
    expect(screen.getAllByText('Retrait').length).toBeGreaterThan(0);
    await auditer('page Avis — état chargé');
  });
});
