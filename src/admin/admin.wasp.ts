import { type Spec } from "@wasp.sh/spec";

// AUDIT P2 (double système isAdmin vs platformRole) : le dashboard admin du
// template Wasp (/admin, /admin/users) utilisait getPaginatedUsers et
// updateIsUserAdminById — opérations basées sur User.isAdmin, un privilège
// parallèle au platformRole. Il a été RETIRÉ : l'administration Yéba est
// concentrée dans la console /platform (platformRole SUPER_ADMIN/SUPPORT).
// Si un jour une liste d'utilisateurs plateforme est nécessaire, la
// reconstruire depuis queriesPlatform.ts avec requirePlatformRole.
export const adminSpec: Spec = [];
