import { action, page, route, type Spec } from "@wasp.sh/spec";

import { AccountPage } from "./AccountPage" with { type: "ref" };
import {
  updateProfile,
  changePassword,
  changeEmail,
} from "./accountsActions" with { type: "ref" };

// AUDIT P2 (double système isAdmin vs platformRole) : les opérations
// getPaginatedUsers / updateIsUserAdminById du template Wasp ont été
// SUPPRIMÉES — elles se basaient sur User.isAdmin, un privilège parallèle au
// platformRole. Administration Yéba = platformRole uniquement (SUPER_ADMIN /
// SUPPORT) via actionsPlatform.ts. Aucun autre chemin ne doit jamais créer
// d'administrateur.
export const userSpec: Spec = [
  route("AccountRoute", "/account", page(AccountPage, { authRequired: true })),
  action(updateProfile, { entities: ["User"] }),
  action(changePassword, { entities: ["User"] }),
  action(changeEmail, { entities: ["User"] }),
];