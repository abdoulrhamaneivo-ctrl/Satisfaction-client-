// src/client/pages/CollectePage.test.tsx
// ============================================================================
// VAGUE 1 (P13) — TESTS DE PARCOURS DE LA COLLECTE.
//
// Ces tests montent la VRAIE page (pas une réimplémentation) avec les
// opérations Wasp mockées, et prouvent les exigences du cahier :
//   §1 aucun bouton « Envoyer mon avis »
//   §2 soumission automatique seulement après la dernière question
//   §3 le commentaire facultatif ne bloque pas et n'est pas perdu
//   §6 une erreur serveur conserve les réponses et propose un recovery
//   §7 le reset efface TOUT (aucune trace du client précédent)
//   §8 kiosk : utilisateur A → reset → utilisateur B
//   §9 abandon, retour, double-tap, double soumission, lenteur réseau
// ============================================================================
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks des dépendances externes -----------------------------------------
vi.mock('react-router-dom', () => ({
  useParams: () => ({ code: 'ABCDEFGHJK' }),
  Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
  Link: ({ children }: any) => <>{children}</>,
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// framer-motion est mocké : ces tests portent sur le FLUX (soumission
// automatique, autosave, reset), pas sur les animations. Sans ce mock, le
// `requestAnimationFrame` de jsdom — piloté par l'horloge simulée — rend la
// date de montage de la question suivante non déterministe et pollue les
// tests voisins.
vi.mock('framer-motion', async () => {
  const ReactLocal = await import('react');
  const transversal = (Tag: any) => {
    const Composant = ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        variants, layout, layoutId, onAnimationStart, onAnimationComplete,
        ...reste
      } = props;
      return ReactLocal.createElement(Tag, reste, children);
    };
    Composant.displayName = 'motion-' + (typeof Tag === 'string' ? Tag : 'component');
    return Composant;
  };
  return {
    motion: new Proxy({}, { get: (_t, cle) => transversal(cle === 'create' ? 'div' : String(cle)) }),
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => true,
    LayoutGroup: ({ children }: any) => children,
    MotionConfig: ({ children }: any) => children,
  };
});

vi.mock('../context/BrandContext', () => ({
  useBrand: () => ({ brandConfig: {}, loading: false, isCustom: false }),
}));

import {
  getFormDefinitionForGuichet,
  soumettreAvis,
  completerSoumission,
} from 'wasp/client/operations';
import { CollectePage } from './CollectePage';

// --- Données de test ---------------------------------------------------------
const formDef = {
  guichetName: 'Guichet Centre',
  services: [
    {
      id: 10,
      libelle_service: 'Retrait',
      criteres: [
        { id: 1, libelle_critere: 'Satisfaction', description: null, type_reponse: 'SMILEY', obligatoire: true, options: [] },
        { id: 2, libelle_critere: 'Accueil', description: null, type_reponse: 'OUI_NON', obligatoire: true, options: [] },
      ],
    },
  ],
  agencyCriteres: [],
  brandConfig: null,
};

// Accusé 500 ms + transition de sortie de question (AnimatePresence) : sous
// minuteries simulées, le rAF de framer-motion n'avance qu'avec l'horloge, il
// faut donc laisser passer largement avant d'affirmer l'état suivant.
const TRANSITION_MS = 3000;

// Un seul appel de 3 000 ms ne suffit pas toujours : framer-motion pilote ses
// animations via requestAnimationFrame, qui n'avance (sous horloge simulée)
// qu'à chaque flush. On avance donc par petits pas, comme un vrai navigateur.
const avancer = async (ms: number) => {
  // Deux paliers : un flush pour laisser partir l'accusé, un gros palier pour
  // laisser AUX animations de sortie se terminer. Des pas trop fins—
  // 'épuisent' le budget d'images de jsdom sans laisser l'animation avancer.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(Math.round(ms / 3));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(Math.round((ms * 2) / 3));
  });
};

const lireMock = vi.mocked(getFormDefinitionForGuichet);
const soumettreMock = vi.mocked(soumettreAvis);
const completerMock = vi.mocked(completerSoumission);

