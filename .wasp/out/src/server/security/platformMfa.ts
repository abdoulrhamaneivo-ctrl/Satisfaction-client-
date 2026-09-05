export type TotpAccountState = {
  totp_actif: boolean;
  totp_secret: string | null;
};

export function hasEnrolledTotp(account: TotpAccountState): boolean {
  return account.totp_actif === true && typeof account.totp_secret === 'string' && account.totp_secret.length > 0;
}

export function canStartTotpSetup(account: TotpAccountState): boolean {
  return !hasEnrolledTotp(account);
}

export function canActivateTotpSetup(account: TotpAccountState): boolean {
  return account.totp_actif === false && typeof account.totp_secret === 'string' && account.totp_secret.length > 0;
}
