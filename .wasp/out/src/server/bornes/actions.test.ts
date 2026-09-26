// src/server/bornes/actions.test.ts
// ============================================================================
// VAGUE 5, P11-a — le volume de réponses d'un avis est borné.
//
// `actions.ts` importe `wasp/server` et l'ensemble de la couche serveur ;
// la règle de volume est donc extraite en fonction pure et testée ici.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { verifierVolumeReponses } from '../actions';

const reponses = (n: number) => Array.from({ length: n }, (_, i) => ({ critereId: i + 1 }));

describe('P11-a — borne haute sur le nombre de réponses', () => {
  test('un formulaire réaliste passe', () => {
    expect(verifierVolumeReponses(reponses(1))).toBeNull();
    expect(verifierVolumeReponses(reponses(12))).toBeNull();
    expect(verifierVolumeReponses(reponses(50))).toBeNull();
  });

  test('au-delà de la borne, le message est explicite sur le maximum', () => {
    const erreur = verifierVolumeReponses(reponses(51));
    expect(erreur).not.toBeNull();
    // Le client sait quoi faire, et le message nomme la limite.
    expect(erreur).toContain('50');
  });

  test('un volume abusive est refusé, pas tronqué', () => {
    // Tronquer laisserait croire au client que son avis a été enregistré
    // en entier alors que des réponses manqueraient en silence.
    const erreur = verifierVolumeReponses(reponses(100_000));
    expect(erreur).not.toBeNull();
  });

  test('le chemin legacy (une seule réponse) n\'est pas concerné', () => {
    // `responses` absent n'est pas une erreur ici : c'est le chemin
    // `score` + `critereId` qui prend le relais, plus bas.
    expect(verifierVolumeReponses(undefined)).toBeNull();
    expect(verifierVolumeReponses(null)).toBeNull();
  });

  test('une valeur qui n\'est pas un tableau n\'est pas du ressort de ce garde', () => {
    // Le typage des entrées est traité ailleurs ; ici on ne refuse que
    // le volume, pour ne pas changer la surface d'erreur de l'action.
    expect(verifierVolumeReponses('beaucoup')).toBeNull();
    expect(verifierVolumeReponses({ longueur: 1000 })).toBeNull();
  });

  test('la borne est paramétrable pour un test de frontière', () => {
    expect(verifierVolumeReponses(reponses(3), 3)).toBeNull();
    expect(verifierVolumeReponses(reponses(4), 3)).not.toBeNull();
  });
});
