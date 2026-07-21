import type { NavigationItem } from "./NavBar";

// Barre de navigation de l'application (utilisateur connecté) : uniquement les pages réellement
// construites, dans l'ordre du parcours de gestion (dashboard -> terrain -> équipe).
// `roles` : si présent, l'item n'est affiché que pour ces rôles Yeba. Sans
// cette liste, l'item était affiché à tout le monde (y compris CHEF_AGENCE),
// qui cliquait sur "Agences" pour tomber sur un écran "Accès refusé" — la
// page GestionAgencesPage est en effet réservée à DIRECTION.
export const demoNavigationitems: NavigationItem[] = [
  { name: "Tableau de bord", to: "/dashboard" },
  { name: "Guichets", to: "/guichets" },
  { name: "Planning", to: "/planning" },
  { name: "Agences", to: "/admin/agences", roles: ["DIRECTION"] },
  { name: "Avis clients", to: "/avis" },
  { name: "Alertes & Tâches", to: "/alertes-taches" },
  // Regroupement : toutes les pages de configuration/administration sous un
  // seul menu "Paramètres" au lieu d'être éparpillées à plat dans la barre
  // de navigation (c'était illisible, surtout sur mobile, et noyait la
  // Charte Graphique — que l'utilisateur veut retrouver dans un espace
  // "paramètres" dédié — au milieu des pages de travail quotidien).
  {
    name: "Administration",
    to: "/criteres",
    children: [
      { name: "Critères", to: "/criteres" },
      { name: "Personnel", to: "/admin/personnel", roles: ["DIRECTION", "CHEF_AGENCE"] },
      { name: "Archives", to: "/archives", roles: ["DIRECTION", "QUALITE", "CHEF_AGENCE"] },
      // NOTE : "Tarifs" (/admin/tarifs) n'a volontairement PAS été ajouté
      // ici. Correctif d'une erreur que j'avais moi-même introduite : cette
      // page est protégée par `user?.isAdmin` (indicateur réservé aux
      // administrateurs de la plateforme Yeba elle-même), pas par le rôle
      // métier DIRECTION. Un client DIRECTION qui aurait cliqué dessus
      // serait tombé sur un écran "Accès réservé" — exactement le type de
      // bug que ce fichier corrige déjà ailleurs (voir le commentaire sur
      // "Agences" plus haut). Si un accès admin-plateforme est nécessaire
      // depuis l'app, il doit être exposé séparément (ex. dans le tableau
      // de bord admin Wasp, réservé aux comptes isAdmin), pas ici.
    ],
  },
] as const;