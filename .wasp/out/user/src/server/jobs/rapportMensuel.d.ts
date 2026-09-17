/**
 * Handler principal du job de rapport mensuel.
 * Appelé par Wasp le 1er du mois à 07:00 (cron "0 7 1 * *").
 */
export declare const envoyerRapportsMensuels: (_args: unknown, _context: any) => Promise<{
    emailsEnvoyes: number;
    moisLabel: string;
}>;
