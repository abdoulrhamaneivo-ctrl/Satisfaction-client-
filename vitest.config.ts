import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const racine = path.dirname(fileURLToPath(import.meta.url));

// Aliases partagés : les modules Wasp sont résolus par des mocks de test
// (le SDK n'existe qu'après `wasp build`, et il ouvre une connexion réelle).
const alias = [
  {
    find: /^wasp\/server\/auth$/,
    replacement: path.resolve(racine, 'src/server/__mocks__/waspServerAuth.ts'),
  },
  {
    find: /^wasp\/server$/,
    replacement: path.resolve(racine, 'src/server/__mocks__/waspServer.ts'),
  },
  {
    find: /^wasp\/client\/operations$/,
    replacement: path.resolve(racine, 'src/client/__mocks__/waspClientOperations.ts'),
  },
  {
    find: /^wasp\/client\/auth$/,
    replacement: path.resolve(racine, 'src/client/__mocks__/waspClientAuth.ts'),
  },
];

const exclude = ['**/node_modules/**', '**/.wasp/**', '**/.worktrees/**', '**/deploy/**'];

export default defineConfig({
  test: {
    // Vague 1 : deux projets. Le premier reste en Node (logique pure : moteur,
    // scoring, agrégats) — rapide, aucun DOM. Le second couvre les parcours
    // React en jsdom (CollectePage, etc.).
    // Vague 5 — seuils de couverture sur les modules de sécurité.
  // Vague 5 — seuils de couverture sur les modules de sécurité.
  //
  // Un seuil global n'aurait aucun sens ici : `actions.ts` et
  // `queries.ts` pèsent 2 000 lignes chacun et ne sont pas
  // entièrement testés, ce qui tirait la moyenne globale à ~20 %.
  // Un seuil global bas ne protégerait rien ; élevé, il
  // empêcherait toute intégration. Les seuils sont donc posés PAR
  // FICHIER, sur les modules où la couverture est à la fois
  // significative et actuellement vérifiable.
  //
  // Valeurs placées juste sous la couverture réelle du moment :
  // ce sont des GARDES, pas des objectifs. Une régression de
  // couverture échoue ; améliorer le chiffre est un travail
  // séparé, qui consiste à relever le seuil sciemment.
  coverage: {
    provider: 'v8',
    include: ['src/server/**/*.ts', 'src/shared/**/*.ts'],
    exclude: ['**/*.test.ts', '**/__mocks__/**', '**/*.d.ts'],
    reporter: ['text', 'json-summary'],
    thresholds: {
      perFile: true,
      'src/server/middleware/rowLevelSecurity.ts': {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
      'src/server/rateLimit.ts': {
        statements: 48,
        branches: 60,
        functions: 50,
        lines: 50,
      },
      'src/server/validation.ts': {
        statements: 28,
        branches: 22,
        functions: 35,
        lines: 30,
      },
      'src/server/ai/etatAnalyse.ts': {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
      'src/server/gex/budget.ts': {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
      'src/server/gex/moteurGlobal.ts': {
        statements: 78,
        branches: 58,
        functions: 70,
        lines: 80,
      },
    },
  },

    projects: [
      {
        test: {
          name: 'pur',
          include: ['src/**/*.test.ts'],
          exclude,
          environment: 'node',
        },
        resolve: { alias },
      },
      {
        test: {
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          exclude,
          environment: 'jsdom',
          globals: false,
          setupFiles: [path.resolve(racine, 'src/client/__mocks__/setupUi.ts')],
        },
        // Vague 6 : `tsconfig.src.json` déclare `jsx: "preserve"`, et
        // esbuild retombe alors sur le runtime CLASSIQUE (React.createElement)
        // — alors que l'application est compilée par Vite avec le runtime
        // AUTOMATIQUE. Résultat : tout composant qui n'importe pas React
        // explicitement (MotionCard, PageShell…) échoue au rendu en test
        // avec « React is not defined », alors qu'il fonctionne en
        // production. On aligne la transformation de test sur celle de
        // l'app, plutôt que d'ajouter des imports React au code applicatif
        // pour satisfaire un harnais.
        esbuild: { jsx: 'automatic' },
        resolve: { alias },
      },
    ],
  },
  resolve: { alias },
});
