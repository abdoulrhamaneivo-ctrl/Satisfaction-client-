// src/client/platform/pages/SecurityPage.test.tsx
// ============================================================================
// GUIDE DE DÉPLOIEMENT (SUPER_ADMIN uniquement) : le bloc a été retiré de
// /settings et vit désormais dans /platform/securite, sous garde
// `me?.platformRole === 'SUPER_ADMIN'` (fail-closed : erreur de
// getPlatformMe ⇒ masqué). Ces deux tests verrouillent le comportement :
// visible pour SUPER_ADMIN, invisible pour SUPPORT (qui accède pourtant à
// la même page via RequirePlatformRole).
// ============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getPlatformMe, setup2fa } from 'wasp/client/operations';
import SecurityPage from './SecurityPage';

// Rôle simulé — muté par chaque test AVANT le montage (même pattern que
// `paramsSimules` dans AvisPage.test.tsx : la factory `vi.mock` est hissée
// mais ne LIT ce conteneur qu'au rendu, pas à l'import).
let roleSimule = 'SUPER_ADMIN';
vi.mock('react-router', async () => (await import('../../__mocks__/harnaisA11y')).routerMock());
vi.mock('react-router-dom', async () => (await import('../../__mocks__/harnaisA11y')).routerMock());
vi.mock('wasp/client/auth', () => ({
  useAuth: () => ({
    isLoading: false,
    data: {
      id: 1,
      email: 'plateforme@yeba.ci',
      role: null,
      platformRole: roleSimule,
      id_agence: null,
      id_entreprise: null,
      actif: true,
    },
  }),
  logout: async () => undefined,
}));

const monter = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <SecurityPage />
    </QueryClientProvider>,
  );
};

// Laisse les effets + la promesse react-query se résoudre (même flush que
// les audits a11y) : sans lui, `me` est encore undefined et le test
// passerait sur un écran non chargé.
const laisserCharger = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  });
};

beforeEach(() => {
  roleSimule = 'SUPER_ADMIN';
  vi.mocked(getPlatformMe).mockResolvedValue({
    platformRole: 'SUPER_ADMIN',
    email: 'superadmin@yeba.ci',
    nom: 'Admin',
    prenom: 'Super',
    totp_actif: true,
  } as any);
  vi.mocked(setup2fa).mockResolvedValue({
    secret_pour_qr: 'TESTSECRET',
    otpauth_url:
      'otpauth://totp/Yeba%3Asuperadmin%40yeba.ci?secret=TESTSECRET&issuer=Yeba&algorithm=SHA1&digits=6&period=30',
  } as any);
});

describe('guide de déploiement réservé au SUPER_ADMIN', () => {
  test('SUPER_ADMIN → le guide est affiché', async () => {
    monter();
    await laisserCharger();
    expect(screen.getByRole('heading', { name: /guide de déploiement/i })).toBeDefined();
    expect(screen.getByText(/OPENROUTER_API_KEY/)).toBeDefined();
  });

  test('SUPPORT → le guide est masqué, le reste de la page reste', async () => {
    roleSimule = 'SUPPORT';
    vi.mocked(getPlatformMe).mockResolvedValue({
      platformRole: 'SUPPORT',
      email: 'support@yeba.ci',
      nom: 'Agent',
      prenom: 'Support',
      totp_actif: true,
    } as any);
    monter();
    await laisserCharger();
    // La page Sécurité elle-même reste accessible au SUPPORT…
    expect(screen.getByRole('heading', { name: /^sécurité$/i })).toBeDefined();
    // …mais le guide de déploiement n'y figure pas.
    expect(screen.queryByRole('heading', { name: /guide de déploiement/i })).toBeNull();
    expect(screen.queryByText(/OPENROUTER_API_KEY/)).toBeNull();
  });
});

describe("QR d'enrôlement 2FA (ajout en scannant)", () => {
  const ecrirePressePapier = vi.fn(async (_texte: string) => undefined);

  beforeEach(() => {
    // Compte sans 2FA : l'effet d'enrôlement appelle setup2fa au montage.
    vi.mocked(getPlatformMe).mockResolvedValue({
      platformRole: 'SUPER_ADMIN',
      email: 'superadmin@yeba.ci',
      nom: 'Admin',
      prenom: 'Super',
      totp_actif: false,
    } as any);
    ecrirePressePapier.mockClear();
    Object.assign(navigator, { clipboard: { writeText: ecrirePressePapier } });
  });

  test('enrôlement → QR scannable + clé manuelle affichés', async () => {
    monter();
    // Chaîne à rallonge (query getPlatformMe → effet setup2fa → setState) :
    // on attend l'apparition plutôt qu'un nombre fixe de ticks.
    await waitFor(() => {
      expect(
        screen.getByRole('img', { name: /qr code d'activation 2fa/i }),
      ).toBeDefined();
    });
    expect(setup2fa).toHaveBeenCalled();
    expect(screen.getByText(/TESTSECRET/)).toBeDefined();
    expect(
      screen.getByRole('button', { name: /copier/i }),
    ).toBeDefined();
  });

  test('bouton Copier → la clé est copiée dans le presse-papiers', async () => {
    monter();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /copier/i }),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /copier/i }));
    await waitFor(() => {
      expect(ecrirePressePapier).toHaveBeenCalledWith('TESTSECRET');
    });
    expect(screen.getByText(/copié/i)).toBeDefined();
  });

  test('2FA déjà active → ni QR ni clé (rien à enrôler)', async () => {
    vi.mocked(getPlatformMe).mockResolvedValue({
      platformRole: 'SUPER_ADMIN',
      email: 'superadmin@yeba.ci',
      nom: 'Admin',
      prenom: 'Super',
      totp_actif: true,
    } as any);
    monter();
    await laisserCharger();
    expect(
      screen.queryByRole('img', { name: /qr code d'activation 2fa/i }),
    ).toBeNull();
    expect(screen.queryByText(/TESTSECRET/)).toBeNull();
    expect(screen.getByText(/2FA est activée/)).toBeDefined();
  });
});
