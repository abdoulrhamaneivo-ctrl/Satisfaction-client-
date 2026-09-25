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
        resolve: { alias },
      },
    ],
  },
  resolve: { alias },
});
