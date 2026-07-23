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

// Bug corrigé : la détection "clés configurées ?" ne vérifiait que la
// présence d'une valeur (`!TWILIO_SID`), pas si elle était réellement
// utilisable. Or `.env.server` (dev local) contient volontairement des
// valeurs placeholder littérales ("mock") pour ne pas avoir de vrais
// identifiants en clair dans le dépôt — une chaîne "mock" est "truthy" en
// JS, donc l'ancien code tentait un VRAI appel à l'API Twilio avec des
// identifiants bidons, qui échouait avec une erreur d'authentification
// bruyante dans les logs au lieu de basculer proprement en mode stub.
const PLACEHOLDERS = new Set(['mock', 'test', 'changeme', 'todo', 'xxx']);
const estConfigure = (valeur: string | undefined): valeur is string =>
  !!valeur && valeur.trim() !== '' && !PLACEHOLDERS.has(valeur.trim().toLowerCase());

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM;

// ============================================================================
// Bug corrigé (confirmé en logs de production) : Twilio a rejeté un envoi
// avec `"Invalid 'To' Phone Number: 010203XXXX"` (erreur 21211). Les numéros
// sont saisis/stockés au format local ivoirien (10 chiffres commençant par
// 0, ex. "0102030405"), mais Twilio exige le format international E.164
// ("+2250102030405"). Le numéro brut était envoyé tel quel à l'API — cette
// fonction le normalise juste avant l'envoi, quel que soit le format saisi
// par l'utilisateur (avec ou sans indicatif, avec ou sans espaces/tirets).
//
// Règle ivoirienne : depuis la refonte de numérotation de 2021, le numéro
// national fait 10 chiffres et ce premier "0" fait partie intégrante du
// numéro (il n'est PAS un simple préfixe de réseau à retirer à
// l'international, contrairement à la France par ex.) : "0102030405" devient
// "+2250102030405", jamais "+225102030405".
// ============================================================================
export function normaliserNumeroCI(numeroBrut: string): string {
  const nettoye = numeroBrut.trim().replace(/[\s.\-()]/g, '');

  if (nettoye.startsWith('+')) return nettoye; // déjà au format international
  if (nettoye.startsWith('00')) return '+' + nettoye.slice(2); // 00225... → +225...
  if (nettoye.startsWith('225') && nettoye.length === 13) return '+' + nettoye; // 225... sans le +
  if (/^0\d{9}$/.test(nettoye)) return '+225' + nettoye; // format local à 10 chiffres

  // Format non reconnu : on le renvoie tel quel plutôt que de deviner à
  // l'aveugle. Twilio le rejettera avec un message clair (erreur 21211) que
  // l'on logge déjà, ce qui reste plus sûr qu'une transformation hasardeuse.
  return nettoye;
}

/**
 * Envoie un SMS via Twilio, ou logge si les clés ne sont pas configurées.
 */
export async function envoyerAlerteSMS(destinataire: string, message: string): Promise<void> {
  const numero = normaliserNumeroCI(destinataire);

  if (!estConfigure(TWILIO_SID) || !estConfigure(TWILIO_TOKEN) || !estConfigure(TWILIO_FROM)) {
    console.log(`[NOTIFICATION-STUB] SMS → ${numero}: ${message}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: numero,
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
    console.log(`[SMS] Envoyé à ${numero}`);
  }
}

/**
 * Envoie un message WhatsApp via Twilio Business API, avec bascule SMS si indisponible.
 */
export async function envoyerAlerteWhatsApp(destinataire: string, message: string): Promise<void> {
  const numero = normaliserNumeroCI(destinataire);

  if (!estConfigure(TWILIO_SID) || !estConfigure(TWILIO_TOKEN) || !estConfigure(TWILIO_WA_FROM)) {
    console.log(`[NOTIFICATION-STUB] WhatsApp → ${numero}: ${message}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: `whatsapp:${numero}`,
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
    console.warn(`[WhatsApp] Échec, bascule SMS pour ${numero}`);
    await envoyerAlerteSMS(numero, message);
  } else {
    console.log(`[WhatsApp] Envoyé à ${numero}`);
  }
}
