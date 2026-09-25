// src/server/gex/moteurGlobal.test.ts
// Phase G : priorités déterministes, confiance, périodes, prompt stable.
import { expect, test, describe } from 'vitest';
import {
  prioriserIrritants,
  niveauConfianceGlobal,
  construirePromptSynthese,
  derniereSemaineComplete,
  moisPrecedent,
  semaineContenant,
  moisContenant,
  type AgregatsGlobaux,
} from './moteurGlobal';
import { SyntheseGlobaleSchema } from '../ai/types';

describe('prioriserIrritants : frequence × gravite × tendance × etendue × confiance', () => {
  const base = {
    total: 100,
    frequencePrecedente: 0.1,
    agencesDistinctes: 2,
    nbAgences: 4,
    confiance: 0.7,
  };

  test('ordre décroissant de priorité, formule exacte', () => {
    // A : 20/100 HIGH(3), prev 0.1 → evo 1 → .2*3*2*.5*.7*100 = 42
    // B : 40/100 LOW(1), prev 0.4 → evo 0 → .4*1*1*.5*.7*100 = 14
    const [a, b] = prioriserIrritants([
      { theme: 'A', count: 20, severiteMax: 'HIGH', ...base },
      { theme: 'B', count: 40, severiteMax: 'LOW', ...base, frequencePrecedente: 0.4 },
    ]);
    expect(a.theme).toBe('A');
    expect(a.priorite).toBe(42);
    expect(b.priorite).toBe(14);
    expect(a.frequence).toBeCloseTo(0.2, 9);
    expect(a.evolution).toBeCloseTo(1, 9);
  });

  test('évolution clampée [-2, 2], nouveau thème (prev 0) borné', () => {
    const [r] = prioriserIrritants([
      { theme: 'N', count: 50, severiteMax: 'CRITICAL', ...base, frequencePrecedente: 0 },
    ]);
    // evo brute = .5/.01 = 50 → clamp 2 → .5*4*3*.5*.7*100 = 210
    expect(r.evolution).toBe(2);
    expect(r.priorite).toBe(210);
  });

  test('vide → vide (pas de division par zéro)', () => {
    expect(prioriserIrritants([])).toEqual([]);
  });
});

describe('niveauConfianceGlobal : volume + qualité − incohérence', () => {
  test('ELEVEE / MOYENNE / FAIBLE + pénalité incohérence', () => {
    expect(niveauConfianceGlobal(60, 80, 0.1)).toBe('ELEVEE');
    expect(niveauConfianceGlobal(60, 80, 0.3)).not.toBe('ELEVEE');
    expect(niveauConfianceGlobal(20, 50, 0.1)).toBe('MOYENNE');
    expect(niveauConfianceGlobal(5, 90, 0)).toBe('FAIBLE');
    expect(niveauConfianceGlobal(100, 20, 0)).toBe('FAIBLE');
  });
});

describe('périodes : semaines complètes, jamais en cours', () => {
  test('dernière semaine complète (ref vendredi 25/09/2026)', () => {
    const { debut, fin } = derniereSemaineComplete(new Date(2026, 8, 25, 12));
    expect(debut.getDay()).toBe(1);
    expect([debut.getDate(), debut.getMonth()]).toEqual([14, 8]);
    expect([fin.getDate(), fin.getMonth()]).toEqual([20, 8]);
    expect(fin.getHours()).toBe(23);
  });

  test('mois précédent complet', () => {
    const { debut, fin } = moisPrecedent(new Date(2026, 8, 25));
    expect([debut.getDate(), debut.getMonth()]).toEqual([1, 7]);
    expect([fin.getDate(), fin.getMonth()]).toEqual([31, 7]);
  });

  test('contenants (déclenchement manuel)', () => {
    const s = semaineContenant(new Date(2026, 8, 25));
    expect(s.debut.getDate()).toBe(21);
    expect(s.fin.getDate()).toBe(27);
    const m = moisContenant(new Date(2026, 8, 25));
    expect(m.debut.getDate()).toBe(1);
    expect(m.fin.getDate()).toBe(30);
  });
});

describe('prompt déterministe + schéma synthèse', () => {
  const agregats: AgregatsGlobaux = {
    volumeAvis: 421,
    volumeNotables: 380,
    volumeCommentaires: 150,
    csat: 78.5,
    distribution5: { '1': 5, '2': 10, '3': 20, '4': 25, '5': 40 },
    nps: null,
    sentiments: { POSITIVE: 60, NEGATIVE: 30 },
    totalAnalyses: 90,
    incoherents: 9,
    tauxIncoherence: 0.1,
    themesTop: [{ theme: 'TEMPS_ATTENTE', count: 31 }],
    themesDetail: [{ theme: 'TEMPS_ATTENTE', count: 31, severiteMax: 'HIGH', agencesDistinctes: 2 }],
    themesTopPrev: [{ theme: 'TEMPS_ATTENTE', count: 20 }],
    totalAnalysesPrev: 70,
    parAgence: [{ id: 1, nom: 'Centrale', volume: 421, csat: 78.5 }],
    parService: [],
    guichetsTop: [],
    guichetsFlop: [],
    evolutionVolumePct: 12,
    evolutionCsatPts: -2,
    qualiteDonnees: 87,
    confiance: 'ELEVEE',
  };

  test('même entrée → même chaîne, nombres cités', () => {
    const p1 = construirePromptSynthese('E', 'S1', agregats, []);
    const p2 = construirePromptSynthese('E', 'S1', agregats, []);
    expect(p1).toBe(p2);
    expect(p1).toContain('421');
    expect(p1).toContain('78.5');
  });

  test('schéma synthèse : valide complet, rejette l’invention de champs', () => {
    const ok = {
      resume_executif: 'Stable.',
      points_positifs: ['Accueil'],
      points_negatifs: ['Attente'],
      irritants: [{ theme: 'TEMPS_ATTENTE', constat: '31 %', priorite: 42, confiance: 'ELEVEE' }],
      tendances: ['Attente en hausse'],
      anomalies: [],
      priorites: ['Renforcer guichet 4'],
      confiance: 'ELEVEE',
      limites: ['12 % legacy'],
    };
    expect(SyntheseGlobaleSchema.safeParse(ok).success).toBe(true);
    expect(
      SyntheseGlobaleSchema.safeParse({ ...ok, confiance: 'CERTAIN' }).success,
    ).toBe(false);
  });
});
