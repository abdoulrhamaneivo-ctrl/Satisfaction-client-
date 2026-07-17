import { page, route, type Spec } from "@wasp.sh/spec";

import { UsersDashboardPage } from "./dashboards/users/UsersDashboardPage" with { type: "ref" };

export const adminSpec: Spec = [
  route(
    "AdminRoute",
    "/admin",
    page(UsersDashboardPage, { authRequired: true }),
  ),
  route(
    "AdminUsersRoute",
    "/admin/users",
    page(UsersDashboardPage, { authRequired: true }),
  ),
];
