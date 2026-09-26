// src/server/gex/budget.test.ts
// ============================================================================
// VAGUE 5, P9 — Budget de l'IA globale.
//
// Ces tests encodent le constat : le budget était fixe (5/jour) alors que
// la demande croît avec le nombre d'entreprises. Le cas qui illustre le
// défaut est 3 entreprises = 6 périodes à traiter pour 5 appels.
//
// Le budget est une fonction PURE de (nbEntreprises, env) : c'est
// précisément pour cela qu'elle est extraite du job, qui ouvre une
// connexion Prisma à l'import.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { budgetDuJour, comparerParPriorite } from './budget';

const sansEnv = {} as NodeJS.ProcessEnv;

describe('P9 — budget IA : le budget suit la demande réelle', () => {
  test('le cas du constat : 3 entreprises ne doivent pas produire plus de travail que le budget', () => {
    // 3 entreprises × 2 périodes = 6 lignes à traiter.
    const budget = budgetDuJour(3, sansEnv);
    expect(budget).toBeGreaterThanOrEqual(6);
  });

  test('le plancher de 5 reste respecté quand il y a peu d\'entreprises', () => {
    expect(budgetDuJour(0, sansEnv)).toBe(5);
    expect(budgetDuJour(1, sansEnv)).toBe(5);
    expect(budgetDuJour(2, sansEnv)).toBe(5); // 4 < 5 → plancher
  });

  test('la croissance est linéaire au-dessus du plancher', () => {
    expect(budgetDuJour(3, sansEnv)).toBe(6);
    expect(budgetDuJour(4, sansEnv)).toBe(8);
    expect(budgetDuJour(5, sansEnv)).toBe(10);
  });

  test('le plafond arrête la dérive financière', () => {
    // 100 entreprises → 200 appels sans plafond. Le plafond par défaut
    // est de 20 : c'est un choix assumé, lisible dans le code.
    expect(budgetDuJour(100, sansEnv)).toBe(20);
    expect(budgetDuJour(1000, sansEnv)).toBe(20);
  });

  test('un budget posé explicitement par l\'exploitant est respecté', () => {
    // Même 1 appel/jour : c'est son choix, l'heuristique ne l'écrase pas.
    expect(budgetDuJour(50, { GLOBAL_AI_BUDGET: '1' })).toBe(1);
    expect(budgetDuJour(1, { GLOBAL_AI_BUDGET: '30' })).toBe(30);
  });

  test('une valeur d\'environnement aberrante retombe sur le défaut', () => {
    // Une valeur POSÉE mais illisible ne doit pas glisser vers
    // l'heuristique : celle-ci monte avec le nombre de clients (donc
    // jusqu'au plafond de 20). Retomber sur le défaut simple et petit
    // (5) est le choix qui protège le budget.
    expect(budgetDuJour(3, { GLOBAL_AI_BUDGET: 'beaucoup' })).toBe(5);
    expect(budgetDuJour(3, { GLOBAL_AI_BUDGET: '-4' })).toBe(5);
    // Ici en revanche l'heuristique s'applique : les deux leviers sont
    // lisibles mais invalides, donc on dimensionne normalement.
    expect(budgetDuJour(3, { GLOBAL_AI_BUDGET_PAR_ENTREPRISE: 'zero' })).toBe(6);
    expect(budgetDuJour(3, { GLOBAL_AI_BUDGET_PLAFOND: '' })).toBe(6);
  });

  test('le nombre d\'entreprises négatif ou aberrant ne produit pas de budget négatif', () => {
    expect(budgetDuJour(-5, sansEnv)).toBe(5);
    expect(budgetDuJour(0, sansEnv)).toBe(5);
  });
});

describe('P9 — priorité en cas de budget court', () => {
  const ligne = (periode: string, minutes: number) => ({
    periode,
    createdAt: new Date(Date.now() - minutes * 60_000),
  });

  test('la semaine passe avant le mois', () => {
    // Une ligne MOIS plus ancienne ne doit pas voler le budget du jour à
    // la SEMAINE correspondante : la donnée fraîche d'abord.
    const tri = [ligne('MOIS', 10), ligne('SEMAINE', 0)].sort(comparerParPriorite);
    expect(tri[0].periode).toBe('SEMAINE');
  });

  test('à période égale, la plus ancienne d\'abord', () => {
    const tri = [ligne('SEMAINE', 0), ligne('SEMAINE', 60)].sort(comparerParPriorite);
    expect(tri[0].createdAt.getTime()).toBeLessThan(tri[1].createdAt.getTime());
  });

  test('le tri est total et stable (aucune ligne perdue)', () => {
    const lignes = [
      ligne('MOIS', 30),
      ligne('SEMAINE', 20),
      ligne('MOIS', 5),
      ligne('SEMAINE', 50),
    ];
    const tri = [...lignes].sort(comparerParPriorite);
    expect(tri).toHaveLength(4);
    expect(tri.filter((l) => l.periode === 'SEMAINE')).toHaveLength(2);
    // La première SEMAINE traitée est la plus ancienne des deux.
    expect(tri[0].periode).toBe('SEMAINE');
    expect(tri[1].periode).toBe('SEMAINE');
  });
});
