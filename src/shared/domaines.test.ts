import { describe, test, expect } from 'vitest';
import {
  MODES_PAR_TYPE,
  MODES_SCORING,
  TYPES_REPONSE,
  estScoringMode,
  estTypeReponse,
  scoringModeAdmis,
} from './domaines';

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
    expect(MODES_SCORING).not.toContain('MAGIQUE' as never);
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
      const reels = modes.filter((m): m is NonNullable<typeof m> => m !== null);
      expect(reels.length, `type ${type} sans mode de score`).toBeGreaterThan(0);
    }
    // CES est le seul mode partage par plusieurs types : c'est lui qui rend
    // l'aggregation globale legitime, donc il ne doit pas apparaitre ailleurs.
    const typesAvecCES = Object.entries(MODES_PAR_TYPE)
      .filter(([, m]) => m.includes('CES'))
      .map(([t]) => t);
    expect(typesAvecCES).toEqual(['ECHELLE']);
  });
});
