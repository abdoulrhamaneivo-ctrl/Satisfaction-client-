export declare const MAX_ATTEMPTS_ANALYSE = 3;
/** Au-delà de ce délai sans mise à jour, un traitement est considéré mort. */
export declare const DELAI_OBSOLESCENCE_MINUTES = 10;
export type StatutAnalyse = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type LigneAnalyse = {
    status: StatutAnalyse | string;
    attempts: number | null | undefined;
    updatedAt: Date | string | null | undefined;
};
/** Une analyse est-elle rejouable par le job ? */
export declare function estRejouable(ligne: LigneAnalyse): boolean;
/** Un traitement est-il resté bloqué trop longtemps ? (→ requeue) */
export declare function estObsolete(ligne: LigneAnalyse, maintenant?: Date, delaiMinutes?: number): boolean;
/** Filtre de sélection : rejouables + traitements périmés à remettre en file. */
export declare function aRejouer(lignes: LigneAnalyse[], maintenant?: Date): LigneAnalyse[];
/** Raised pour le trigger manuel : une analyse échouée peut-elle repartir ? */
export declare function estRelancableManuellement(ligne: LigneAnalyse): boolean;
//# sourceMappingURL=etatAnalyse.d.ts.map