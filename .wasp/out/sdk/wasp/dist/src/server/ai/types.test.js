// src/server/ai/types.test.ts
// Phase F : schéma v2 (rétrocompat v1) + cohérence note/texte (§24).
import { expect, test, describe } from 'vitest';
import { AnalyseResultSchema, evaluerCoherenceNote } from './types';
const BASE_V1 = {
    sentiment: 'NEGATIVE',
    sentiment_score: 0.2,
    themes: ['TEMPS_ATTENTE'],
    probleme_principal: "temps_d_attente",
    urgence: 'HIGH',
    resume: 'Attente très longue au guichet, client mécontent.',
    action_recommandee: 'Renforcer le guichet aux heures de pointe.',
};
describe('AnalyseResultSchema v2', () => {
    test('payload v1 (sans champs étendus) toujours accepté', () => {
        const r = AnalyseResultSchema.safeParse(BASE_V1);
        expect(r.success).toBe(true);
    });
    test('payload v2 complet accepté', () => {
        const r = AnalyseResultSchema.safeParse({
            ...BASE_V1,
            sous_themes: ['TEMPS_ATTENTE'],
            problemes_secondaires: ['manque de personnel'],
            severite: 'HIGH',
            emotion: 'colère',
            confidence: 0.89,
        });
        expect(r.success).toBe(true);
    });
    test('rejette sentiment inconnu et confidence hors bornes', () => {
        expect(AnalyseResultSchema.safeParse({ ...BASE_V1, sentiment: 'FURIEUX' }).success).toBe(false);
        expect(AnalyseResultSchema.safeParse({ ...BASE_V1, confidence: 1.5 }).success).toBe(false);
        expect(AnalyseResultSchema.safeParse({ ...BASE_V1, sous_themes: ['INCONNU'] }).success).toBe(false);
    });
});
describe('cohérence note/texte (§24) : le score officiel n’est jamais modifié', () => {
    test('5/5 rancunier → incohérent, NEGATIVE retenu', () => {
        const c = evaluerCoherenceNote(5, 'NEGATIVE', 'Attente interminable.');
        expect(c.incoherent).toBe(true);
        expect(c.type).toBe('NOTE_PLUS_HAUTE_QUE_TEXTE');
        expect(c.sentiment_retenu).toBe('NEGATIVE');
    });
    test('1/5 satisfait → incohérent, MIXED retenu', () => {
        const c = evaluerCoherenceNote(1, 'POSITIVE', 'Tout était parfait.');
        expect(c.incoherent).toBe(true);
        expect(c.type).toBe('NOTE_PLUS_BASSE_QUE_TEXTE');
        expect(c.sentiment_retenu).toBe('MIXED');
    });
    test('3/5 ou MIXED → cohérent, sentiment inchangé', () => {
        expect(evaluerCoherenceNote(3, 'NEGATIVE', 'x').incoherent).toBe(false);
        expect(evaluerCoherenceNote(5, 'MIXED', 'x').sentiment_retenu).toBe('MIXED');
        expect(evaluerCoherenceNote(null, 'NEGATIVE', 'x').incoherent).toBe(false);
    });
});
//# sourceMappingURL=types.test.js.map