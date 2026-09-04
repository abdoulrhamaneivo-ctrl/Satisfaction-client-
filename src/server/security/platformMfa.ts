export function hasEnrolledTotp(account: {
  totp_actif: boolean;
  totp_secret: string | null;
}): boolean {
  return account.totp_actif === true && typeof account.totp_secret === 'string' && account.totp_secret.length > 0;
}
