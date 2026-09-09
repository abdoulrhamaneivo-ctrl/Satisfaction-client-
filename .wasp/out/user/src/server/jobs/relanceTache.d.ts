/**
 * Handler principal du job de relance des tâches correctives.
 * Appelé par Wasp une fois par jour (cron "0 8 * * *").
 */
export declare const relancerTachesEnRetard: (_args: unknown, _context: any) => Promise<{
    relancesEnvoyees: number;
    tachesEnRetard: number;
}>;
