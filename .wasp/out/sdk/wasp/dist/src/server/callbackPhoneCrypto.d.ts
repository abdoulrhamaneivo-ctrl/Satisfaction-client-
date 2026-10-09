export type EncryptedCallbackPhone = {
    ciphertext: string;
    iv: string;
    tag: string;
};
export declare function chiffrerTelephoneRappel(telephoneE164: string): EncryptedCallbackPhone;
export declare function dechiffrerTelephoneRappel(contact: EncryptedCallbackPhone): string;
//# sourceMappingURL=callbackPhoneCrypto.d.ts.map