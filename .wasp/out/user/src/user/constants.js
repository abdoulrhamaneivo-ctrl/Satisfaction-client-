import { Settings } from "lucide-react";
import { routes } from "wasp/client/router";
// AUDIT P2 : l'entrée « Tableau de bord Admin » (route /admin du template
// Wasp, basée sur isAdmin) a été retirée — l'administration Yéba est dans la
// console /platform protégée par platformRole.
export const userMenuItems = [
    {
        name: "Paramètres du compte",
        to: routes.AccountRoute.to,
        icon: Settings,
        isAuthRequired: false,
        isAdminOnly: false,
    },
];
