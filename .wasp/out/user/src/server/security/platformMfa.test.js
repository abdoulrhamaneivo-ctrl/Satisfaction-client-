import { expect, test } from 'vitest';
import { canActivateTotpSetup, canStartTotpSetup, hasEnrolledTotp } from './platformMfa';
test('requires both the active flag and encrypted secret', () => {
    expect(hasEnrolledTotp({ totp_actif: true, totp_secret: 'ciphertext' })).toBe(true);
    expect(hasEnrolledTotp({ totp_actif: false, totp_secret: 'ciphertext' })).toBe(false);
    expect(hasEnrolledTotp({ totp_actif: true, totp_secret: null })).toBe(false);
});
test('does not allow setup to replace an enrolled secret', () => {
    expect(canStartTotpSetup({ totp_actif: false, totp_secret: null })).toBe(true);
    expect(canStartTotpSetup({ totp_actif: false, totp_secret: 'pending' })).toBe(true);
    expect(canStartTotpSetup({ totp_actif: true, totp_secret: 'ciphertext' })).toBe(false);
});
test('only allows activation for a pending setup', () => {
    expect(canActivateTotpSetup({ totp_actif: false, totp_secret: 'ciphertext' })).toBe(true);
    expect(canActivateTotpSetup({ totp_actif: false, totp_secret: null })).toBe(false);
    expect(canActivateTotpSetup({ totp_actif: true, totp_secret: 'ciphertext' })).toBe(false);
});
