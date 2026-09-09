import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const racine = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Hors périmètre : artefacts générés, worktrees et copies de déploiement
    // (leurs suites internes — ex. compilateur Wasp — ne concernent pas l'app).
    exclude: ['**/node_modules/**', '**/.wasp/**', '**/.worktrees/**', '**/deploy/**'],
  },
  resolve: {
    alias: [
      {
        find: /^wasp\/server\/auth$/,
        replacement: path.resolve(racine, 'src/server/__mocks__/waspServerAuth.ts'),
      },
      {
        find: /^wasp\/server$/,
        replacement: path.resolve(racine, 'src/server/__mocks__/waspServer.ts'),
      },
    ],
  },
});