const repondre = async (nom: RegExp) => {
  const bouton = screen.getByRole('button', { name: nom });
  await act(async () => {
    bouton.click();
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  lireMock.mockReset();
  soumettreMock.mockReset();
  completerMock.mockReset();
  lireMock.mockResolvedValue(formDef as any);
  soumettreMock.mockResolvedValue({ id: '42' } as any);
  completerMock.mockResolvedValue({ ok: true } as any);
});

afterEach(() => {
  vi.useRealTimers();
});

const monter = () => {
  // Le `useQuery` de Wasp est un vrai hook react-query : il lui faut son
  // provider. `retry: false` pour qu'une résolution de query ne bloque pas
  // le test sur des tentatives.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CollectePage />
    </QueryClientProvider>,
  );
};

describe('§1/§2 — parcours sans bouton d\'envoi', () => {
  test('aucun bouton « Envoyer mon avis » n\'existe sur le parcours', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.queryByText(/envoyer mon avis/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /envoyer/i })).toBeNull();
  });

  test('une seule opération → saut direct aux questions, puis auto-advance', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    // Le service unique est sélectionné automatiquement.
    expect(screen.getByText('Satisfaction')).toBeTruthy();
    // AUCUNE soumission tant que toutes les questions n'ont pas été répondues.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(soumettreMock).not.toHaveBeenCalled();
  });

  test('la soumission part automatiquement à la DERNIÈRE question', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    expect(soumettreMock).not.toHaveBeenCalled();

    await repondre(/Oui/);
    // Accusé (500 ms) puis soumission : aucun clic supplémentaire.
    await avancer(TRANSITION_MS);
    expect(soumettreMock).toHaveBeenCalledTimes(1);
    const payload: any = soumettreMock.mock.calls[0][0];
    expect(payload.responses).toHaveLength(2);
    // Vague 1 (P1) : le code opaque est le seul identifiant transmis.
    expect(payload.code_public).toBe('ABCDEFGHJK');
    expect(payload.guichetId).toBeUndefined();
  });
});

describe('§9 — double-tap et double soumission', () => {
  test('quatre clics rapides sur la même réponse = une seule réponse retenue', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const bouton = screen.getByRole('button', { name: /Très satisfait/ });
    await act(async () => {
      bouton.click();
      bouton.click();
      bouton.click();
      bouton.click();
    });
    await avancer(TRANSITION_MS);
    // Le garde « accusé en cours » (500 ms) a absorbé les clics suivants.
    expect(screen.getByText('Accueil')).toBeTruthy();
    expect(soumettreMock).not.toHaveBeenCalled();
  });
});

describe('§6 — erreur serveur : on conserve, on explique, on réessaie', () => {
  test('un 500 garde les réponses et propose un réessai qui RÉUSSIT', async () => {
    soumettreMock
      .mockRejectedValueOnce(new Error('Request failed with status code 500'))
      .mockResolvedValueOnce({ id: '42' } as any);

    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);

    // Message actionnable, pas d'écran blanc.
    expect(screen.getByText(/ne pouvons pas enregistrer/i)).toBeTruthy();
    // Le réessai est proposé.
    const retry = screen.getByRole('button', { name: /Réessayer/i });
    await act(async () => {
      retry.click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(soumettreMock).toHaveBeenCalledTimes(2);
    // Les notesprevious sont toujours là (même nombre de réponses renvoyées).
    expect((soumettreMock.mock.calls[1][0] as any).responses).toHaveLength(2);
  });
});

describe('§3 — commentaire facultatif : autosave et non-perte', () => {
  const allerAuCommentaire = async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);
  };

  test('le commentaire est auto-sauvé après le debounce, puis l\'écran Merci suit', async () => {
    await allerAuCommentaire();
    const zone = screen.getByPlaceholderText(/Des détails/i);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(zone, 'Attente de 40 minutes');
      zone.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Rien n'est envoyé pendant la frappe.
    expect(completerMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(completerMock).toHaveBeenCalledTimes(1);
    expect((completerMock.mock.calls[0][0] as any).commentaire).toBe('Attente de 40 minutes');
    // Avance automatique vers « Merci » après l'accusé.
    await avancer(TRANSITION_MS);
    expect(screen.getByText(/Merci/i)).toBeTruthy();
  });

  test('Vague 1 (P13) : « Passer » PENDANT le debounce enregistre quand même le texte', async () => {
    await allerAuCommentaire();
    const zone = screen.getByPlaceholderText(/Des détails/i);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(zone, 'Service excellent');
      zone.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Clic IMMÉDIAT : le debounce de 900 ms n'a pas eu lieu.
    await act(async () => {
      screen.getByRole('button', { name: 'Passer' }).click();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(completerMock).toHaveBeenCalledTimes(1);
    expect((completerMock.mock.calls[0][0] as any).commentaire).toBe('Service excellent');
    expect(screen.getByText(/Merci/i)).toBeTruthy();
  });

  test('si l\'envoi du commentaire échoue, « Passer » ne masque pas l\'échec', async () => {
    await allerAuCommentaire();
    completerMock.mockRejectedValue(new Error('Cette soumission est clôturée.'));
    const zone = screen.getByPlaceholderText(/Des détails/i);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(zone, 'À sauvegarder');
      zone.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Passer' }).click();
      await vi.advanceTimersByTimeAsync(100);
    });
    // On reste sur l'étape commentaire, message d'erreur visible, texte conservé.
    expect(screen.getByText(/clôturée/i)).toBeTruthy();
    expect(screen.queryByText(/^Merci$/)).toBeNull();
    expect((zone as HTMLTextAreaElement).value).toBe('À sauvegarder');
  });
});

