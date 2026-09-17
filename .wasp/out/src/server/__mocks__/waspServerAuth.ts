// Mock du module 'wasp/server/auth' pour les tests unitaires.
// Les chemins testés ici (gardes d'isolation) n'appellent jamais ces
// fonctions : des stubs suffisent à satisfaire la résolution des imports.
import { vi } from 'vitest';

export const createProviderId = vi.fn((...args: any[]) => args.join('-'));
export const createUser = vi.fn();
export const sanitizeAndSerializeProviderData = vi.fn();
export const findAuthIdentity = vi.fn();
export const updateAuthIdentityProviderData = vi.fn();
export const getProviderDataWithPassword = vi.fn();
