// src/client/components/KpiParTerme.test.tsx
// ============================================================================
// Task 3 — KPI par terme : la section rend le tableau par question, le
// détail NPS, les barres motifs et les courbes à partir des payloads
// réels des 3 queries (formes `queries.ts`). TDD : écrit AVANT le
// branchement final (doit échouer sans les mocks ci-dessous / sans UI).
// ============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getMoyennesParCritere, getRepartitionOptions, getTendanceParCritere, } from 'wasp/client/operations';
import { SectionKpiParTerme } from './KpiParTerme';
vi.mock('framer-motion', async () => (await import('../__mocks__/harnaisA11y')).motionMock());
const MOYENNES = {
    nb_jours: 30,
    criteres: [
        {
            id_critere: 11, libelle: 'Accueil et orientation', type: 'SMILEY', scoring_mode: null,
            kind: 'SATISFACTION', nb_avis: 12, nb_notables: 12, moyenne_sur5: 4.2,
            satisfaction_pct: 80.0, distribution: { '1': 0, '2': 1, '3': 1, '4': 4, '5': 6 },
            nps: null, nps_detail: null, ces_volume: 0, ces_top_box: null, ces_effort_moyen: null,
        },
        {
            id_critere: 12, libelle: 'Question rare', type: 'SMILEY', scoring_mode: null,
            kind: 'SATISFACTION', nb_avis: 3, nb_notables: 3, moyenne_sur5: null,
            satisfaction_pct: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 2 },
            nps: null, nps_detail: null, ces_volume: 0, ces_top_box: null, ces_effort_moyen: null,
        },
        {
            id_critere: 13, libelle: 'Recommanderiez-vous', type: 'NPS', scoring_mode: 'NPS',
            kind: 'NPS', nb_avis: 6, nb_notables: 0, moyenne_sur5: null,
            satisfaction_pct: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            nps: 33, nps_detail: { volume: 6, promoteurs: 4, passifs: 1, detracteurs: 1 },
            ces_volume: 0, ces_top_box: null, ces_effort_moyen: null,
        },
        {
            id_critere: 14, libelle: 'Motif', type: 'QCM', scoring_mode: null,
            kind: 'CATEGORIEL', nb_avis: 12, nb_notables: 0, moyenne_sur5: null,
            satisfaction_pct: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            nps: null, nps_detail: null, ces_volume: 0, ces_top_box: null, ces_effort_moyen: null,
        },
    ],
};
const REPARTITION = {
    id_critere: 14, libelle: 'Motif', nb_jours: 30, nb_avis: 12,
    options: [
        { option_id: 'x', libelle: 'Envoi / Retrait', nb: 8, pct: 66.7 },
        { option_id: 'y', libelle: 'Autre (précisez)', nb: 4, pct: 33.3 },
    ],
};
const TENDANCE = {
    nb_mois: 6,
    id_critere: null,
    libelle: null,
    points: [
        { cle: '2026-05', libelle: 'mai 26', nb_avis: 8, moyenne_sur5: 4.0, nps: 20, nps_detail: { volume: 5, promoteurs: 3, passifs: 0, detracteurs: 2 } },
        { cle: '2026-06', libelle: 'juin 26', nb_avis: 9, moyenne_sur5: 4.1, nps: 40, nps_detail: { volume: 5, promoteurs: 3, passifs: 1, detracteurs: 1 } },
        { cle: '2026-07', libelle: 'juil. 26', nb_avis: 2, moyenne_sur5: null, nps: null, nps_detail: { volume: 2, promoteurs: 1, passifs: 0, detracteurs: 1 } },
        { cle: '2026-08', libelle: 'août 26', nb_avis: 10, moyenne_sur5: 4.3, nps: 50, nps_detail: { volume: 6, promoteurs: 4, passifs: 0, detracteurs: 2 } },
        { cle: '2026-09', libelle: 'sept. 26', nb_avis: 11, moyenne_sur5: 4.2, nps: 33, nps_detail: { volume: 6, promoteurs: 4, passifs: 1, detracteurs: 1 } },
        { cle: '2026-10', libelle: 'oct. 26', nb_avis: 12, moyenne_sur5: 4.2, nps: 33, nps_detail: { volume: 6, promoteurs: 4, passifs: 1, detracteurs: 1 } },
    ],
    series: [
        {
            id_critere: 11, libelle: 'Accueil et orientation',
            points: [
                { cle: '2026-05', nb: 8, moyenne_sur5: 4.0 },
                { cle: '2026-06', nb: 9, moyenne_sur5: 4.1 },
                { cle: '2026-07', nb: 2, moyenne_sur5: null },
                { cle: '2026-08', nb: 10, moyenne_sur5: 4.3 },
                { cle: '2026-09', nb: 11, moyenne_sur5: 4.2 },
                { cle: '2026-10', nb: 12, moyenne_sur5: 4.2 },
            ],
        },
    ],
};
const monter = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    let conteneur;
    await act(async () => {
        conteneur = render(<QueryClientProvider client={client}>
        <SectionKpiParTerme nbJours={30} nbMois={6} labelPeriode="30j"/>
      </QueryClientProvider>);
    });
    return conteneur;
};
beforeEach(() => {
    vi.mocked(getMoyennesParCritere).mockResolvedValue(MOYENNES);
    vi.mocked(getRepartitionOptions).mockResolvedValue(REPARTITION);
    vi.mocked(getTendanceParCritere).mockResolvedValue(TENDANCE);
});
describe('SectionKpiParTerme', () => {
    test('tableau par question : moyenne, % ≥4/5 et mention de seuil', async () => {
        const c = await monter();
        // Question à base suffisante (rendu mobile + desktop → doublons).
        expect((await c.findAllByText('Accueil et orientation')).length).toBeGreaterThan(0);
        expect((await c.findAllByText('4.2/5')).length).toBeGreaterThan(0);
        expect((await c.findAllByText('80%')).length).toBeGreaterThan(0);
        // Question sous le seuil : '—' + mention explicite (rendu mobile +
        // desktop → doublons, même convention que ci-dessus).
        expect((await c.findAllByText('Question rare')).length).toBeGreaterThan(0);
        expect((await c.findAllByText('base insuffisante (3 avis, seuil 5)')).length).toBeGreaterThan(0);
    });
    test('détail NPS : indice + n, promoteurs/passifs/détracteurs', async () => {
        const c = await monter();
        expect(await c.findByText('Recommandation (NPS)')).toBeTruthy();
        expect(await c.findByText('+33')).toBeTruthy();
        // Le détail est éclaté sur plusieurs nœuds (volumes en gras) : matcher
        // sur le textContent complet plutôt que sur un nœud unique.
        expect(await c.findByText((_c, element) => element?.textContent === '6 avis : 4 promoteurs · 1 passif · 1 détracteur')).toBeTruthy();
    });
    test('barres motifs : % des avis par choix', async () => {
        const c = await monter();
        expect(getRepartitionOptions).toHaveBeenCalledWith(expect.objectContaining({ id_critere: 14 }));
        expect((await c.findAllByText('Envoi / Retrait')).length).toBeGreaterThan(0);
        expect(await c.findByText('8 · 66.7%')).toBeTruthy();
    });
    test('courbes : tendance globale, NPS mensuel, courbe par terme', async () => {
        const c = await monter();
        expect(getTendanceParCritere).toHaveBeenCalledWith(expect.objectContaining({ nbMois: 6 }));
        expect(await c.findByText('Tendance mensuelle — Score moyen / 5')).toBeTruthy();
        expect(await c.findByText('NPS mensuel')).toBeTruthy();
        expect(await c.findByText('Courbes par question (3 plus gros volumes)')).toBeTruthy();
        // Tableau sr-only des courbes par terme : l'en-tête porte le libellé.
        const tableaux = c.container.querySelectorAll('table.sr-only');
        const entetes = Array.from(tableaux).map((t) => t.textContent ?? '');
        expect(entetes.some((t) => t.includes('Accueil et orientation'))).toBe(true);
    });
    test('aucune donnée → état vide explicite', async () => {
        vi.mocked(getMoyennesParCritere).mockResolvedValue({ nb_jours: 30, criteres: [] });
        await monter();
        expect(await screen.findByText('Aucune réponse par question')).toBeTruthy();
    });
});
