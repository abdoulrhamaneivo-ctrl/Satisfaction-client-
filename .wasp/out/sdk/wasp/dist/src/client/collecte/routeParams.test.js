import { expect, test } from 'vitest';
import { parseCollecteIdentifier } from './routeParams';
test('accepts only opaque public codes (10 chars, no 0/O/1/I)', () => {
    expect(parseCollecteIdentifier('ABCDEFGHJK')).toEqual({ kind: 'publicCode', code: 'ABCDEFGHJK' });
    expect(parseCollecteIdentifier('BXYUUEHM9Y')).toEqual({ kind: 'publicCode', code: 'BXYUUEHM9Y' });
});
test('rejects numeric ids, empty, wrong format, wrong length', () => {
    expect(parseCollecteIdentifier('')).toBeNull();
    expect(parseCollecteIdentifier('42')).toBeNull();
    expect(parseCollecteIdentifier('0012')).toBeNull();
    expect(parseCollecteIdentifier('4.2')).toBeNull();
    expect(parseCollecteIdentifier('ABCDEFGHJ')).toBeNull(); // 9 chars
    expect(parseCollecteIdentifier('ABCDEFGHJKL')).toBeNull(); // 11 chars
    expect(parseCollecteIdentifier('ABCDEFGHJ0')).toBeNull(); // contains 0
    expect(parseCollecteIdentifier('ABCDEFGHJO')).toBeNull(); // contains O
    expect(parseCollecteIdentifier('ABCDEFGHJ1')).toBeNull(); // contains 1
    expect(parseCollecteIdentifier('ABCDEFGHJI')).toBeNull(); // contains I
});
//# sourceMappingURL=routeParams.test.js.map