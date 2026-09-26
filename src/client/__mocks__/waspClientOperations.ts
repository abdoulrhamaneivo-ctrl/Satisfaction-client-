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
  if (typeof queryFn !== 'function') {
    const origine = new Error().stack?.split('\n').slice(1, 4).join(' | ') ?? '';
    throw new Error(
      `useQuery a recu une operation qui n'est pas une fonction (recu: ${typeof queryFn}, ` +
        `cle=${JSON.stringify(args ?? null)}). L'appel vient d'ici : ${origine}`
    );
  }
  return useRQ({
    queryKey: ['mock-query', queryFn, JSON.stringify(args ?? null)],
    queryFn: () => queryFn(args),
    // Une opération qui lève ne doit pas être réessayée : en production le
    // backoff de react-query est le bon comportement, ici il transformait un
    // défaut de mock en test qui expire au bout de 20 s — donc un échec qui
    // parle de « temps machine » au lieu du code. `retry: false` rend
    // l'échec immédiat et nommé.
    retry: false,
    // Une page auditée ne doit pas se re-rendre en cours d'analyse axe-core :
    // le DOM doit être stable pendant la mesure. `staleTime: Infinity` évite
    // aussi qu'un cache partagé entre tests ne resserve la forme d'une autre
    // page — ce qui produisait, par intermittence, un `.includes` sur un
    // objet.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
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
// Forme de retour réelle (`queries.ts:958`) : `operations` et `nonAssignees`.
// Cette opération était ABSENTE du mock. `QuestionsParOperation` — rendue par
// `ConfigurationCriteresPage` — l'appelle donc en `undefined`, ce qui faisait
// échouer l'audit axe de la page au TIMEOUT (20 s de retries react-query)
// quand la suite entière sature la machine, et passer en silence quand elle
// ne sature pas. Un test qui ne dépend pas de la charge n'est pas un test.
export const getCriteresParOperation = vi.fn(async () => ({ operations: [], nonAssignees: [] }));
// Idem : utilisée par `CommandPalette`. La query réelle court-circuite sous
// 2 caractères et renvoie ces quatre listes vides.
export const getRechercheGlobale = vi.fn(async () => ({ agences: [], guichets: [], agents: [], avis: [] }));
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
