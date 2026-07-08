import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Fonctionnalités", to: "/#features" },
  { name: "Tarifs", to: routes.PricingPageRoute.to },
] as const;

// Espace applicatif (utilisateur connecté) : uniquement les pages réellement
// construites, dans l'ordre du parcours de gestion (dashboard -> terrain -> équipe).
export const demoNavigationitems: NavigationItem[] = [
  { name: "Tableau de bord", to: "/dashboard" },
  { name: "Guichets", to: "/guichets" },
  { name: "Planning", to: "/planning" },
  { name: "Personnel", to: "/admin/personnel" },
  { name: "Critères", to: "/criteres" },
  { name: "Avis clients", to: "/avis" },
  { name: "Alertes & Tâches", to: "/alertes-taches" },
] as const;
