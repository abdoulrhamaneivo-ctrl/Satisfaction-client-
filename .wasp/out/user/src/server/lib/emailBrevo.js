// src/server/lib/emailBrevo.ts
// ============================================================================
// Envoi d'e-mails via l'API HTTP Brevo (port 443) — PAS via SMTP.
//
// Pourquoi pas le provider SMTP Wasp ? Le TCP sortant vers
// smtp-relay.brevo.com:587 expire depuis Render (Connection timeout
// nodemailer prouvé en logs prod, 3/3 tentatives), et le transporteur Wasp
// est créé SANS aucun timeout : chaque envoi pendait des minutes pendant que
// le client abandonnait à 10 s (« Request timed out ») et que l'e-mail
// n'arrivait jamais. L'API HTTPS ne subit aucun de ces blocages.
//
// Règles :
// - Timeout borné à 8 s (sous les 10 s du client ky) via AbortSignal.
// - Erreurs traduites en messages FR actionnables (HttpError avec statut).
// - Aucune donnée personnelle dans les logs (empreinte SHA-256 tronquée).
// - Requiert BREVO_API_KEY (clé API xkeysib-..., PAS la clé SMTP) et un
//   expéditeur vérifié dans Brevo (voir expediteurBrevo ci-dessous).
// ============================================================================
import crypto from 'node:crypto';
import { HttpError } from 'wasp/server';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
// Sous le timeout client (10 s) : un envoi sync doit répondre vite ou
// échouer proprement pour que l'UI affiche une vraie erreur.
const TIMEOUT_MS = 8000;
const empreinte = (valeur) => crypto.createHash('sha256').update(valeur).digest('hex').slice(0, 8);
export function expediteurBrevo() {
    // DOIT être un expéditeur vérifié dans Brevo (menu Expéditeurs),
    // identique au defaultFrom historique pour la cohérence des réponses.
    return { name: 'Yeba', email: 'abdoulrhamane.ivo@gmail.com' };
}
export async function envoyerEmailBrevo({ to, subject, text, html }) {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) {
        throw new HttpError(503, "Envoi d'e-mail indisponible : clé API Brevo (BREVO_API_KEY) non configurée. Prévenez votre administrateur.");
    }
    const destinataire = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinataire)) {
        throw new HttpError(400, 'Adresse e-mail destinataire invalide.');
    }
    let res;
    try {
        res = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                sender: expediteurBrevo(),
                to: [{ email: destinataire }],
                subject,
                textContent: text,
                htmlContent: html,
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    }
    catch (err) {
        if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
            console.error(`event=email_brevo_timeout to=${empreinte(destinataire)}`);
            throw new HttpError(504, "Le service d'e-mail met trop longtemps à répondre. Réessayez dans un instant.");
        }
        console.error(`event=email_brevo_reseau to=${empreinte(destinataire)} erreur=${String(err?.message ?? err).slice(0, 120)}`);
        throw new HttpError(502, "Envoi d'e-mail impossible pour le moment (réseau). Réessayez dans un instant.");
    }
    if (!res.ok) {
        const corps = await res.text().catch(() => '');
        console.error(`event=email_brevo_rejet status=${res.status} to=${empreinte(destinataire)} corps=${corps.slice(0, 200)}`);
        if (res.status === 401 || res.status === 403) {
            throw new HttpError(503, "Envoi d'e-mail indisponible : clé API Brevo invalide ou expéditeur non vérifié. Prévenez votre administrateur.");
        }
        if (res.status === 400) {
            throw new HttpError(502, "L'e-mail a été refusé par le service d'envoi. Vérifiez l'adresse du destinataire.");
        }
        if (res.status === 429) {
            throw new HttpError(429, "Trop d'e-mails envoyés d'un coup (quota Brevo). Réessayez dans quelques minutes.");
        }
        throw new HttpError(502, "L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.");
    }
    console.log(`event=email_brevo_envoye to=${empreinte(destinataire)} sujet=${subject.slice(0, 60)}`);
}
