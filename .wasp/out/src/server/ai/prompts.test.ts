// src/server/ai/prompts.test.ts
// ============================================================================
// VAGUE 7 — Le prompt et les budgets ne doivent pas se re-diverger (P14 g).
//
// Ces tests lisent les FICHIERS des providers, pas seulement leurs
// exports. C'est délibéré : une divergence de prompt ou de budget est un
// problème de TEXTE, invisible depuis l'extérieur tant que les trois
// fichiers portent la même valeur. Un test d'égalité d'exports passerait
// donc toujours, et ne protégerait rien.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MAX_TOKENS_ANALYSE, MAX_TOKENS_SYNTHESE, SYSTEM_PROMPT } from './prompts';
import { CHAMPS_ETENDUS_PROMPT } from './types';

const ici = dirname(fileURLToPath(import.meta.url));
const PROVIDERS = ['nvidiaProvider', 'deepseekProvider', 'openrouterProvider'] as const;

const lire = (fichier: string) => readFileSync(join(ici, `${fichier}.ts`), 'utf-8');

describe('prompts IA : source unique (P14 g)', () => {
  test('aucun provider ne redéclare un prompt système', () => {
    for (const p of PROVIDERS) {
      const source = lire(p);
      expect(source, `${p} redéclare un prompt`).not.toMatch(/const\s+SYSTEM_PROMPT\s*=/);
      expect(source, `${p} redéclare le prompt de synthèse`).not.toMatch(
        /const\s+PROMPT_SYNTHESE_SYSTEM\s*=/,
      );
    }
  });

  test('aucun provider ne fige un budget de tokens en dur', () => {
    for (const p of PROVIDERS) {
      const source = lire(p);
      // Un budget en dur ici est exactement la divergence que la vague 2 a
      // constatée : 1500 / 1000 / 1500 pour un même JSON attendu.
      expect(source, `${p} fige un max_tokens`).not.toMatch(/max_tokens:\s*\d+/);
      expect(source, `${p} n'utilise pas le budget canonique`).toMatch(/MAX_TOKENS_ANALYSE/);
      expect(source, `${p} n'utilise pas le budget de synthèse`).toMatch(/MAX_TOKENS_SYNTHESE/);
    }
  });

  test('les trois providers utilisent le MÊME prompt, importé', () => {
    for (const p of PROVIDERS) {
      expect(lire(p), `${p} n'importe pas le prompt canonique`).toMatch(
        /import\s*\{[^}]*SYSTEM_PROMPT[^}]*\}\s*from\s*'\.\/prompts'/,
      );
    }
  });

  test('le prompt rendu contient bien le fragment partagé', () => {
    // On vérifie le prompt RENDU, pas le placeholder : dans un template
    // littéral, `${…}` est substitué à l'exécution. Le piège réel est que
    // l'interpolation disparaisse (réécriture du littéral en chaîne
    // concaténée) et que les champs étendus s'évaporent du prompt sans
    // qu'aucun test ne le remarque.
    expect(CHAMPS_ETENDUS_PROMPT.length).toBeGreaterThan(0);
    expect(SYSTEM_PROMPT).toContain(CHAMPS_ETENDUS_PROMPT);
    expect(SYSTEM_PROMPT).not.toContain('${');
    expect(SYSTEM_PROMPT).not.toContain('undefined');
    // Le prompt doit rester celui qui était en production.
    expect(SYSTEM_PROMPT.startsWith('Tu es le moteur d\'analyse des avis clients de YEBA.')).toBe(true);
    expect(SYSTEM_PROMPT.trimEnd().endsWith("N'ajoute aucun texte en dehors du JSON.")).toBe(true);
  });

  test('le budget d analyse couvre le budget historique le plus bas', () => {
    // Régression : DeepSeek plafonnait à 1000 pendant que les autres
    // les autres à 1500. Un JSON tronqué ne se valide pas, donc l'analyse
    // échouait chez un provider et pas chez les autres.
    expect(MAX_TOKENS_ANALYSE).toBeGreaterThanOrEqual(1500);
    expect(MAX_TOKENS_SYNTHESE).toBeGreaterThan(MAX_TOKENS_ANALYSE);
  });
});
