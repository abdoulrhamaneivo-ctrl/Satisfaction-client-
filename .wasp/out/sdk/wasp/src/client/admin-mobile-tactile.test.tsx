// src/client/admin-mobile-tactile.test.tsx
// ============================================================================
// Task 1 (SDD 2026-10-04) — Tests COMPORTEMENTAUX tactiles (fix round 1).
//
// Pendant du test statique `admin-mobile-tactile.test.ts` (audit de strings
// sur le code source) : ici on MONTE les composants en jsdom à 360px et on
// assert le DOM rendu — tab-bar, accordéon, dialog scrollable, cibles 44px,
// unicité des ids des filtres, et garde-fou anti-overflow structurel.
//
// Limite honnête (jsdom n'a pas de moteur de layout : scrollWidth et
// clientWidth valent toujours 0) : aucune assertion géométrique réelle n'est
// possible ici. `auditerAbsenceDebordement` est donc un garde-fou
// STRUCTUREL (pas de min-width fixe nue ≥ 200px, tableaux wrappés en
// overflow-x) + la procédure manuelle navigateur est documentée dans le
// rapport de tâche (Step 5 du brief).
// ============================================================================
import React, { useState } from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getAgences,
  getAgents,
  getAgentsByAgence,
  getAffectationsDuJour,
  getAlertes,
  getAvisGroupes,
  getGuichets,
  getModelesHoraires,
  getServices,
  getTacheHistorique,
  getTachesCorrectives,
} from 'wasp/client/operations';
import { MobileTabBar } from './components/MobileTabBar';
import { PageHeader } from './components/PageHeader';
import { Dialog, DialogContent, DialogTitle } from './components/ui/dialog';
import { AvisPage, FiltresAvis } from './pages/AvisPage';
import { AlertesTachesPage } from './pages/AlertesTachesPage';
import { PlanningPage } from './pages/PlanningPage';

