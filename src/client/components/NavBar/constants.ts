import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Fonctionnalités", to: "/#features" },
  { name: "Tarifs", to: routes.PricingPageRoute.to },
] as const;

// Espace applicatif (utilisateur connecté) : uniquement les pages réellement
// construites, dans l'ordre du parcours de gestion (dashboard -> terrain -> équipe).
// `roles` : si présent, l'item n'est affiché que pour ces rôles CXSAT. Sans
// cette liste, l'item était affiché à tout le monde (y compris CHEF_AGENCE),
// qui cliquait sur "Agences" pour tomber sur un écran "Accès refusé" — la
// page GestionAgencesPage est en effet réservée à DIRECTION.
export const demoNavigationitems: NavigationItem[] = [
  { name: "Tableau de bord", to: "/dashboard" },
  { name: "Guichets", to: "/guichets" },
  { name: "Planning", to: "/planning" },
  { name: "Agences", to: "/admin/agences", roles: ["DIRECTION"] },
  { name: "Personnel", to: "/admin/personnel" },
  { name: "Critères", to: "/criteres" },
  { name: "Avis clients", to: "/avis" },
  { name: "Alertes & Tâches", to: "/alertes-taches" },
] as const;
