interface StatsAgence {
    agenceNom: string;
    commune: string;
    totalAvis: number;
    noteMoyenne: number;
    satisfaits: number;
    tauxSatisfaction: number;
    alertesCritiques: number;
    tachesOuvertes: number;
}
/** Calcule les stats d'une période [debut, fin] pour une agence donnée.
 * Exportée pour les tests (volumesAvis) — le job l'appelle en interne. */
export declare function calculeStatsAgence(idAgence: number, debut: Date, fin: Date): Promise<StatsAgence | null>;
/**
 * Consolidation multi-agences (pure, testée) : la Direction reçoit UN email
 * avec les chiffres de son entreprise, pas N emails par agence.
 * - taux = satisfaits / total (recalculé, pas moyenné) ;
 * - note moyenne pondérée par le volume (une grosse agence pèse plus).
 */
export declare function consoliderStatsAgences(stats: StatsAgence[]): StatsAgence | null;
/**
 * Handler principal du job de rapport mensuel.
 * Appelé par Wasp le 1er du mois à 07:00 (cron "0 7 1 * *").
 */
export declare const envoyerRapportsMensuels: (_args: unknown, _context: any) => Promise<{
    emailsEnvoyes: number;
    periodeLabel: string;
}>;
/**
 * Handler du job de rapport hebdomadaire (2026-09-27, §14 — le mensuel
 * seul ne suffit pas au pilotage). Appelé par Wasp le lundi à 07:00
 * (cron "0 7 * * 1"), sur la dernière semaine COMPLÈTE (lun→dim, jamais la
 * semaine en cours — mêmes bornes que l'analyse GEX SEMAINE).
 */
export declare const envoyerRapportsHebdo: (_args: unknown, _context: any) => Promise<{
    emailsEnvoyes: number;
    periodeLabel: string;
}>;
export {};
//# sourceMappingURL=rapportMensuel.d.ts.map