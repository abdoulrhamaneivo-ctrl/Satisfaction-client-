// src/server/gex/budget.ts
// ============================================================================
// Budget de l'IA globale (Vague 5, P9 — audit docs/audit/ETAT_REEL_PROJET.md)
//
// Fonction PURE, extraite du job pour être testable : le job importe
// `wasp/server` (prisma), ce qui ouvre une connexion réelle en test.
//
// Le problème constaté : budget fixe à 5 appels/jour alors que chaque
// entreprise active dépose 2 lignes par semaine (SEMAINE + MOIS). Dès trois
// entreprises, six lignes entraient en file pour cinq appels — et le cron
// hebdomadaire faisait attendre sept jours à la suivante. Le budget réel
// était donc de cinq appels PAR SEMAINE, et le retard s'accumulait sans
// que rien ne le signale.
// ============================================================================
export const BUDGET_BASE_PAR_DEFAUT = 5;
export const BUDGET_PAR_ENTREPRISE_PAR_DEFAUT = 2;
export const BUDGET_PLAFOND_PAR_DEFAUT = 20;
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
export function budgetDuJour(nbEntreprisesActives, env = process.env) {
    const force = env.GLOBAL_AI_BUDGET;
    if (force !== undefined && force !== '') {
        const n = Number(force);
        return Number.isFinite(n) && n >= 0 ? n : BUDGET_BASE_PAR_DEFAUT;
    }
    const parEntreprise = Number(env.GLOBAL_AI_BUDGET_PAR_ENTREPRISE ?? BUDGET_PAR_ENTREPRISE_PAR_DEFAUT);
    const plafond = Number(env.GLOBAL_AI_BUDGET_PLAFOND ?? BUDGET_PLAFOND_PAR_DEFAUT);
    const base = Number(env.GLOBAL_AI_BUDGET_BASE ?? BUDGET_BASE_PAR_DEFAUT);
    const per = Number.isFinite(parEntreprise) && parEntreprise > 0 ? parEntreprise : BUDGET_PAR_ENTREPRISE_PAR_DEFAUT;
    const max = Number.isFinite(plafond) && plafond > 0 ? plafond : BUDGET_PLAFOND_PAR_DEFAUT;
    const plancher = Number.isFinite(base) && base >= 0 ? base : BUDGET_BASE_PAR_DEFAUT;
    const demande = Math.max(0, nbEntreprisesActives) * per;
    return Math.max(plancher, Math.min(max, demande));
}
export function comparerParPriorite(a, b) {
    const rang = (p) => (p === 'SEMAINE' ? 0 : 1);
    const parPeriode = rang(a.periode) - rang(b.periode);
    return parPeriode !== 0 ? parPeriode : a.createdAt.getTime() - b.createdAt.getTime();
}
//# sourceMappingURL=budget.js.map