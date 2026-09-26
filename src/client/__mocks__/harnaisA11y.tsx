// src/client/__mocks__/harnaisA11y.tsx
// ============================================================================
// Harnais partagé des audits d'accessibilité (axe-core sous jsdom).
//
// Raison d'être : le premier audit (page « Avis ») a exigé une longue
// série de mocks écrits à la main — `react-router`, `react-router-dom`,
// `NavLink`, `routes`, `useAuth`, framer-motion, BrandContext. Tout cela
// était recopié dans chaque fichier de test, avec le risque que deux
// audits ne montent pas la même page de la même façon.
//
// `vi.mock` est hissé par vitest : ces factories doivent donc être
// déclarées dans chaque fichier appelant. Pour éviter la recopie, on
// exporte des FRAGMENTS à insérer (`routerMock()`, `authMock(user)`,
// `motionMock()`, `brandMock()`) : la duplication disparaît, le
// hoisting reste correct.
//
// Ce que ce harnais NE PERMET PAS de vérifier (jsdom n'a pas de rendu) :
//   - 1.4.3 contraste : la couleur composite n'existe pas ;
//   - 2.4.13 focus visible, 2.5.8 taille de cible réelle : géométrie.
// Ces trois-là exigent un navigateur (Playwright) — voir §4 de
// docs/accessibility/WCAG_22_AA_AUDIT.md.
// ============================================================================
import React from 'react';
import axe from 'axe-core';

/** Mocks react-router / react-router-dom : la page DOIT les déclarer. */
export const routerMock = () => ({
  useParams: () => ({ id: '1', code: 'ABCDEFGHJK' }),
  useLocation: () => ({ pathname: '/avis', search: '', hash: '' }),
  useNavigate: () => () => undefined,
  // Les pages de gestion lisent l'URL (filtres dans la barre d'adresse).
  useSearchParams: () => [new URLSearchParams(), () => undefined],
  Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  // NavLink sert aux onglets de PageShell.
  NavLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  // Le routeur Wasp est résolu via ses routes générées.
  routes: { LoginRoute: { to: '/login' }, AccountRoute: { to: '/account' } },
});

/**
 * Mocks framer-motion : le test porte sur le DOM, pas sur les animations.
 * Sans ce mock, le `requestAnimationFrame` de jsdom rend les dates de
 * montage non déterministes sous horloge simulée.
 */
export const motionMock = () => ({
  motion: new Proxy({}, {
    get: (_t: unknown, cle: string) => {
      const Tag = cle === 'create' ? 'div' : String(cle);
      const Composant = ({ children, ...props }: any) => {
        const {
          initial, animate, exit, transition, whileHover, whileTap,
          variants, layout, layoutId, onAnimationStart, onAnimationComplete,
          ...reste
        } = props;
        return React.createElement(Tag, reste, children);
      };
      Composant.displayName = `motion-${Tag}`;
      return Composant;
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useReducedMotion: () => true,
  LayoutGroup: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
});

/** Mock de la charte : la page auditée n'a pas besoin du vrai contexte. */
export const brandMock = () => ({ useBrand: () => ({ brandConfig: {}, loading: false, isCustom: false }) });

/**
 * Utilisateur authentifié.
 *
 * Obligatoire : `RequireAuth` redirige vers /login tant que
 * `useAuth().data` est undefined. Sans utilisateur, la page auditée n'est
 * jamais montée et le test auditerait la page de connexion — c'est-à-dire
 * passerait à vide.
 */
export const authMock = (user: Record<string, unknown> = {}) => ({
  useAuth: () => ({
    isLoading: false,
    data: {
      id: 1,
      email: 'chef@agence.ci',
      role: 'CHEF_AGENCE',
      id_agence: 1,
      id_entreprise: 42,
      actif: true,
      ...user,
    },
  }),
});

/** Règles que jsdom ne peut pas juger : on ne veut pas de faux positifs. */
const REGLES_HSL = { 'color-contrast': { enabled: false } } as const;

/**
 * Exécute axe-core et échoue avec un message lisible.
 *
 * Le message nomme la règle, son impact et les éléments concernés : un
 * « 1 violation » sans détail ne permet pas de corriger quoi que ce soit.
 */
export async function auditerPage(libelle: string, racine: HTMLElement | Document = document.body) {
  const resultats = await axe.run(racine, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    rules: { ...REGLES_HSL },
  });
  const violations = resultats.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    aide: v.help,
    noeuds: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 160)),
  }));
  if (violations.length > 0) {
    const resume = violations
      .map((v) => `[${v.impact}] ${v.id} — ${v.aide}\n    ${v.noeuds.join('\n    ')}`)
      .join('\n');
    throw new Error(`${libelle} — ${violations.length} violation(s) axe-core :\n${resume}`);
  }
}
