import type { NavigationItem } from "./NavBar";

// Barre de navigation principale Yéba
export const demoNavigationitems: NavigationItem[] = [
  { name: "Tableau de bord", to: "/dashboard" },
  { name: "Guichets & Kits", to: "/guichets" },
  { name: "Planning", to: "/planning" },
  { name: "Avis & CSAT", to: "/avis" },
  { name: "Formulaires & Critères", to: "/criteres" },
  { name: "Incidents & Kanban", to: "/alertes-taches" },
  {
    name: "Administration",
    to: "/criteres",
    children: [
      { name: "Formulaires & Critères", to: "/criteres" },
      { name: "Personnel & Rôles", to: "/admin/personnel", roles: ["DIRECTION", "CHEF_AGENCE"] },
      { name: "Réseau Agences", to: "/admin/agences", roles: ["DIRECTION"] },
      { name: "Archives", to: "/archives", roles: ["DIRECTION", "CHEF_AGENCE"] },
    ],
  },
] as const;