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
  { name: "Avis clients", to: "/avis" },
  { name: "Alertes & Tâches", to: "/alertes-taches" },
  // Regroupement : toutes les pages de configuration/administration sous un
  // seul menu "Paramètres" au lieu d'être éparpillées à plat dans la barre
  // de navigation (c'était illisible, surtout sur mobile, et noyait la
  // Charte Graphique — que l'utilisateur veut retrouver dans un espace
  // "paramètres" dédié — au milieu des pages de travail quotidien).
  {
    name: "Paramètres",
    to: "/admin/marque",
    children: [
      // Correctif : la charte graphique s'applique à TOUTE l'entreprise (une
      // seule config par id_entreprise, visible par toutes les agences), donc
      // seuls les rôles à portée entreprise peuvent la modifier — voir
      // upsertBrandConfig dans actions.ts. Un CHEF_AGENCE ne doit pas voir ce
      // lien, sinon il atterrit sur un écran qu'il n'a plus le droit d'utiliser.
      { name: "Charte graphique", to: "/admin/marque", roles: ["DIRECTION", "QUALITE"] },
      { name: "Critères", to: "/criteres" },
      { name: "Personnel", to: "/admin/personnel" },
      // NOTE : "Tarifs" (/admin/tarifs) n'a volontairement PAS été ajouté
      // ici. Correctif d'une erreur que j'avais moi-même introduite : cette
      // page est protégée par `user?.isAdmin` (indicateur réservé aux
      // administrateurs de la plateforme CXSAT elle-même), pas par le rôle
      // métier DIRECTION. Un client DIRECTION qui aurait cliqué dessus
      // serait tombé sur un écran "Accès réservé" — exactement le type de
      // bug que ce fichier corrige déjà ailleurs (voir le commentaire sur
      // "Agences" plus haut). Si un accès admin-plateforme est nécessaire
      // depuis l'app, il doit être exposé séparément (ex. dans le tableau
      // de bord admin Wasp, réservé aux comptes isAdmin), pas ici.
    ],
  },
] as const;
