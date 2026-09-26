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

export const getCriteres = inexistante;
export const getServices = vi.fn(async () => []);
export const getGuichets = vi.fn(async () => []);
export const getReponses = inexistante;
export const getAvisGroupes = vi.fn(async () => ({ avis: [], hasMore: false }));
export const getAgences = vi.fn(async () => []);
export const getAIStatus = inexistante;
export const getAgents = vi.fn(async () => []);
export const getAgentsByAgence = vi.fn(async () => []);
export const getAlertes = vi.fn(async () => []);
export const getTachesCorrectives = vi.fn(async () => []);
export const getAffectationsDuJour = vi.fn(async () => []);
export const getModelesHoraires = vi.fn(async () => []);
export const getTacheHistorique = vi.fn(async () => []);
export const logout = vi.fn(async () => undefined);
