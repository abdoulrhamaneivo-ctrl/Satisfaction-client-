// C4 : seul le code public opaque est accepté. Tout identifiant numérique
// séquentiel (/q/42) ou de format invalide est rejeté (null → page 404
// uniforme, sans oracle existe/n'existe pas).
export type CollecteIdentifier = { kind: 'publicCode'; code: string };

// Alphabet QR public (sans 0/O/1/I) — 10 caractères, cf. genererCodePublic().
const CODE_PUBLIC_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

export function parseCollecteIdentifier(identifiant: string): CollecteIdentifier | null {
  const code = identifiant.trim().toUpperCase();
  if (!CODE_PUBLIC_PATTERN.test(code)) {
    return null;
  }
  return { kind: 'publicCode', code };
}
