// src/client/__mocks__/waspClientAuth.ts
// Auth client mockée pour les tests de parcours : un utilisateur anonyme par
// défaut (le contexte réel n'existe pas hors application).
export const useAuth = () => ({ data: undefined, isLoading: false });
export const logout = async () => undefined;
