import type { z } from 'zod';
/** Extrait un objet JS d'un contenu chat (accepte fences ```json). */
export declare function extraireObjetJson(nom: string, content: string | null | undefined): unknown;
/** Valide l'objet contre un schéma Zod (erreur lisible, extrait inclus). */
export declare function validerReponseJson<T>(nom: string, schema: z.ZodType<T>, brut: unknown): T;
