// src/shared/branding.test.ts
// ============================================================================
// VAGUE 4 — Non-régression des contrastes de la charte.
//
// Ces tests ne remplacent PAS une mesure WCAG : ils verrouillent les
// VALEURS des tokens dont dépendent les ratios de contraste. Le calcul
// lui-même est documenté dans docs/accessibility/WCAG_22_AA_AUDIT.md
// (méthode, ratios obtenus, fonds testés).
//
// Raison d'être : le vert de marque est figé par
// docs/frontend/04-charte-graphique-poste-ci.md. Sans test, un « petit
// ajustement » de teinte lors d'une refonte du dashboard ferait repasser
// silencieusement des textes sous le seuil 4,5:1, et aucun test
// fonctionnel ne le détecterait.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { BRANDING } from './branding';

/** Convertit un token « H S% L% » en triplet RVB normalisé. */
const hslVersRgb = (token: string): [number, number, number] => {
  const [h, s, l] = token.split(' ').map((partie) => parseFloat(partie));
  const saturation = s / 100;
  const clarte = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = saturation * Math.min(clarte, 1 - clarte);
  const f = (n: number) =>
    clarte - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
};

/** Luminance relative WCAG. */
const luminance = (token: string): number => {
  const [r, v, b] = hslVersRgb(token).map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
};

/** Ratio de contraste WCAG 2.x entre deux tokens. */
const ratio = (a: string, b: string): number => {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire + 0.05) / (sombre + 0.05);
};

// Fonds réellement utilisés par l'interface (thème clair).
const FOND_PAGE = BRANDING.color_background;
const FOND_CARTE = BRANDING.color_card;

const VARIANTES_TEXTE = [
  ['color_primary_strong', 'texte principal'],
  ['color_success_strong', 'texte de succès'],
  ['color_warning_strong', "texte d'avertissement"],
  ['color_destructive_strong', "texte d'erreur"],
] as const;

describe('Charte — contrastes WCAG 2.2 AA (Vague 4)', () => {
  test('les tokens de texte atteignent 4,5:1 sur le fond de page', () => {
    for (const [cle, libelle] of VARIANTES_TEXTE) {
      const r = ratio(BRANDING[cle], FOND_PAGE);
      expect(r, `${libelle} (${cle}) sur fond de page : ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('les tokens de texte atteignent 4,5:1 sur une surface blanche', () => {
    for (const [cle, libelle] of VARIANTES_TEXTE) {
      const r = ratio(BRANDING[cle], FOND_CARTE);
      expect(r, `${libelle} (${cle}) sur carte blanche : ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("l'anneau de focus est visible sur les deux fonds (3:1 minimum)", () => {
    // 1.4.11 / 2.4.13 : l'indicateur de focus doit contraster avec le fond ET
    // avec le composant survolé. Le vert de marque à 40 % d'opacité ne
    // montait qu'à 1,58:1 sur la crème : anneau quasi invisible.
    for (const fond of [FOND_PAGE, FOND_CARTE]) {
      const r = ratio(BRANDING.color_ring, fond);
      expect(r, `anneau de focus sur ${fond} : ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  test("le texte de premier plan sur aplat de marque reste un écart DOCUMENTÉ", () => {
    // Le blanc sur le vert de marque d'origine plafonne à ~3,1:1 : sous 4,5:1
    // pour du texte normal. La Vague 4 ne change PAS la teinte (charte
    // figée par le Doc 04) : elle documente l'écart et ajoute les variantes
    // `-strong` pour les fonds clairs. Ce test empêche de « corriger » le
    // token en croyant résoudre l'écart sans le signaler, et garantit que
    // la variante foncée, elle, passe le seuil.
    const r = ratio(BRANDING.color_primary_foreground, BRANDING.color_primary);
    expect(r).toBeLessThan(4.5);
    expect(
      ratio(BRANDING.color_primary_foreground, BRANDING.color_primary_strong),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
