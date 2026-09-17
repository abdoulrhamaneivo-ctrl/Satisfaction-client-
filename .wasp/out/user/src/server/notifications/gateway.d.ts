export declare function normaliserNumeroCI(numeroBrut: string): string;
/**
 * Envoie un SMS via Twilio, ou logge si les clés ne sont pas configurées.
 */
export declare function envoyerAlerteSMS(destinataire: string, message: string): Promise<void>;
/**
 * Envoie un message WhatsApp via Twilio Business API, avec bascule SMS si indisponible.
 */
export declare function envoyerAlerteWhatsApp(destinataire: string, message: string): Promise<void>;
