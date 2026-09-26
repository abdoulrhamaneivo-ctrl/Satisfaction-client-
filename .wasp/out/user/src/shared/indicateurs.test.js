// src/shared/indicateurs.test.ts — Phase H : catalogue, bandes, N/A, qualité.
import { expect, test, describe } from 'vitest';
import { distributionBandends, mediane, tauxReponse, scoreQualiteDonnees, definitionIndicateur, indiceGlobalExperience, CATALOGUE_INDICATEURS, } from './indicateurs';
describe('bandes CSAT et médiane', () => {
    test('bandes /100 exactes', () => {
        expect(distributionBandends([100, 80, 79, 60, 59, 40, 39, 20, 19, 0])).toEqual({
            tres_satisfaits: 2,
            satisfaits: 2,
            neutres: 2,
            insatisfaits: 2,
            tres_insatisfaits: 2,
        });
    });
    test('médiane paire/impaire/vide', () => {
        expect(mediane([10, 30, 20])).toBe(20);
        expect(mediane([10, 20, 30, 40])).toBe(25);
        expect(mediane([])).toBeNull();
    });
});
describe('taux de réponse : jamais de dénominateur inventé', () => {
    test('OK quand le dénominateur existe', () => {
        expect(tauxReponse({ visiteursEstimes: 200, questionnairesTermines: 50 })).toEqual({
            taux: 25,
            statut: 'OK',
        });
    });
    test.each([[undefined], [null], [0], [-5]])('N/A si dénominateur %s', (v) => {
        expect(tauxReponse({ visiteursEstimes: v, questionnairesTermines: 50 })).toEqual({
            taux: null,
            statut: 'N/A',
        });
    });
});
describe('DATA_QUALITY_SCORE décomposé', () => {
    test('jeu parfait → 100, détails à 100', () => {
        const r = scoreQualiteDonnees({
            totalReponses: 100, notables: 100, avecCommentaire: 100,
            incoherentes: 0, legacy: 0, inferees: 0,
        });
        expect(r.score).toBe(100);
        expect(r.details).toEqual({
            notables: 100, commentaires: 100, coherence: 100, fraicheur_legacy: 100, volume: 100,
        });
    });
    test('vide → 0 partout (pas de division par zéro)', () => {
        expect(scoreQualiteDonnees({
            totalReponses: 0, notables: 0, avecCommentaire: 0,
            incoherentes: 0, legacy: 0, inferees: 0,
        }).score).toBe(0);
    });
    test('legacy pénalisé à moitié pour inféré, plein pour positionnel', () => {
        const plein = scoreQualiteDonnees({
            totalReponses: 100, notables: 100, avecCommentaire: 100,
            incoherentes: 0, legacy: 100, inferees: 0,
        });
        const moitie = scoreQualiteDonnees({
            totalReponses: 100, notables: 100, avecCommentaire: 100,
            incoherentes: 0, legacy: 0, inferees: 100,
        });
        expect(moitie.details.fraicheur_legacy).toBe(50);
        expect(plein.details.fraicheur_legacy).toBe(0);
        expect(moitie.score).toBeGreaterThan(plein.score);
    });
});
describe('indice global : formule documentée, jamais cachée', () => {
    test('CSAT seul par défaut', () => {
        expect(indiceGlobalExperience({ csat: 78.5 })).toEqual({
            indice: 79,
            formule: 'CSAT seul (NPS/CES indisponibles)',
        });
    });
    test('60/40 avec NPS normalisé', () => {
        // 0.6×80 + 0.4×((34+100)/2=67) = 48 + 26.8 = 74.8 → 75
        expect(indiceGlobalExperience({ csat: 80, nps: 34 })).toEqual({
            indice: 75,
            formule: '60 % CSAT + 40 % NPS normalisé ((nps+100)/2)',
        });
    });
    test('CES partiel : repondération sur le disponible', () => {
        const r = indiceGlobalExperience({ csat: 80, ces: 70 });
        expect(r.indice).toBe(Math.round((0.5 * 80 + 0.2 * 70) / 0.7));
        expect(r.formule).toContain('CSAT');
        expect(r.formule).toContain('CES');
    });
});
describe('catalogue : chaque KPI est défini', () => {
    test('ids uniques, NPS/CSAT/qualité présents, formule non vide', () => {
        const ids = CATALOGUE_INDICATEURS.map((d) => d.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ['CSAT', 'NPS', 'DATA_QUALITY_SCORE', 'TAUX_REPONSE', 'COHERENCE_PCT']) {
            const d = definitionIndicateur(id);
            expect(d).not.toBeNull();
            expect(d?.formule.trim().length).toBeGreaterThan(0);
        }
        expect(definitionIndicateur('INCONNU')).toBeNull();
    });
});
/* ============================================================================
 * VAGUE 6 — DATA_QUALITY_SCORE n'a qu'une seule définition.
 * ============================================================================
 * Le moteur global recalculait la qualité des données avec ses propres
 * poids (50/30/20) pendant que le catalogue en documentait d'autres
 * (35/20/20/15/10). Deux définitions, une seule affichée : le catalogue
 * mentait sur la formule et rien ne le signalait.
 *
 * Ces tests rendent l'invariant impossible à contourner silencieusement.
 */
