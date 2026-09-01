/**
 * Handler principal du job de surveillance des silences.
 * Appelé par Wasp toutes les 30 minutes via la configuration du job.
 */
export declare const detecterAlertesSilence: (_args: unknown, _context: any) => Promise<{
    alertesCreees: number;
    messagesEnvoyes: number;
}>;
//# sourceMappingURL=alerteSilence.d.ts.map