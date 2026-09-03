/**
 * Redirige un utilisateur déjà connecté qui atterrit sur la page de
 * connexion vers le tableau de bord (tout compte est déjà rattaché à une
 * agence dès sa création, il n'y a pas d'onboarding à traverser).
 *
 * Remplace l'ancien comportement qui renvoyait systématiquement vers
 * "/demo-app" (page de démonstration IA du template Open SaaS, sans lien
 * avec la plateforme Yeba).
 */
export declare function useRedirectIfLoggedIn(): void;
//# sourceMappingURL=useRedirectIfLoggedIn.d.ts.map