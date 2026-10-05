// src/server/ai/providers.test.ts
// ============================================================================
// CLÉS API (correctif 2026-10-05) : une clé copiée depuis un dashboard avec
// un espace ou un retour ligne doit partir TRIMÉE — sinon le provider
// répond 401 « clé invalide » alors qu'elle est bonne. Les 3 providers
// doivent se comporter pareil (NVIDIA et DeepSeek trimaient déjà).
// ============================================================================
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NvidiaProvider } from './nvidiaProvider';
import { OpenRouterProvider } from './openrouterProvider';
import { DeepseekProvider } from './deepseekProvider';
const mocks = vi.hoisted(() => ({ constructeur: vi.fn() }));
vi.mock('openai', () => ({
    // `function` et pas fléchée : le code fait `new OpenAI(...)`.
    default: vi.fn().mockImplementation(function (opts) {
        mocks.constructeur(opts);
        return {};
    }),
}));
const ENV_VARS = ['NVIDIA_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY'];
let sauvegarde = {};
beforeEach(() => {
    sauvegarde = {};
    for (const v of ENV_VARS) {
        sauvegarde[v] = process.env[v];
        delete process.env[v];
    }
    mocks.constructeur.mockClear();
});
afterEach(() => {
    for (const v of ENV_VARS) {
        if (sauvegarde[v] !== undefined)
            process.env[v] = sauvegarde[v];
        else
            delete process.env[v];
    }
});
describe('clés API trimées à la construction', () => {
    test.each([
        ['nvidia', 'NVIDIA_API_KEY', () => new NvidiaProvider()],
        ['openrouter', 'OPENROUTER_API_KEY', () => new OpenRouterProvider()],
        ['deepseek', 'DEEPSEEK_API_KEY', () => new DeepseekProvider()],
    ])('%s : espaces autour de la clé → envoyée trimée', (_nom, variable, construire) => {
        process.env[variable] = '  sk-test-cle-ured  \n';
        construire();
        expect(mocks.constructeur).toHaveBeenCalledOnce();
        expect(mocks.constructeur.mock.calls[0][0].apiKey).toBe('sk-test-cle-ured');
    });
    test('sans clé → aucun client construit (pas de crash)', () => {
        new NvidiaProvider();
        new OpenRouterProvider();
        new DeepseekProvider();
        expect(mocks.constructeur).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=providers.test.js.map