vi.mock('react-router', async () => (await import('./__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('./__mocks__/harnaisA11y')).routerMock());
vi.mock('framer-motion', async () => (await import('./__mocks__/harnaisA11y')).motionMock());
vi.mock('./context/BrandContext', async () => (await import('./__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('./__mocks__/harnaisA11y')).authMock());
// La tab-bar est testée isolée de react-query : badge déterministe (3).
vi.mock('./hooks/useNotificationBadge', () => ({
  useNotificationBadge: () => ({ total: 3, alertesNouvelles: 2, tachesEnRetard: 1, hasCritical: true }),
}));

// --- Viewport 360px (documente l'intention ; aucun composant ne le lit,
// mais un futur test matchMedia/pointer:coarse s'y branchera) ---
beforeEach(() => {
  (window as any).innerWidth = 360;
  window.dispatchEvent(new Event('resize'));
});

const monterAvecQueries = (page: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
};

const stabiliser = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  });
};

// --- Fixtures minimales (mêmes formes que les suites *.a11y.test.tsx) ---
const AGENCES = [{ id: 1, nom_agence: 'Agence Centrale', commune: 'Abidjan' }];
const SERVICES = [{ id: 10, libelle_service: 'Retrait', id_agence: 1 }];
const GUICHETS = [{ id: 7, nom_guichet: 'Guichet 1', type_guichet: 'Caisse', id_agence: 1, actif: true, archive: false }];
const AVIS_PAGE = {
  avis: [0, 1].map((i) => ({
    id_soumission: `soumission-${i}`,
    date_reponse: new Date('2026-09-20T10:00:00Z').toISOString(),
    score_moyen: 5 - i,
    commentaire_texte: `Commentaire ${i}`,
    guichet: { nom_guichet: 'Guichet 1' },
    service: { libelle_service: 'Retrait' },
    reponses: [],
  })),
  hasMore: false,
};
const ALERTES = [
  {
    id: 1,
    message: 'Attente trop longue au guichet',
    type_alerte: 'NOTE_CRITIQUE',
    statut_alerte: 'NOUVELLE',
    date_creation: '2026-09-20T09:00:00Z',
    guichet: { nom_guichet: 'Guichet 1', id_agence: 1 },
  },
];
const TACHES = [
  {
    id: 10,
    titre: 'Former l’agent au guichet 1',
    description: 'Session de formation',
    statut_tache: 'A_FAIRE',
    date_echeance: '2026-09-30T00:00:00Z',
    id_alerte: 1,
  },
];
const AGENTS = [{ id: 3, nom: 'Kouassi', prenom: 'Aya', role: 'AGENT', actif: true, id_agence: 1 }];
const AFFECTATIONS = [
  {
    id: 100,
    id_agent: 3,
    id_guichet: 7,
    date: '2026-09-28',
    heure_debut: '08:00',
    heure_fin: '16:00',
    agent: AGENTS[0],
    guichet: GUICHETS[0],
  },
];

/**
 * Garde-fou anti-overflow STRUCTUREL à 360px (voir en-tête : jsdom ne fait
 * pas de layout, donc pas de mesure réelle possible).
 * - Aucune `min-w-[Npx]` nue (sans préfixe sm:/md:/lg:/max-sm:) avec N ≥ 200
 *   (panneaux 640/820px des paliers morts 375/425) ;
 * - Tout <table> a un ancêtre en overflow-x (scroll interne, pas de page
 *   qui déborde).
 */
function auditerAbsenceDebordement(libelle: string, racine: HTMLElement = document.body) {
  const problemes: string[] = [];
  racine.querySelectorAll('[class]').forEach((el) => {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/);
    for (const c of classes) {
      if (c.includes(':')) continue;
      const m = c.match(/^min-w-\[(\d+(?:\.\d+)?)px\]$/);
      if (m && Number(m[1]) >= 200) {
        problemes.push(`min-w fixe ${c} sur <${el.tagName.toLowerCase()}>`);
      }
    }
  });
  const tables = racine.querySelectorAll('table');
  tables.forEach((t) => {
    let p: HTMLElement | null = t.parentElement;
    let protege = false;
    while (p && p !== racine) {
      if (/(^|\s)(overflow-x-auto|overflow-auto|overflow-x-scroll)(?=\s|$)/.test(p.getAttribute('class') ?? '')) {
        protege = true;
        break;
      }
      p = p.parentElement;
    }
    if (!protege) problemes.push('<table> sans conteneur overflow-x');
  });
  expect(problemes, `${libelle} à 360px : risque de débordement horizontal`).toEqual([]);
}

describe('Task 1 — tab-bar mobile rendue', () => {
  test('4 actions tactiles, landmark nommé, badge, mobile-only', () => {
    render(<MobileTabBar />);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale mobile' });
    // Mobile-only : desktop utilise la Sidebar existante.
    expect(nav.className, 'tab-bar réservée mobile (lg:hidden)').toContain('lg:hidden');
    // Safe-area iOS : branchée en style inline `env(...)`, que jsdom
    // jette au parsing (déclaration vide dans le DOM de test) — couverte
    // par le test statique (`safe-area-inset-bottom` dans la source).
    // Ici on prouve la barre basse : ancrée en bas du viewport.
    for (const classe of ['fixed', 'bottom-0', 'inset-x-0']) {
      expect(nav.className, `tab-bar ancrée en bas (${classe})`).toContain(classe);
    }
    // Les 3 destinations + l'action de création. Note : le mock routeur
    // rend <a> sans href (pas de rôle link) — on interroge le texte.
    for (const nom of ['Dashboard', 'Avis', 'Alertes']) {
      const el = within(nav).getByText(nom);
      expect(el.closest('a'), `action ${nom} doit être un lien`).toBeTruthy();
    }
    const creer = screen.getByRole('button', { name: /Créer/ });
    // Chaque action >= 44px (WCAG 2.5.8).
    const actions = [...nav.querySelectorAll('a, button')];
    expect(actions, 'tab-bar : 4 actions attendues').toHaveLength(4);
    for (const a of actions) {
      expect(a.className, `action <${a.textContent?.trim()}> < 44px`).toMatch(/min-h-\[44px\]|min-h-11/);
    }
    // Page courante (mock useLocation → /avis) marquée.
    expect(within(nav).getByText('Avis').closest('a')?.getAttribute('aria-current')).toBe('page');
    // Badge déterministe du mock (total 3).
    expect(screen.getByLabelText('3 notifications'), 'badge notifications manquant').toBeTruthy();
    void creer;
  });

  test('+Créer ouvre la palette de commande', () => {
    render(<MobileTabBar />);
    const recus: string[] = [];
    window.addEventListener('yeba:open-command-palette', () => recus.push('ouvert'), { once: true });
    fireEvent.click(screen.getByRole('button', { name: /Créer/ }));
    expect(recus, 'Créer doit émettre yeba:open-command-palette').toEqual(['ouvert']);
  });
});

describe('Task 1 — PageHeader tactile rendu', () => {
  test('actions pleine largeur sur mobile, titre hiérarchisé', () => {
    render(
      <PageHeader
        title="Titre de test"
        actions={
          <>
            <button type="button" className="min-h-[44px]">Exporter</button>
            <button type="button" className="min-h-[44px]">Filtrer</button>
          </>
        }
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Titre de test' }), 'h1 manquant').toBeTruthy();
    const bouton = screen.getByRole('button', { name: 'Exporter' });
    const conteneur = bouton.parentElement;
    expect(conteneur?.className, 'actions pleine largeur mobile').toContain('w-full');
    expect(conteneur?.className, 'actions compactes desktop').toContain('sm:w-auto');
  });
});

describe('Task 1 — Dialog bottom-sheet rendu', () => {
  test('contenu scrollable max-h-[90vh], rayon desktop conservé, fermer 44px', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Tâche de test</DialogTitle>
          <p>Contenu</p>
        </DialogContent>
      </Dialog>,
    );
    const contenu = screen.getByRole('dialog');
    expect(contenu.className, 'dialog scrollable').toContain('max-h-[90vh]');
    expect(contenu.className, 'dialog scrollable').toContain('overflow-y-auto');
    expect(contenu.className, 'bottom-sheet mobile').toContain('rounded-t-3xl');
    // Contrainte globale : desktop strictement inchangé.
    expect(contenu.className, 'rayon desktop sm:rounded-lg').toContain('sm:rounded-lg');
    expect(contenu.className, 'pas de sm:rounded-3xl').not.toContain('sm:rounded-3xl');
    const fermer = within(contenu).getByRole('button', { name: 'Fermer' });
    expect(fermer.className, 'bouton fermer >= 44px').toMatch(/size-11|min-h-\[44px\]|min-h-11/);
  });
});

describe('Task 1 — FiltresAvis partagés (fix round 1)', () => {
  const noop = () => undefined;
  const base = {
    isDirection: true,
    agences: AGENCES,
    guichets: GUICHETS,
    services: SERVICES,
    selectedAgenceId: undefined,
    setSelectedAgenceId: noop,
    selectedGuichetId: undefined,
    setSelectedGuichetId: noop,
    selectedServiceId: undefined,
    setSelectedServiceId: noop,
    selectedScore: undefined,
    setSelectedScore: noop,
    selectedTheme: undefined,
    setSelectedTheme: noop,
    startDate: '',
    setStartDate: noop,
    endDate: '',
    setEndDate: noop,
  };

  test('deux instances coexistent sans id dupliqué, champs 44px', () => {
    render(
      <>
        <FiltresAvis {...base} idSuffix="" className="grid" />
        <FiltresAvis {...base} idSuffix="-m" className="grid" />
      </>,
    );
    // Unicité des ids (les deux instances vivent dans le même DOM).
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.length, 'aucun champ à id').toBeGreaterThan(0);
    expect(new Set(ids).size, `ids dupliqués : ${ids}`).toBe(ids.length);
    // Les 7 champs existent des deux côtés (suffixés + nus).
    expect(screen.getAllByLabelText('Agence')).toHaveLength(2);
    expect(screen.getAllByLabelText('Filtrer les avis à partir du')).toHaveLength(2);
    // Hauteur tactile : triggers + dates en h-11.
    for (const id of ids.filter((i) => i.startsWith('avis-filtre-'))) {
      const champ = document.getElementById(id);
      expect(champ?.className, `champ ${id} en h-11`).toContain('h-11');
    }
  });

  test('les deux instances pilotent un état indépendant', () => {
    function Harnais({ suffixe }: { suffixe: string }) {
      const [debut, setDebut] = useState('');
      return <FiltresAvis {...base} idSuffix={suffixe} startDate={debut} setStartDate={setDebut} />;
    }
    render(
      <>
        <Harnais suffixe="" />
        <Harnais suffixe="-m" />
      </>,
    );
    const [bureau, mobile] = screen.getAllByLabelText('Filtrer les avis à partir du') as HTMLInputElement[];
    fireEvent.change(mobile, { target: { value: '2026-09-01' } });
    expect(mobile.value).toBe('2026-09-01');
    expect(bureau.value, 'le desktop ne doit pas suivre le mobile').toBe('');
  });
});