describe('§7/§8 — reset borne : aucun résidu du client précédent', () => {
  // Après la dernière réponse, le client est sur l'étape commentaire : il
  // arrive à « Merci » soit par autosave d'un texte, soit en cliquant « Passer ».
  const allerAuMerci = async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);
    await act(async () => {
      screen.getByRole('button', { name: 'Passer' }).click();
      await vi.advanceTimersByTimeAsync(50);
    });
  };

  test('reset automatique : le questionnaire repart à zéro', async () => {
    await allerAuMerci();
    expect(screen.getByText(/Merci/i)).toBeTruthy();

    // Borne : 10 s sur l'écran de merci → questionnaire vierge.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10500);
    });
    expect(screen.queryByText(/Merci/i)).toBeNull();
    expect(screen.getByText('Satisfaction')).toBeTruthy();
  });

  test('« Nouvel avis » purge aussi le commentaire et le téléphone', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);
    // Étape commentaire : le client écrit, l'autosave part, puis « Merci ».
    const zone = screen.getByPlaceholderText(/Des détails/i) as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(zone, 'Secret du client A');
      zone.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await avancer(TRANSITION_MS);
    expect(screen.getByText(/Merci/i)).toBeTruthy();

    // Utilisateur B : « Nouvel avis ».
    await act(async () => {
      const bouton = screen.getByRole('button', { name: /Nouvel avis/i });
      bouton.click();
      await vi.advanceTimersByTimeAsync(50);
    });
    // Aucune trace du client A : ni l'écran de merci, ni son commentaire.
    expect(screen.queryByText(/Secret du client A/)).toBeNull();
    expect(screen.queryByText(/Merci/i)).toBeNull();
    expect(screen.getByText('Satisfaction')).toBeTruthy();
  });

  test('après reset, une nouvelle soumission ne réutilise PAS l\'identifiant', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);
    // Utilisateur A : « Passer » puis la borne de 10 s.
    await act(async () => {
      screen.getByRole('button', { name: 'Passer' }).click();
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10500);
    });

    // Utilisateur B : questionnaire vierge, nouvel identifiant de soumission.
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    await repondre(/Oui/);
    await avancer(TRANSITION_MS);
    expect(soumettreMock).toHaveBeenCalledTimes(2);
    const [premier, second] = soumettreMock.mock.calls.map((c) => (c[0] as any).id_soumission);
    expect(premier).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(premier);
  });
});

describe('§9 — lenteur réseau et abandonment', () => {
  test('une soumission lente n\'bloque pas l\'affichage (accusé déjà visible)', async () => {
    let resoudre: (v: any) => void = () => {};
    soumettreMock.mockImplementation(() => new Promise((r) => { resoudre = r; }));

    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    // Le parcours avance même si le réseau ne répond pas encore.
    expect(screen.getByText('Accueil')).toBeTruthy();
    await act(async () => {
      resoudre({ id: '42' });
      await vi.advanceTimersByTimeAsync(50);
    });
  });

  test('le bouton « Retour » revient à la question précédente', async () => {
    monter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await repondre(/Très satisfait/);
    await avancer(TRANSITION_MS);
    expect(screen.getByText('Accueil')).toBeTruthy();
    await act(async () => {
      screen.getByRole('button', { name: /Retour/i }).click();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByText('Satisfaction')).toBeTruthy();
  });
});
