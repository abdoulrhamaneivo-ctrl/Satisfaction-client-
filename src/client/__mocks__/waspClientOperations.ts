// src/client/__mocks__/waspClientOperations.ts
// ============================================================================
// Surface des opérations client Wasp pour les tests de parcours.
// Chaque fonction est un `vi.fn()` : le test peut la reconfigurer et vérifier
// les appels. Les valeurs par défaut sont inoffensives (aucune donnée).
// ============================================================================
import { vi } from 'vitest';
import { useQuery as useRQ, useMutation } from '@tanstack/react-query';

// `useQuery` Wasp est un hook react-query qui appelle l'opération. On le
// reproduit à l'identique pour que les composants se comportent comme en
// production (isLoading, isError, data, refetch).
export function useQuery(queryFn: any, args?: any, options?: any) {
  return useRQ({
    queryKey: ['mock-query', queryFn, JSON.stringify(args ?? null)],
    queryFn: () => queryFn(args),
    ...(options ?? {}),
  } as any);
}

export function useAction(actionFn: any, _options?: any) {
  const mutation = useMutation(actionFn as any);
  return async (args?: any) => mutation.mutateAsync(args);
}

export const getFormDefinitionForGuichet = vi.fn(async (_args?: any) => null);
export const soumettreAvis = vi.fn(async (_args?: any) => ({ id: '1' }));
export const completerSoumission = vi.fn(async (_args?: any) => ({ ok: true }));

const inexistante = vi.fn(async () => {
  throw new Error('Opération non mockée dans ce test : voir src/client/__mocks__/waspClientOperations.ts');
});

export const getCriteres = vi.fn(async () => ({ criteres: [], criteresEntreprise: [] }));
export const getServices = vi.fn(async () => []);
export const getGuichets = vi.fn(async () => []);
export const getAvisGroupes = vi.fn(async () => ({ avis: [], hasMore: false }));
export const getAgences = vi.fn(async () => []);
// Forme réelle de `getArchives` : { guichets, agences, alertes, taches }.
export const getArchives = vi.fn(async () => ({ guichets: [], agences: [], alertes: [], taches: [] }));
export const getAIStatus = vi.fn(async () => ({ configured: false, provider: null, model: null, baseUrl: null, stats: { total: 0, done: 0, pending: 0, failed: 0 } }));
export const getBranding = vi.fn(async () => null);
export const getAgenceCriteres = vi.fn(async () => []);
export const getAgents = vi.fn(async () => []);
export const getAgentsByAgence = vi.fn(async () => []);
export const getAlertes = vi.fn(async () => []);
export const getTachesCorrectives = vi.fn(async () => []);
export const getAffectationsDuJour = vi.fn(async () => []);
export const getModelesHoraires = vi.fn(async () => []);
export const getTacheHistorique = vi.fn(async () => []);
// Forme réelle : [{ subject, A, fullMark }].
export const getRadarStats = vi.fn(async () => []);
export const getTendanceMensuelle = vi.fn(async () => []);
export const getStatsByAgent = vi.fn(async () => []);
export const getStatsByGuichet = vi.fn(async () => []);
// Forme réelle : { alertesNouvelles, tachesEnRetard }.
export const getActionsPrioritaires = vi.fn(async () => ({ alertesNouvelles: [], tachesEnRetard: [] }));
// Forme réelle : { nb_jours, periode_actuelle, periode_precedente, deltas, par_operation }.
export const getKPIsPeriode = vi.fn(async () => ({ nb_jours: 30, periode_actuelle: { nb: 0, moyenne: 0, satisfaction: 0 }, periode_precedente: { nb: 0, moyenne: 0, satisfaction: 0 }, delta_satisfaction_pts: 0, delta_note_pts: 0, delta_volume_pct: 0, par_operation: [] }));
export const getObjectifs = vi.fn(async () => []);
export const getHeatmapReponses = vi.fn(async () => null);
// Forme réelle : { nb_jours, agences, meilleure_agence, agence_a_surveiller, moyenne_globale }.
export const getComparaisonAgences = vi.fn(async () => ({ nb_jours: 30, agences: [], meilleure_agence: null, agence_a_surveiller: null, moyenne_globale: null }));
// Forme réelle : { nb_jours, prise_en_charge, resolution }.
export const getTempsTraitement = vi.fn(async () => ({ nb_jours: 30, prise_en_charge: { moyenne_heures: 0, nb: 0, delta_heures: 0 }, resolution: { moyenne_heures: 0, nb: 0, delta_heures: 0 } }));
// Forme réelle : { total, topThemes } — un tableau ici vide les blocs.
export const getThemesStats = vi.fn(async () => ({ total: 0, topThemes: [] }));
export const getIndicateursExperience = vi.fn(async () => null);
export const getReponses = vi.fn(async () => []);
export const logout = vi.fn(async () => undefined);
