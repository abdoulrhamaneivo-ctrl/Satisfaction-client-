// src/server/jobs/rapportMensuel.test.ts
// ============================================================================
// RAPPORTS (§14) : consolidation multi-agences (pure) + période
// personnalisée du déclencheur GEX (garde-fous). Les jobs eux-mêmes
// parlent à Prisma : non testés ici, bornes couvertes par les purs.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { consoliderStatsAgences } from './rapportMensuel';
import { declencherAnalyseGlobale } from '../globalExperience';
const stats = (partiel) => ({
    agenceNom: 'A',
    commune: 'Abidjan',
    totalAvis: 0,
    noteMoyenne: 0,
    satisfaits: 0,
    tauxSatisfaction: 0,
    alertesCritiques: 0,
    tachesOuvertes: 0,
    ...partiel,
});
describe('consoliderStatsAgences : UN email direction, chiffres vrais', () => {
    test('somme les volumes, recalcule le taux (jamais moyenné)', () => {
        const c = consoliderStatsAgences([
            stats({ agenceNom: 'A1', totalAvis: 100, satisfaits: 80, noteMoyenne: 4, alertesCritiques: 2, tachesOuvertes: 1 }),
            stats({ agenceNom: 'A2', totalAvis: 300, satisfaits: 150, noteMoyenne: 3, alertesCritiques: 5, tachesOuvertes: 0 }),
        ]);
        expect(c?.totalAvis).toBe(400);
        // Taux global = 230/400, PAS la moyenne de 80 % et 50 %.
        expect(c?.tauxSatisfaction).toBeCloseTo(57.5, 9);
        // Note pondérée par le volume : (4×100 + 3×300)/400 = 3.25.
        expect(c?.noteMoyenne).toBeCloseTo(3.25, 9);
        expect(c?.alertesCritiques).toBe(7);
        expect(c?.tachesOuvertes).toBe(1);
        expect(c?.agenceNom).toBe('Toutes les agences');
    });
    test('agences vides exclues ; rien que du vide → null (pas d’email)', () => {
        const c = consoliderStatsAgences([
            stats({ totalAvis: 0 }),
            stats({ totalAvis: 10, satisfaits: 10, noteMoyenne: 5 }),
        ]);
        expect(c?.totalAvis).toBe(10);
        expect(c?.commune).toBe('1 agence');
        expect(consoliderStatsAgences([stats({})])).toBeNull();
        expect(consoliderStatsAgences([])).toBeNull();
    });
});
describe('declencherAnalyseGlobale : période personnalisée', () => {
    const ctxAvec = (upsertImpl) => ({
        user: { id: 'u1', role: 'DIRECTION', actif: true, id_entreprise: 1 },
        entities: {
            Entreprise: { findUnique: async () => ({ status: 'ACTIVE' }) },
            GlobalExperienceAnalysis: { upsert: upsertImpl },
        },
    });
    test('bornes valides → PENDING avec debut 00:00 / fin 23:59:59', async () => {
        let where;
        let data;
        const ctx = ctxAvec(async (args) => {
            where = args.where;
            data = args.create;
            return { id: BigInt(9), status: 'PENDING' };
        });
        const r = await declencherAnalyseGlobale({ periode: 'PERSONNALISEE', debut: '2026-09-01', fin: '2026-09-10' }, ctx);
        expect(String(r.id)).toBe('9');
        expect(where.id_entreprise_periode_debut_fin.periode).toBe('PERSONNALISEE');
        expect(data.debut).toEqual(new Date('2026-09-01T00:00:00'));
        expect(data.fin).toEqual(new Date('2026-09-10T23:59:59.999'));
    });
    test('garde-fous : dates manquantes, inversées, > 92 j, futur → 400', async () => {
        const ctx = ctxAvec(async () => ({ id: BigInt(1), status: 'PENDING' }));
        const cas = [
            { periode: 'PERSONNALISEE', debut: '2026-09-01' },
            { periode: 'PERSONNALISEE', debut: '2026-09-10', fin: '2026-09-01' },
            { periode: 'PERSONNALISEE', debut: '2026-01-01', fin: '2026-06-01' },
            { periode: 'PERSONNALISEE', debut: '2026-09-01', fin: '2999-01-01' },
            { periode: 'PERSONNALISEE', debut: 'nimporte', fin: '2026-09-01' },
            { periode: 'TRIMESTRE' },
        ];
        for (const args of cas) {
            let statut = 0;
            try {
                await declencherAnalyseGlobale(args, ctx);
            }
            catch (e) {
                statut = e?.statusCode ?? 500;
            }
            expect(statut, JSON.stringify(args)).toBe(400);
        }
    });
    test('SEMAINE inchangée (non-régression)', async () => {
        let where;
        const ctx = ctxAvec(async (args) => {
            where = args.where;
            return { id: BigInt(2), status: 'PENDING' };
        });
        await declencherAnalyseGlobale({ periode: 'SEMAINE' }, ctx);
        expect(where.id_entreprise_periode_debut_fin.periode).toBe('SEMAINE');
    });
});
//# sourceMappingURL=rapportMensuel.test.js.map