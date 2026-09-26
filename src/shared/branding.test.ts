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
import {
  BRANDING,
  fondWhiteLabelRecevable,
  varianteTextePourFond,
  ratioContrasteHsl,
  foregroundPourAplat,
} from './branding';

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

  test('le blanc sur aplat de marque est CONFORME (écart 1.4.3 levé)', () => {
    // Historique : le blanc sur le vert vif #00A851 plafonnait à 3,11:1, sous
    // le seuil de 4,5:1. Le primaire a été aligné sur le vert que le
    // Doc 04 §2.1 désigne pour les boutons pleins (#00843D) : le blanc
    // passe à 4,77:1. Ce test verrouille l'alignement — revenir au vert
    // vif ferait échouer la suite, au lieu de casser silencieusement 76
    // boutons et les badges pleins.
    const r = ratio(BRANDING.color_primary_foreground, BRANDING.color_primary);
    expect(r, `blanc sur aplat de marque : ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  test('le vert de marque en TEXTE sur crème reste sous le seuil — d’où les variantes -strong', () => {
    // C'est exactement pour cela que les quatre variantes `-strong`
    // existent : le même vert, en aplat, est conforme ; utilisé comme
    // texte sur le fond crème, il plafonne à 4,41:1. Si un jour le
    // primaire remontait assez haut pour passer 4,5:1 sur crème, les
    // variantes `-strong` deviendraient inutiles — ce test le signalerait.
    const r = ratio(BRANDING.color_primary, FOND_PAGE);
    expect(r, `vert de marque en texte sur crème : ${r.toFixed(2)}:1`).toBeLessThan(4.5);
    expect(
      ratio(BRANDING.color_primary_strong, FOND_PAGE),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('le secondaire reste plus sombre que le primaire et lisible sous texte blanc', () => {
    // Les deux jetons servaient de niveaux de hiérarchie distincts
    // (17 aplats + graphiques). Aligner le primaire sur #00843D aurait
    // rendu secondary identique au primaire si on ne l'avait pas
    // assombri : les deux rôles se confondraient.
    expect(BRANDING.color_secondary).not.toBe(BRANDING.color_primary);
    expect(ratio(BRANDING.color_secondary_foreground, BRANDING.color_secondary))
      .toBeGreaterThanOrEqual(4.5);
  });
});

/* ============================================================================
 * Vague 4 — garde-fous white-label
 * ============================================================================
 * Un tenant peut surcharger `color_primary` / `color_background`. Ces
 * tests prouvent que la personnalisation ne peut pas contourner la règle
 * de contraste : sans eux, la feuille de style servait au guichet pouvait
 * être illisible alors que tous les tests de contraste passaient — ils
 * ne portent que sur BRANDING, pas sur la valeur réellement injectée.
 */
describe('White-label — le contraste ne peut pas être contourné', () => {
  test('un fond clair conforme est accepté', () => {
    expect(fondWhiteLabelRecevable('40 30% 96%', BRANDING.color_foreground)).toBe(true);
    expect(fondWhiteLabelRecevable('0 0% 100%', BRANDING.color_foreground)).toBe(true);
  });

  test('un fond sombre est refusé (la palette mode clair s’y effondre)', () => {
    // 216 40% 12% : le texte par défaut y devient invisible.
    expect(fondWhiteLabelRecevable('216 40% 12%', BRANDING.color_foreground)).toBe(false);
    // 0 0% 0% : noir pur, même cas.
    expect(fondWhiteLabelRecevable('0 0% 0%', BRANDING.color_foreground)).toBe(false);
  });

  test('un fond qui avale le texte est refusé', () => {
    // Gris moyen : luminance proche de celle du texte par défaut.
    expect(fondWhiteLabelRecevable('0 0% 30%', BRANDING.color_foreground)).toBe(false);
  });

  test('une valeur absente ou malformée est refusée', () => {
    expect(fondWhiteLabelRecevable(null, BRANDING.color_foreground)).toBe(false);
    expect(fondWhiteLabelRecevable(undefined, BRANDING.color_foreground)).toBe(false);
    expect(fondWhiteLabelRecevable('', BRANDING.color_foreground)).toBe(false);
    expect(fondWhiteLabelRecevable('red', BRANDING.color_foreground)).toBe(false);
    // Un fond en hexadécimal n'est pas un jeton HSL : il doit être rejeté
    // explicitement, sinon `parseFloat('00A851')` produirait un jeton
    // aberrant — un tenant qui saisit un code couleur verrait sa
    // personnalisation acceptée puis appliquée de travers.
    expect(fondWhiteLabelRecevable('#00A851', BRANDING.color_foreground)).toBe(false);
    expect(fondWhiteLabelRecevable('00A851', BRANDING.color_foreground)).toBe(false);
    // Trois composants, c'est bien un jeton — mais trop sombre pour porter
    // le texte par défaut.
    expect(fondWhiteLabelRecevable('149 100% 33%', BRANDING.color_foreground)).toBe(false);
  });

  test('la variante texte d’un primaire personnalisé atteint 4,5:1', () => {
    const fond = '0 0% 100%';
    // Un jaune très clair, impossible à utiliser en texte.
    const primaire = '45 100% 60%';
    expect(ratioContrasteHsl(primaire, fond)).toBeLessThan(4.5);
    const variante = varianteTextePourFond(primaire, fond);
    expect(ratioContrasteHsl(variante, fond)).toBeGreaterThanOrEqual(4.5);
    // La teinte du client est conservée : seule la clarté change.
    expect(variante.split(' ')[0]).toBe(primaire.split(' ')[0]);
    expect(variante.split(' ')[1]).toBe(primaire.split(' ')[1]);
  });

  test('l’anneau de focus d’un primaire personnalisé atteint 3:1', () => {
    const fond = '40 30% 96%';
    const variante = varianteTextePourFond('149 100% 33%', fond, 3);
    expect(ratioContrasteHsl(variante, fond)).toBeGreaterThanOrEqual(3);
  });

  test('le libellé posé sur un aplat pâle bascule au noir, sans toucher à la teinte', () => {
    // Le blanc ne passe pas sur un jaune pâle. Assombrir l'aplat
    // détruirait l'identité du client : c'est donc le texte qui s'adapte.
    const primairePale = '45 100% 70%';
    expect(ratioContrasteHsl('0 0% 100%', primairePale)).toBeLessThan(4.5);
    const fg = foregroundPourAplat(primairePale);
    expect(fg).not.toBe('0 0% 100%');
    expect(ratioContrasteHsl(fg, primairePale)).toBeGreaterThanOrEqual(4.5);
    // Un aplat sombre conserve le blanc : au quotidien, rien ne change.
    expect(foregroundPourAplat(BRANDING.color_primary)).toBe('0 0% 100%');
  });
});
