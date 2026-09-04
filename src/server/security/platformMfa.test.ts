import { expect, test } from 'vitest';
import { hasEnrolledTotp } from './platformMfa';

test('requires both the active flag and encrypted secret', () => {
  expect(hasEnrolledTotp({ totp_actif: true, totp_secret: 'ciphertext' })).toBe(true);
  expect(hasEnrolledTotp({ totp_actif: false, totp_secret: 'ciphertext' })).toBe(false);
  expect(hasEnrolledTotp({ totp_actif: true, totp_secret: null })).toBe(false);
});
