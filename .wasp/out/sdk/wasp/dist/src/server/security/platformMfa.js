export function hasEnrolledTotp(account) {
    return account.totp_actif === true && typeof account.totp_secret === 'string' && account.totp_secret.length > 0;
}
export function canStartTotpSetup(account) {
    return !hasEnrolledTotp(account);
}
export function canActivateTotpSetup(account) {
    return account.totp_actif === false && typeof account.totp_secret === 'string' && account.totp_secret.length > 0;
}
//# sourceMappingURL=platformMfa.js.map