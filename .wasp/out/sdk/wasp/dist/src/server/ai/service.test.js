import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
const providers = vi.hoisted(() => ({
    nvidia: {
        name: 'nvidia',
        nomModele: vi.fn(() => 'mistralai/mistral-nemotron'),
        testerConnexion: vi.fn(),
        analyserAvis: vi.fn(),
        syntheseGlobale: vi.fn(),
    },
    openrouter: {
        name: 'openrouter',
        nomModele: vi.fn(() => 'nvidia/nemotron-3.5-lightning:free'),
        testerConnexion: vi.fn(),
        analyserAvis: vi.fn(),
        syntheseGlobale: vi.fn(),
    },
}));
vi.mock('./nvidiaProvider', () => ({
    NvidiaProvider: class {
        constructor() {
            return providers.nvidia;
        }
    },
}));
vi.mock('./openrouterProvider', () => ({
    OpenRouterProvider: class {
        constructor() {
            return providers.openrouter;
        }
    },
}));
import { AIService } from './service';
const ENV_VARS = [
    'AI_TEST_MODE',
    'AI_TEST_RENDER_SERVICE_ID',
    'RENDER_SERVICE_ID',
    'AI_PROVIDER',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'NVIDIA_API_KEY',
    'NVIDIA_MODEL',
];
let savedEnv = {};
function activerInstanceRenderDeTest() {
    process.env.AI_TEST_MODE = 'true';
    process.env.RENDER_SERVICE_ID = 'srv-yeba-test';
    process.env.AI_TEST_RENDER_SERVICE_ID = 'srv-yeba-test';
}
beforeEach(() => {
    savedEnv = {};
    for (const variable of ENV_VARS) {
        savedEnv[variable] = process.env[variable];
        delete process.env[variable];
    }
    vi.clearAllMocks();
    providers.nvidia.testerConnexion.mockResolvedValue(undefined);
    providers.nvidia.analyserAvis.mockResolvedValue({ sentiment: 'NEGATIVE' });
    providers.nvidia.syntheseGlobale.mockResolvedValue({ resume_executif: 'NVIDIA' });
    providers.openrouter.testerConnexion.mockResolvedValue(undefined);
    providers.openrouter.analyserAvis.mockResolvedValue({ sentiment: 'POSITIVE' });
    providers.openrouter.syntheseGlobale.mockResolvedValue({ resume_executif: 'OpenRouter' });
});
afterEach(() => {
    for (const variable of ENV_VARS) {
        if (savedEnv[variable] === undefined)
            delete process.env[variable];
        else
            process.env[variable] = savedEnv[variable];
    }
});
describe('AIService: routage et repli limités aux tests', () => {
    test('en production, n’envoie jamais un avis à NVIDIA même si sa clé existe', async () => {
        process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        const result = await AIService.analyserAvis('avis synthétique');
        expect(result).toMatchObject({ provider: 'openrouter', model: 'nvidia/nemotron-3.5-lightning:free' });
        expect(providers.openrouter.analyserAvis).toHaveBeenCalledOnce();
        expect(providers.nvidia.analyserAvis).not.toHaveBeenCalled();
    });
    test('en mode test, bascule de NVIDIA vers OpenRouter gratuit si NVIDIA échoue', async () => {
        activerInstanceRenderDeTest();
        process.env.AI_PROVIDER = 'nvidia';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
        process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3.5-lightning:free';
        providers.nvidia.analyserAvis.mockRejectedValueOnce(new Error('provider failure'));
        const result = await AIService.analyserAvis('avis fictif');
        expect(providers.nvidia.analyserAvis).toHaveBeenCalledOnce();
        expect(providers.openrouter.analyserAvis).toHaveBeenCalledOnce();
        expect(result).toMatchObject({ provider: 'openrouter', model: 'nvidia/nemotron-3.5-lightning:free' });
    });
    test('en mode test, conserve NVIDIA quand son analyse réussit sans appeler le secours', async () => {
        activerInstanceRenderDeTest();
        process.env.AI_PROVIDER = 'nvidia';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
        process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3.5-lightning:free';
        const result = await AIService.analyserAvis('avis fictif');
        expect(providers.nvidia.analyserAvis).toHaveBeenCalledOnce();
        expect(providers.openrouter.analyserAvis).not.toHaveBeenCalled();
        expect(result).toMatchObject({ provider: 'nvidia', model: 'mistralai/mistral-nemotron' });
    });
    test('en mode test, peut aussi basculer d’OpenRouter vers NVIDIA', async () => {
        activerInstanceRenderDeTest();
        process.env.AI_PROVIDER = 'openrouter';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
        process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3.5-lightning:free';
        providers.openrouter.analyserAvis.mockRejectedValueOnce(new Error('provider failure'));
        const result = await AIService.analyserAvis('avis fictif');
        expect(providers.openrouter.analyserAvis).toHaveBeenCalledOnce();
        expect(providers.nvidia.analyserAvis).toHaveBeenCalledOnce();
        expect(result).toMatchObject({ provider: 'nvidia', model: 'mistralai/mistral-nemotron' });
    });
    test('le test synthétique de connexion suit le même ordre de repli', async () => {
        activerInstanceRenderDeTest();
        process.env.AI_PROVIDER = 'nvidia';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
        process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3.5-lightning:free';
        providers.nvidia.testerConnexion.mockRejectedValueOnce(new Error('provider failure'));
        const result = await AIService.testerConnexion();
        expect(providers.nvidia.testerConnexion).toHaveBeenCalledOnce();
        expect(providers.openrouter.testerConnexion).toHaveBeenCalledOnce();
        expect(result.lastProbeStatus).toBe('success');
        expect(AIService.status().lastProbeProvider).toBe('OpenRouter');
    });
    test('sans OpenRouter gratuit en production, NVIDIA seul ne rend pas l’IA configurée', () => {
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.OPENROUTER_MODEL = 'un-modele-payant';
        expect(AIService.isConfigured()).toBe(false);
    });
    test('refuse NVIDIA si le service Render ne correspond pas à l’identifiant autorisé de test', () => {
        process.env.AI_TEST_MODE = 'true';
        process.env.AI_PROVIDER = 'nvidia';
        process.env.NVIDIA_API_KEY = 'nvidia-test-key';
        process.env.RENDER_SERVICE_ID = 'srv-production';
        process.env.AI_TEST_RENDER_SERVICE_ID = 'srv-test';
        expect(AIService.isConfigured()).toBe(false);
        expect(AIService.status().testMode).toBe(false);
        expect(providers.nvidia.analyserAvis).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=service.test.js.map