// src/server/validation.ts
// ============================================================================
// Validation & sanitisation centralisée (C2, C3).
// Point d'entrée UNIQUE pour toutes les entrées externes.
// ============================================================================

import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';
import crypto from 'node:crypto';

/** Normalise un téléphone vers E.164 CI (+225XXXXXXXXXX). Lève si invalide. */
export function normaliserTelephoneE164(tel: string): string {
  const brut = tel.trim();
  if (!brut) throw new Error('Téléphone vide');
  const parsed = parsePhoneNumberFromString(brut, 'CI');
  if (!parsed || !isValidPhoneNumber(parsed.number, 'CI')) {
    throw new Error('Numéro invalide pour la Côte d\'Ivoire');
  }
  return parsed.format('E.164'); // ex. +2250700000000
}

/** Valide et normalise un commentaire : texte brut, max 1000 car., sans HTML/JS. */
export function sanitiserCommentaire(txt: string): string {
  const brut = txt.trim();
  if (!brut) return '';
  if (brut.length > 1000) throw new Error('Commentaire trop long (max 1000 caractères)');
  // Strip tags & scripts basique (défense en profondeur, le front n'envoie que du texte)
  return brut
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // strip control chars
}

/** Échappe une cellule CSV (RFC 4180) : guillemets doublés, préfixe ' pour formules. */
export function escapeCSVCell(val: string): string {
  let s = String(val ?? '');
  // Neutraliser = + - @ \t | au début (formule Excel)
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  // Doubler les guillemets
  s = s.replace(/"/g, '""');
  // Encadrer si contient ; " \n
  if (/[;",\n]/.test(s)) s = `"${s}"`;
  return s;
}

/** Calcule HMAC-SHA256(sel, données). Sel = ANTI_REPLAY_SALT (32 octets min). */
export function hmacSHA256(sel: string, data: string): string {
  return crypto.createHmac('sha256', sel).update(data).digest('hex');
}

/** Vérifie la force d'un secret d'environnement (min 32 chars hex). */
export function validerSecretEnv(nom: string, val: string | undefined): string {
  if (!val) throw new Error(`[C2/C6a] ${nom} manquant — définir avec openssl rand -hex 32`);
  if (val.length < 32) throw new Error(`[C2/C6a] ${nom} trop court (${val.length} < 32) — openssl rand -hex 32`);
  return val;
}