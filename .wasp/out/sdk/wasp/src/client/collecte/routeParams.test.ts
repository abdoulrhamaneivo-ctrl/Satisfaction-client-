import { expect, test } from 'vitest';
import { parseCollecteIdentifier } from './routeParams';

test('accepts a safe numeric guichet id and preserves opaque public codes', () => {
  expect(parseCollecteIdentifier('42')).toEqual({ kind: 'guichetId', guichetId: 42 });
  expect(parseCollecteIdentifier('0012')).toEqual({ kind: 'guichetId', guichetId: 12 });
  expect(parseCollecteIdentifier('QRCODE-abc_9')).toEqual({ kind: 'publicCode', code: 'QRCODE-abc_9' });
});

test('rejects empty and unsafe numeric identifiers', () => {
  expect(parseCollecteIdentifier('')).toBeNull();
  expect(parseCollecteIdentifier('9007199254740992')).toBeNull();
  expect(parseCollecteIdentifier('4.2')).toEqual({ kind: 'publicCode', code: '4.2' });
});
