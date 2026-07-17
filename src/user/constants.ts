import { Settings, Shield, Wallet } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    name: "Paramètres du compte",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: "Tarifs (Admin)",
    to: routes.AdminTarifsRoute.to,
    icon: Wallet,
    isAuthRequired: false,
    isAdminOnly: true,
  },
  {
    name: "Tableau de bord Admin",
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
