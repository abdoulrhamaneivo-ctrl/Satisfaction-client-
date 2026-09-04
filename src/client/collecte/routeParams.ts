type CollecteIdentifier =
  | { kind: 'guichetId'; guichetId: number }
  | { kind: 'publicCode'; code: string };

const decimalIntegerPattern = /^\d+$/;

export function parseCollecteIdentifier(identifiant: string): CollecteIdentifier | null {
  if (identifiant === '') {
    return null;
  }

  if (!decimalIntegerPattern.test(identifiant)) {
    return { kind: 'publicCode', code: identifiant };
  }

  const guichetId = Number.parseInt(identifiant, 10);
  if (guichetId <= 0 || !Number.isSafeInteger(guichetId)) {
    return null;
  }

  return { kind: 'guichetId', guichetId };
}