describe('Task 1 — pages montées à 360px', () => {
  test('AvisPage : accordéon filtres tactile + pas de débordement', async () => {
    vi.mocked(getAgences).mockResolvedValue(AGENCES as any);
    vi.mocked(getServices).mockResolvedValue(SERVICES as any);
    vi.mocked(getGuichets).mockResolvedValue(GUICHETS as any);
    vi.mocked(getAvisGroupes).mockResolvedValue(AVIS_PAGE as any);
    monterAvecQueries(
      <main id="contenu-principal">
        <AvisPage />
      </main>,
    );
    await stabiliser();
    expect(screen.getAllByText('Retrait').length, 'état chargé non atteint').toBeGreaterThan(0);
    const resume = document.querySelector('summary');
    expect(resume, 'accordéon <details> mobile manquant').toBeTruthy();
    expect(resume?.className, 'summary >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
    expect(resume?.closest('details')?.className, 'accordéon réservé mobile').toContain('lg:hidden');
    auditerAbsenceDebordement('AvisPage');
  });

  test('AlertesTachesPage : actions pleine largeur + pas de débordement', async () => {
    vi.mocked(getAlertes).mockResolvedValue(ALERTES as any);
    vi.mocked(getTachesCorrectives).mockResolvedValue(TACHES as any);
    vi.mocked(getAgentsByAgence).mockResolvedValue(AGENTS as any);
    vi.mocked(getTacheHistorique).mockResolvedValue([] as any);
    monterAvecQueries(
      <main id="contenu-principal">
        <AlertesTachesPage />
      </main>,
    );
    await stabiliser();
    expect(screen.getByText('Attente trop longue au guichet'), 'état chargé non atteint').toBeTruthy();
    const creer = screen.getByRole('button', { name: /Créer tâche/ });
    expect(creer.className, 'bouton pleine largeur mobile').toContain('w-full sm:w-auto');
    expect(creer.className, 'bouton >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
    auditerAbsenceDebordement('AlertesTachesPage');
  });

  test('PlanningPage : nav date tactile + pas de débordement', async () => {
    vi.mocked(getAgents).mockResolvedValue(AGENTS as any);
    vi.mocked(getGuichets).mockResolvedValue(GUICHETS as any);
    vi.mocked(getAffectationsDuJour).mockResolvedValue(AFFECTATIONS as any);
    vi.mocked(getModelesHoraires).mockResolvedValue([] as any);
    const { container } = monterAvecQueries(
      <main id="contenu-principal">
        <PlanningPage />
      </main>,
    );
    await stabiliser();
    const precedent = screen.getByRole('button', { name: 'Jour précédent' });
    expect(precedent.className, 'nav date >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
    expect(precedent.className, 'nav date >= 44px large').toMatch(/min-w-\[44px\]/);
    // Plus aucun bouton 24px (size-6) rendu.
    const petits = [...container.querySelectorAll('button')].filter((b) =>
      (b.getAttribute('class') ?? '').split(/\s+/).includes('size-6'),
    );
    expect(petits, 'boutons size-6 restants').toEqual([]);
    auditerAbsenceDebordement('PlanningPage');
  });
});
