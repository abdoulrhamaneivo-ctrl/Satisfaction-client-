export type SpecOption = {
    libelle: string;
    est_scorable: boolean;
    score: number | null;
    poids: number | null;
    code_metier: string | null;
};
export type SpecCritere = {
    libelle_critere: string;
    description?: string | null;
    type_reponse: 'SMILEY' | 'QCM' | 'TEXTE' | 'NPS' | 'CASES';
    scoring_mode?: string | null;
    obligatoire: boolean;
    options: SpecOption[];
};
export type SpecService = {
    libelle_service: string;
    criteres: SpecCritere[];
};
export declare const GABARIT_EXPRESS: SpecService;
export declare const GABARIT_QUALITE: SpecService;
/**
 * Crée les 2 services + 8 critères + liaisons (CritereService avec ordre,
 * AgenceCritere). Idempotent : relançable sans doublon.
 *
 * Garde 1-critère=1-service : un critère préexistant déjà rattaché à un
 * AUTRE service n'est jamais re-rattaché (pas de contournement).
 */
export declare function seedGabarits(prisma: any, idEntreprise: number, idAgence: number): Promise<void>;
