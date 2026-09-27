// src/client/pages/AvisPage.test.tsx
// ============================================================================
// DRILL-DOWN (2026-09-27) : arrivée sur /avis avec ?agence=&guichet=&service=
// &score=&theme=&debut=&fin= depuis le dashboard ou la synthèse. La page
// doit pré-filtrer la requête (valeurs validées) — sinon le lien drill-down
// affiche « tous les avis » et le parcours est inutile.
// ============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAgences, getAvisGroupes, getGuichets, getServices, } from 'wasp/client/operations';
import { AvisPage } from './AvisPage';
// Paramètres simulés — mutés par chaque test AVANT le montage. La factory
// `vi.mock` est hissée : elle lit ce conteneur à l'appel, pas à l'import.
let paramsSimules = new URLSearchParams();
vi.mock('react-router', async () => {
    const harnais = await import('../__mocks__/harnaisA11y');
    const base = await harnais.routerMock();
    return { ...base, useSearchParams: () => [paramsSimules, vi.fn()] };
});
vi.mock('react-router-dom', async () => {
    const harnais = await import('../__mocks__/harnaisA11y');
    const base = await harnais.routerMock();
    return { ...base, useSearchParams: () => [paramsSimules, vi.fn()] };
});
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
vi.mock('../context/BrandContext', async () => (await import('../__mocks__/harnaisA11y')).brandMock());
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('wasp/client/auth', async () => (await import('../__mocks__/harnaisA11y')).authMock());
const monter = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    let conteneur;
    await act(async () => {
        conteneur = render(<QueryClientProvider client={client}>
        <AvisPage />
      </QueryClientProvider>);
    });
    return conteneur;
};
beforeEach(() => {
    paramsSimules = new URLSearchParams();
    vi.mocked(getAgences).mockResolvedValue([]);
    vi.mocked(getServices).mockResolvedValue([]);
    vi.mocked(getGuichets).mockResolvedValue([]);
    vi.mocked(getAvisGroupes).mockResolvedValue({ avis: [], hasMore: false });
});
describe('drill-down : les paramètres URL pré-filtrent la requête', () => {
    test('?guichet=&service=&debut=&fin= → requête filtrée', async () => {
        paramsSimules = new URLSearchParams('guichet=7&service=10&debut=2026-09-01&fin=2026-09-30');
        await monter();
        expect(getAvisGroupes).toHaveBeenCalledWith(expect.objectContaining({
            id_guichet: 7,
            id_service: 10,
            startDate: '2026-09-01',
            endDate: '2026-09-30',
        }));
    });
    test('?agence=&score=&theme= → requête filtrée', async () => {
        paramsSimules = new URLSearchParams('agence=2&score=4&theme=TEMPS_ATTENTE');
        await monter();
        // Les filtres passent par les états internes : la requête porte les valeurs.
        const appels = vi.mocked(getAvisGroupes).mock.calls.map((c) => c[0]);
        expect(appels.some((a) => a?.score === 4 && a?.theme === 'TEMPS_ATTENTE')).toBe(true);
    });
    test('paramètres invalides → ignorés, pas de crash, requête non filtrée', async () => {
        paramsSimules = new URLSearchParams('guichet=abc&service=-2&score=9&debut=nimporte&fin=99');
        await monter();
        const appels = vi.mocked(getAvisGroupes).mock.calls.map((c) => c[0]);
        expect(appels.length).toBeGreaterThan(0);
        const dernier = appels[appels.length - 1];
        expect(dernier?.id_guichet).toBeUndefined();
        expect(dernier?.id_service).toBeUndefined();
        expect(dernier?.score).toBeUndefined();
        expect(dernier?.startDate).toBeUndefined();
        expect(dernier?.endDate).toBeUndefined();
    });
    test('sans paramètre → comportement inchangé (tous les avis)', async () => {
        await monter();
        expect(getAvisGroupes).toHaveBeenCalled();
        const dernier = vi.mocked(getAvisGroupes).mock.calls.map((c) => c[0]).pop();
        expect(dernier?.id_guichet).toBeUndefined();
        expect(dernier?.startDate).toBeUndefined();
    });
});
//# sourceMappingURL=AvisPage.test.jsx.map