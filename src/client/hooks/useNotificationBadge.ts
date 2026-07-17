// src/client/hooks/useNotificationBadge.ts
// Polling léger (30s) sur getActionsPrioritaires pour alimenter le badge
// de notification dans la NavBar. Wasp 0.24.0 ne supporte pas les
// WebSockets natifs — le polling 30s est le bon compromis (< 1 req/min).

import { useQuery, getActionsPrioritaires } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';

export function useNotificationBadge() {
  const { data: user } = useAuth();

  // On n'active le polling que si l'utilisateur est connecté ET a un rôle
  // qui peut recevoir des alertes (pas un simple AGENT).
  const isEligible = !!user && (user as any).role !== 'AGENT';

  const { data: actionsPrioritaires } = useQuery(
    getActionsPrioritaires,
    undefined,
    {
      enabled: isEligible,
      refetchInterval: 30_000, // toutes les 30 secondes
      staleTime: 20_000,       // considéré "frais" pendant 20s (évite le double-fetch)
    }
  );

  const alertesNouvelles = actionsPrioritaires?.alertesNouvelles?.length ?? 0;
  const tachesEnRetard = actionsPrioritaires?.tachesEnRetard?.length ?? 0;
  const total = alertesNouvelles + tachesEnRetard;

  return {
    total,
    alertesNouvelles,
    tachesEnRetard,
    hasCritical: alertesNouvelles > 0,
  };
}
