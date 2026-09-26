import { describe, test, expect } from 'vitest';
import { COHERENCES_NOTE, MODES_PAR_TYPE, MODES_SCORING, NIVEAUX_CONFIANCE, ORIENTATIONS_NOTE, PERIODES_ANALYSE, PLANS_ENTREPRISE, PROVENANCES_SCORE, ROLES_PLATEFORME, SENTIMENTS_AVIS, TYPES_CANAL, TYPES_REPONSE, estCoherenceNote, estNiveauConfiance, estOrientationNote, estPeriodeAnalyse, estPlanEntreprise, estProvenanceScore, estRolePlateforme, estScoringMode, estSentimentAvis, estTypeCanal, estTypeReponse, scoringModeAdmis, } from './domaines';
describe('domaines de valeurs (P14 j)', () => {
    test('un type de question hors domaine est refuse', () => {
        expect(estTypeReponse('SMILEY')).toBe(true);
        expect(estTypeReponse('NPS')).toBe(true);
        expect(estTypeReponse('OUI_NON')).toBe(true);
        expect(estTypeReponse('MAGIQUE')).toBe(false);
        expect(estTypeReponse('')).toBe(false);
        expect(estTypeReponse(null)).toBe(false);
        expect(estTypeReponse(42)).toBe(false);
    });
    test('NPS est un type de question, pas seulement un mode de score', () => {
        // Regression : NPS figurait dans `scoring_mode` mais pas dans
        // `type_reponse`, alors que `moteurGlobal.ts:272` filtre dessus. Sans lui,
        // le NPS n'entrait dans aucun calcul.
        expect(TYPES_REPONSE).toContain('NPS');
        expect(MODES_PAR_TYPE.NPS).toEqual(['NPS', null]);
    });
    test('MAGIQUE est refuse : il ne figure dans aucune liste du code', () => {
        // Le commentaire de schema.prisma mentionnait MAGIQUE ; aucun code ne le
        // produisait ni ne l'acceptait. L'inclure aurait ouvert un mode invalide.
        expect(MODES_SCORING).not.toContain('MAGIQUE');
        expect(estScoringMode('MAGIQUE')).toBe(false);
    });
    test('un mode incompatible avec le type est refuse', () => {
        expect(scoringModeAdmis('SMILEY', 'SMILEY')).toBe(true);
        expect(scoringModeAdmis('SMILEY', null)).toBe(true);
        expect(scoringModeAdmis('SMILEY', 'CES')).toBe(false);
        expect(scoringModeAdmis('ECHELLE', 'CES')).toBe(true);
        expect(scoringModeAdmis('ECHELLE', 'SMILEY')).toBe(false);
    });
    test('chaque type admet au moins un mode, et un mode unique hors CES', () => {
        // Un type sans mode possible produirait des criteres jamais scorables.
        for (const [type, modes] of Object.entries(MODES_PAR_TYPE)) {
            const reels = modes.filter((m) => m !== null);
            expect(reels.length, `type ${type} sans mode de score`).toBeGreaterThan(0);
        }
        // CES est le seul mode partage par plusieurs types : c'est lui qui rend
        // l'aggregation globale legitime, donc il ne doit pas apparaitre ailleurs.
        const typesAvecCES = Object.entries(MODES_PAR_TYPE)
            .filter(([, m]) => m.includes('CES'))
            .map(([t]) => t);
        expect(typesAvecCES).toEqual(['ECHELLE']);
    });
    test('les 9 domaines restants acceptent leurs valeurs et refusent le reste', () => {
        expect(estRolePlateforme('SUPER_ADMIN')).toBe(true);
        expect(estRolePlateforme('AGENT')).toBe(false);
        expect(estPlanEntreprise('BUSINESS')).toBe(true);
        expect(estPlanEntreprise('PRO')).toBe(false);
        expect(estOrientationNote('LOWER_BETTER')).toBe(true);
        expect(estOrientationNote('SIDEWAYS')).toBe(false);
        expect(estTypeCanal('USSD')).toBe(true);
        expect(estTypeCanal('SMS')).toBe(false);
        expect(estSentimentAvis('NEGATIVE')).toBe(true);
        expect(estSentimentAvis('FURIOUS')).toBe(false);
        expect(estPeriodeAnalyse('MOIS')).toBe(true);
        expect(estPeriodeAnalyse('TRIMESTRE')).toBe(false);
        expect(estNiveauConfiance('MOYENNE')).toBe(true);
        expect(estNiveauConfiance('CERTAIN')).toBe(false);
        expect(estProvenanceScore('MIGRATED')).toBe(true);
        expect(estProvenanceScore('DEVINE')).toBe(false);
        expect(estCoherenceNote('NOTE_PLUS_BASSE_QUE_TEXTE')).toBe(true);
        expect(estCoherenceNote('NOTE_EGALE')).toBe(false);
        expect(estRolePlateforme(null)).toBe(false);
        expect(estPlanEntreprise(undefined)).toBe(false);
    });
    test('MIGRATED est une provenance réelle, pas une valeur parasite', () => {
        // Régression : le backfill historique écrit `MIGRATED` (ni saisi admin,
        // ni inféré). L'exclure de l'enum casserait le backfill ; l'inclure sans
        // le savoir ouvrirait un mode invalide. Les lecteurs rabattent tout ce
        // qui n'est pas EXPLICIT sur INFERRED (`resolutionSoumission.ts`).
        expect(PROVENANCES_SCORE).toContain('MIGRATED');
    });
    test('les listes applicatives couvrent exactement les enums', () => {
        // Si une valeur est ajoutée à un enum sans mettre à jour la garde, la
        // base l'accepte mais l'applicatif la refuse — ou l'inverse. On vérifie
        // la cardinalité de chaque domaine côté applicatif.
        expect(ROLES_PLATEFORME).toHaveLength(3);
        expect(PLANS_ENTREPRISE).toHaveLength(3);
        expect(ORIENTATIONS_NOTE).toHaveLength(2);
        expect(TYPES_CANAL).toHaveLength(3);
        expect(SENTIMENTS_AVIS).toHaveLength(4);
        expect(PERIODES_ANALYSE).toHaveLength(2);
        expect(NIVEAUX_CONFIANCE).toHaveLength(3);
        expect(PROVENANCES_SCORE).toHaveLength(3);
        expect(COHERENCES_NOTE).toHaveLength(2);
    });
});