describe('Vague 6 — source unique de la qualité des données', () => {
    test('le moteur global appelle la formule canonique', async () => {
        // On observe l'effet, pas l'import : un calcul identique réécrit sur
        // place donnerait le même résultat sans être la source unique. Ce que
        // ce test interdit, c'est une valeur qui S'ÉCARTE de la formule.
        const { calculerAgregats } = await import('../server/gex/moteurGlobal');
        const reponses = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            id_soumission: `soumission-${Math.floor(i / 3)}`,
            score_normalise: i % 5 === 0 ? null : 80,
            score_officiel: i % 5 === 0 ? null : 4,
            score_source: i % 5 === 0 ? 'LEGACY_POSITIONAL' : 'EXPLICIT',
            commentaire_texte: i % 2 === 0 ? 'un commentaire' : null,
            id_agence: 1,
            id_guichet: 1,
            id_service: null,
            critere: { type_reponse: 'SMILEY', libelle_critere: 'Satisfaction', scoring_mode: 'NPS', options_reponse: [] },
            guichet: { nom_guichet: 'G1' },
            service: { libelle_service: null },
            agence: { nom_agence: 'A1' },
        }));
        const db = {
            agence: { findMany: async () => [{ id: 1, nom_agence: 'A1' }] },
            reponse: { findMany: async () => reponses },
            analyseAvisIA: { findMany: async () => [] },
        };
        const agregats = await calculerAgregats(db, {
            id_entreprise: 1,
            debut: new Date('2026-01-01'),
            fin: new Date('2026-01-31'),
        });
        // La même valeur, recalculée à la main avec la formule canonique.
        const attendu = scoreQualiteDonnees({
            totalReponses: 50,
            notables: reponses.filter((r) => typeof r.score_normalise === 'number').length,
            avecCommentaire: reponses.filter((r) => r.commentaire_texte).length,
            incoherentes: 0,
            legacy: reponses.filter((r) => r.score_source === 'LEGACY_POSITIONAL').length,
            inferees: 0,
        });
        expect(agregats.qualiteDonnees).toBe(attendu.score);
        expect(agregats.qualiteDonneesDetails).toEqual(attendu.details);
    });
    test('aucune formule de qualité en dur ailleurs que dans le module canonique', async () => {
        // Garde-fou structurel : la pondération (35/20/20/15/10) ne doit
        // exister qu'à un seul endroit du dépôt. Une duplication réintroduite
        // avec les mêmes chiffres ferait diverger la documentation de la
        // métrique — exactement le défaut que cette vague corrige.
        const { readFileSync } = await import('node:fs');
        const faux = readFileSync('src/server/gex/moteurGlobal.ts', 'utf8');
        const canonique = readFileSync('src/shared/indicateurs.ts', 'utf8');
        const poidsCanonique = [0.35, 0.2, 0.2, 0.15, 0.1];
        for (const poids of poidsCanonique) {
            expect(canonique).toContain(String(poids));
            // Hors du module canonique, un poids de qualité isolé doit être absent.
            // (0.2 est trop générique pour être assertion ; on vérifie les autres.)
            if (poids !== 0.2)
                expect(faux).not.toContain(String(poids));
        }
        // Et l'ancienne pondération de trois termes a disparu.
        expect(faux).not.toMatch(/0\.5 \* partNotables/);
        expect(faux).not.toMatch(/0\.3 \* partCommentaires/);
    });
});
