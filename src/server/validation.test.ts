// src/server/validation.test.ts
// ============================================================================
// VAGUE 5, P11 — distinguer une faute de saisie d'une panne.
//
// Constat : `sanitiserCommentaire` levait un `Error` ordinaire, appelé
// HORS du try/catch qui traduit en `HttpError`. Un commentaire de plus de
// 1000 caractères — donc une simple faute de frappe au guichet —
// remontait jusqu'au wrapper de l'action et devenait un 500 « réessayez
// plus tard ». Le client ne savait pas quoi corriger, et le front ne
// pouvait pas distinguer une coupure réseau d'un refus définitif.
//
// Ces tests verrouillent le contrat : une erreur de saisie doit être
// identifiable comme telle et traduite en 4xx, jamais en 5xx.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { HttpError } from 'wasp/server';
import {
  sanitiserCommentaire,
  versHttpSiEntreeInvalide,
  ValiderEntreeErreur,
  MAX_LONGUEUR_COMMENTAIRE,
} from './validation';

describe('P11 — le commentaire trop long est une erreur de saisie, pas une panne', () => {
  test('lève une erreur identifiée COMME erreur de saisie', () => {
    const tropLong = 'a'.repeat(MAX_LONGUEUR_COMMENTAIRE + 1);
    let levee: unknown;
    try {
      sanitiserCommentaire(tropLong);
    } catch (e) {
      levee = e;
    }
    expect(levee).toBeInstanceOf(ValiderEntreeErreur);
    expect((levee as ValiderEntreeErreur).code).toBe('ENTREE_INVALIDE');
  });

  test('se traduit en 400, pas en 500', () => {
    const tropLong = 'a'.repeat(MAX_LONGUEUR_COMMENTAIRE + 1);
    let levee: unknown;
    try {
      sanitiserCommentaire(tropLong);
    } catch (e) {
      levee = e;
    }
    const http = versHttpSiEntreeInvalide(levee);
    expect(http).toBeInstanceOf(HttpError);
    // 4xx : le client sait qu'il doit corriger. 5xx lui dirait « réessayez »,
    // ce qui est faux — recommencer donnerait exactement le même refus.
    expect((http as HttpError).statusCode).toBe(400);
    expect((http as HttpError).message).toMatch(/1000/);
  });

  test('une panne réelle reste une panne : elle ne passe pas en 400', () => {
    // La traduction ne doit attraper QUE les erreurs de saisie. Une
    // indisponibilité de base doit continuer de produire un 500, sinon on
    // demanderait à l'utilisateur de « corriger » une panne serveur.
    for (const panne of [new Error('connexion refusée'), new TypeError('undefined')]) {
      expect(versHttpSiEntreeInvalide(panne)).toBeNull();
    }
    expect(versHttpSiEntreeInvalide('chaîne')).toBeNull();
    expect(versHttpSiEntreeInvalide(null)).toBeNull();
  });
});

describe('P11 — le comportement de sanitisation est inchangé', () => {
  test('un commentaire à la limite exacte est accepté', () => {
    const limite = 'a'.repeat(MAX_LONGUEUR_COMMENTAIRE);
    expect(sanitiserCommentaire(limite)).toHaveLength(MAX_LONGUEUR_COMMENTAIRE);
  });

  test('les espaces de bord sont retirés avant le comptage', () => {
    // 1000 caractères utiles entourés d'espaces : accepté, car c'est le
    // texte conservé qui compte.
    const texte = `  ${'a'.repeat(MAX_LONGUEUR_COMMENTAIRE)}  `;
    expect(sanitiserCommentaire(texte)).toHaveLength(MAX_LONGUEUR_COMMENTAIRE);
  });

  test('le HTML est retiré et le texte conservé', () => {
    expect(sanitiserCommentaire('<b>Bonjour</b>')).toBe('Bonjour');
  });

  test('un commentaire vide ou blanc ne lève rien', () => {
    expect(sanitiserCommentaire('')).toBe('');
    expect(sanitiserCommentaire('   ')).toBe('');
  });
});
