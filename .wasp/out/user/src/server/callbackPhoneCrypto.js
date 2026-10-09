import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function getKey() {
    const value = process.env.CALLBACK_PHONE_ENCRYPTION_KEY?.trim() ?? '';
    if (!/^[\da-fA-F]{64}$/.test(value)) {
        throw new Error('CALLBACK_PHONE_ENCRYPTION_KEY must be a 32-byte hexadecimal key.');
    }
    return Buffer.from(value, 'hex');
}
export function chiffrerTelephoneRappel(telephoneE164) {
    if (!/^\+[1-9]\d{7,14}$/.test(telephoneE164)) {
        throw new Error('Callback phone must be normalized to E.164 before encryption.');
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(telephoneE164, 'utf8'), cipher.final()]);
    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
    };
}
export function dechiffrerTelephoneRappel(contact) {
    const iv = Buffer.from(contact.iv, 'base64');
    const tag = Buffer.from(contact.tag, 'base64');
    const ciphertext = Buffer.from(contact.ciphertext, 'base64');
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length > 32) {
        throw new Error('Stored callback phone is malformed.');
    }
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    if (!/^\+[1-9]\d{7,14}$/.test(plaintext)) {
        throw new Error('Stored callback phone is invalid.');
    }
    return plaintext;
}
