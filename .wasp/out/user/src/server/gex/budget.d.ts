export declare const BUDGET_BASE_PAR_DEFAUT = 5;
export declare const BUDGET_PAR_ENTREPRISE_PAR_DEFAUT = 2;
export declare const BUDGET_PLAFOND_PAR_DEFAUT = 20;
/**
 * Budget d'appels LLM pour la journée, en nombre d'entreprises actives.
 *
 * Trois règles, dans l'ordre :
 *  1. `GLOBAL_AI_BUDGET` exprimé explicitement gagne toujours — un
 *     exploitant qui a choisi une valeur ne doit pas être contredit par
 *     une heuristique ;
 *  2. sinon le budget suit la demande réelle : deux périodes par
 *     entreprise et par semaine ;
 *  3. et il reste plafonné, parce qu'un budget qui croît linéairement avec
 *     le nombre de clients sans borne devient une dépense non maîtrisée —
 *     c'est la dérive financière que P9 doit empêcher, pas en créer
 *     une autre.
 */
export declare function budgetDuJour(nbEntreprisesActives: number, env?: NodeJS.ProcessEnv): number;
/**
 * Ordre de traitement quand le budget ne permet pas de tout passer.
 *
 * La période SEMAINE passe avant le mois : si le budget est court, mieux
 * vaut disposer de la donnée fraîche que d'un agrégat mensuel déjà
 * dépassé. À rang égal, la plus ancienne d'abord — une ligne qui attend
 * depuis des semaines ne doit pas être doublée par une ligne plus récente
 * de la même période.
 */
export type PeriodePriorisee = 'SEMAINE' | 'MOIS';
export declare function comparerParPriorite<T extends {
    periode: string;
    createdAt: Date;
}>(a: T, b: T): number;
