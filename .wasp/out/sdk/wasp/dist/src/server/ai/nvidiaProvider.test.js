import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ completion: vi.fn() }));
vi.mock('openai', () => ({
    default: class {
        chat = { completions: { create: mocks.completion } };
    },
}));
import { NvidiaProvider } from './nvidiaProvider';
let originalKey;
beforeEach(() => {
    originalKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = 'nvapi-test-key';
    mocks.completion.mockReset();
    mocks.completion.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
                        sentiment: 'NEGATIVE', sentiment_score: 0.9, themes: ['SERVICE'], urgence: 'LOW', resume: 'Problème de service',
                    }) } }],
    });
});
afterEach(() => {
    if (originalKey === undefined)
        delete process.env.NVIDIA_API_KEY;
    else
        process.env.NVIDIA_API_KEY = originalKey;
});
describe('NvidiaProvider', () => {
    test('masque les coordonnées usuelles avant d’envoyer un avis', async () => {
        await new NvidiaProvider().analyserAvis('Réponse à contact@yeba.ci ou au +225 01 02 03 04 05');
        const sentText = mocks.completion.mock.calls[0][0].messages[1].content;
        expect(sentText).toContain('[courriel masqué]');
        expect(sentText).toContain('[téléphone masqué]');
        expect(sentText).not.toContain('contact@yeba.ci');
        expect(sentText).not.toContain('+225 01 02 03 04 05');
    });
    test('refuse le test synthétique si la réponse du modèle est vide', async () => {
        mocks.completion.mockResolvedValueOnce({ choices: [{ message: { content: null, reasoning: null } }] });
        await expect(new NvidiaProvider().testerConnexion()).rejects.toThrow(/réponse vide/i);
    });
});
//# sourceMappingURL=nvidiaProvider.test.js.map