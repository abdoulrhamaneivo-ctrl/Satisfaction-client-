import React from 'react';
interface RequireEnterpriseRoleProps {
    children: React.ReactNode;
}
/**
 * GARDE DE PÉRIMÈTRE (Doc 12) : les pages de l'espace ENTREPRISE (dashboard,
 * avis, critères, guichets, planning, alertes, archives, admin) sont réservées
 * aux comptes avec un rôle métier (DIRECTION, CHEF_AGENCE, QUALITE, AGENT).
 * Les comptes PLATEFORME (SUPER_ADMIN, SUPPORT, role=null) n'ont AUCUN
 * périmètre entreprise : ils sont redirigés vers /platform, leur seul espace.
 * Double protection : le serveur refuse aussi (assertEntrepriseActive +
 * requireRole renvoient 403), mais le front doit guider l'utilisateur au
 * bon endroit au lieu d'afficher des écrans vides ou erreurs.
 */
export declare function RequireEnterpriseRole({ children }: RequireEnterpriseRoleProps): React.JSX.Element;
export {};
//# sourceMappingURL=RequireEnterpriseRole.d.ts.map