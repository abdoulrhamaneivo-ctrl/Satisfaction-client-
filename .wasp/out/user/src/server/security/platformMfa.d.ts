export type TotpAccountState = {
    totp_actif: boolean;
    totp_secret: string | null;
};
export declare function hasEnrolledTotp(account: TotpAccountState): boolean;
export declare function canStartTotpSetup(account: TotpAccountState): boolean;
export declare function canActivateTotpSetup(account: TotpAccountState): boolean;
