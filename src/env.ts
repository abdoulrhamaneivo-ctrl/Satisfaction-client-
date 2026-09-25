import { defineEnvValidationSchema } from "wasp/env";

import * as z from "zod";
import { authEnvSchema } from "./auth/env";
import { fileUploadEnvSchema } from "./file-upload/env";

// Wasp merges this schema with its built-in env var validations and uses it
// to validate `process.env` at server startup. Access the validated env vars
// with `import { env } from 'wasp/server'` instead of using `process.env` directly.
// https://wasp.sh/docs/project/env-vars#custom-env-var-validations
//
// C6a (J+7) : secret fort exigé (≥ 32 caractères, ex. `openssl rand -hex 32`).
// Wasp échoue au démarrage si la variable est absente ou trop courte —
// aucun fallback 'DEVJWTSECRET' ne doit subsister en aucun environnement.
const secretFort = (nom: string) =>
  z
    .string(`${nom} manquant — générez-le avec : openssl rand -hex 32`)
    .min(32, `${nom} doit faire au moins 32 caractères (openssl rand -hex 32)`);

// If you remove a feature (e.g. an analytics or payment provider), make sure
// to also remove its env schema import and `...schema.shape` below.
export const serverEnvValidationSchema = defineEnvValidationSchema(
  z.object({
    ...authEnvSchema.shape,
    ...fileUploadEnvSchema.shape,
    // C6a : JWT_SECRET exigé ici aussi (le défaut DEVJWTSECRET du socle Wasp
        // ne doit jamais servir) + clé DÉDIÉE au chiffrement des secrets TOTP
        // (séparation des usages : JWT = sessions, TOTP_ENCRYPTION_KEY = 2FA).
        // Rotation : *_PREVIOUS (optionnelles) = anciennes clés acceptées en
        // déchiffrement seul le temps du rechiffrement (voir
        // src/server/scripts/rotationCleTotp.ts).
        JWT_SECRET: secretFort('JWT_SECRET'),
        JWT_SECRET_PREVIOUS: z.string().min(32).optional(),
        TOTP_ENCRYPTION_KEY: secretFort('TOTP_ENCRYPTION_KEY'),
        TOTP_ENCRYPTION_KEY_PREVIOUS: z.string().min(32).optional(),
        // C1 (J+30) : Redis pour rate-limit partagé multi-instance.
            // Optionnel en dev (MemoryStore), obligatoire en prod (Railway/Render multi-instance).
            REDIS_URL: z.string().url('REDIS_URL doit être une URL Redis valide (ex. redis://user:pass@host:6379)').optional(),
            // C2 (J+30) : Sel anti-rejeu téléphone — OBLIGATOIRE ≥ 32 chars (openssl rand -hex 32).
            // Utilisé pour HMAC-SHA256 du téléphone E.164 dans VoteAntiRejeu.
            // Sans sel, hachage prévisible → ré-identification + contournement anti-rejeu.
            ANTI_REPLAY_SALT: secretFort('ANTI_REPLAY_SALT'),
            ANTI_REPLAY_SALT_PREVIOUS: z.string().min(32).optional(),
            // C5 (J+30) : Clé de signature JWT pour sessions (revocables).
            // OBLIGATOIRE ≥ 32 chars (openssl rand -hex 32). Séparation JWT_SECRET (auth) / SESSION_SECRET (sessions).
            SESSION_SECRET: secretFort('SESSION_SECRET'),
            SESSION_SECRET_PREVIOUS: z.string().min(32).optional(),
          }),
        );