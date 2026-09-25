// src/client/collecte/payload.test.ts
// Le client n'envoie jamais de position ni de score QCM/CASES.
import { expect, test, describe } from 'vitest';
import {
  optionsAffichage,
  payloadSmiley,
  payloadOuiNon,
  payloadQCM,
  payloadTexte,
  payloadValeur,
  payloadCases,
  bornesEchelle,
} from './payload';

describe('optionsAffichage : ids stables en priorité', () => {
  test('table options → ids conservés dans l’ordre d’affichage', () => {
    const r = optionsAffichage({
      options: [
        { id: 'o2', libelle: 'Neutre' },
        { id: 'o1', libelle: 'Très satisfait' },
      ],
      options_reponse: 'IGNORE,ME',
    });
    expect(r).toEqual([
      { id: 'o2', libelle: 'Neutre' },
      { id: 'o1', libelle: 'Très satisfait' },
    ]);
  });

  test('sans table → repli CSV sans id (compat serveur)', () => {
    expect(optionsAffichage({ options_reponse: 'Oui, Non' })).toEqual([
      { id: null, libelle: 'Oui' },
      { id: null, libelle: 'Non' },
    ]);
    expect(optionsAffichage({})).toEqual([]);
  });
});

describe('payloads : identifiants et valeurs, jamais de position', () => {
  test('QCM avec id → optionId seul (aucun score, aucun index)', () => {
    expect(payloadQCM(12, { id: 'o-ts', libelle: 'Très satisfait' })).toEqual({
      critereId: 12, optionId: 'o-ts',
    });
  });

  test('QCM sans id → texte (compat MIGRATED serveur)', () => {
    expect(payloadQCM(12, { id: null, libelle: 'Neutre' })).toEqual({
      critereId: 12, texte: 'Neutre',
    });
  });

  test('CASES avec ids → optionIds', () => {
    expect(
      payloadCases(15, [
        { id: 'opt_1', libelle: 'Attente' },
        { id: 'opt_4', libelle: 'Info' },
      ]),
    ).toEqual({ critereId: 15, optionIds: ['opt_1', 'opt_4'] });
  });

  test('CASES sans ids → texte joint •', () => {
    expect(
      payloadCases(15, [
        { id: null, libelle: 'Attente' },
        { id: null, libelle: 'Info' },
      ]),
    ).toEqual({ critereId: 15, texte: 'Attente • Info' });
  });

  test('TEXTE → verbatim trimé, sans score', () => {
    expect(payloadTexte(14, '  merci  ')).toEqual({ critereId: 14, texte: 'merci' });
  });

  test('OUI_NON → booléen ; SMILEY → note ; ECHELLE/NPS → valeur', () => {
    expect(payloadOuiNon(2, true)).toEqual({ critereId: 2, valeurOui: true });
    expect(payloadSmiley(1, 4)).toEqual({ critereId: 1, score: 4 });
    expect(payloadValeur(3, 8)).toEqual({ critereId: 3, valeur: 8 });
  });

  test('bornesEchelle : défaut 1-5 si illisible', () => {
    expect(bornesEchelle({ options_reponse: '1,10' })).toEqual({ min: 1, max: 10 });
    expect(bornesEchelle({})).toEqual({ min: 1, max: 5 });
    expect(bornesEchelle({ options_reponse: 'nawak' })).toEqual({ min: 1, max: 5 });
  });
});
