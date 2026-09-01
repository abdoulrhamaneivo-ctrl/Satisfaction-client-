import React from 'react';
interface RequireAuthProps {
    children: React.ReactNode;
}
/**
 * Protège les pages de l'espace applicatif Yeba.
 * - Si l'utilisateur n'est pas connecté → redirige vers /login
 * - Si le compte a été suspendu/désactivé par la direction → déconnecte et
 *   redirige vers /login (au lieu de laisser un accès fantôme).
 * - Si le compte doit changer son mot de passe (mustChangePassword) →
 *   redirige vers /account, seule page accessible tant que ce n'est pas
 *   fait. Concerne uniquement le tout premier compte créé par le seed
 *   (mot de passe généré affiché en clair en console, donc directement
 *   utilisable — contrairement aux comptes invités qui doivent de toute
 *   façon passer par "mot de passe oublié" avant de pouvoir se connecter).
 * - Pendant le chargement → spinner discret
 * - Connecté et actif → affiche les enfants normalement
 */
export declare function RequireAuth({ children }: RequireAuthProps): React.JSX.Element;
export {};
//# sourceMappingURL=RequireAuth.d.ts.map