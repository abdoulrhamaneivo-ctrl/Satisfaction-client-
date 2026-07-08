// src/server/notifications/gateway.ts
// ============================================================================
// Passerelle SMS / WhatsApp — stub prêt à brancher
// ============================================================================
// Si TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER sont définis
// dans les variables d'env, les SMS sont réellement envoyés via Twilio.
// Sinon, les appels sont loggués sans crash (mode développement / sans-opérateur).
//
// Pour activer WhatsApp, ajoutez TWILIO_WHATSAPP_FROM (ex: "whatsapp:+15005550006")
// ============================================================================

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM;

/**
 * Envoie un SMS via Twilio, ou logge si les clés ne sont pas configurées.
 */
export async function envoyerAlerteSMS(destinataire: string, message: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[NOTIFICATION-STUB] SMS → ${destinataire}: ${message}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: destinataire,
    From: TWILIO_FROM,
    Body: message,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[SMS] Erreur Twilio: ${err}`);
  } else {
    console.log(`[SMS] Envoyé à ${destinataire}`);
  }
}

/**
 * Envoie un message WhatsApp via Twilio Business API, avec bascule SMS si indisponible.
 */
export async function envoyerAlerteWhatsApp(destinataire: string, message: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WA_FROM) {
    console.log(`[NOTIFICATION-STUB] WhatsApp → ${destinataire}: ${message}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: `whatsapp:${destinataire}`,
    From: TWILIO_WA_FROM,
    Body: message,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    // Bascule automatique sur SMS si WhatsApp échoue
    console.warn(`[WhatsApp] Échec, bascule SMS pour ${destinataire}`);
    await envoyerAlerteSMS(destinataire, message);
  } else {
    console.log(`[WhatsApp] Envoyé à ${destinataire}`);
  }
}
