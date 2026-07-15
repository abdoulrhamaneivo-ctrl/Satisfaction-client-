import { action, app, page, query, route, job } from "@wasp.sh/spec";

import { App } from "./src/client/App" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };
import { LandingPage } from "./src/landing-page/LandingPage" with { type: "ref" };
import { seedMockUsers } from "./src/server/scripts/dbSeeds" with { type: "ref" };

// === IMPORTS POUR L'ONBOARDING ET GUICHETS CXSAT ===
import { OnboardingPage } from "./src/client/pages/OnboardingPage" with { type: "ref" };
import { GuichetsPage } from "./src/client/pages/GuichetsPage" with { type: "ref" };
import { PlanningPage } from "./src/client/pages/PlanningPage" with { type: "ref" };
import { CollectePage } from "./src/client/pages/CollectePage" with { type: "ref" };
import { DashboardPage } from "./src/client/pages/DashboardPage" with { type: "ref" };
import { AdminPersonnelPage } from "./src/client/pages/AdminPersonnelPage" with { type: "ref" };
import { GestionAgencesPage } from "./src/client/pages/GestionAgencesPage" with { type: "ref" };
import { AvisPage } from "./src/client/pages/AvisPage" with { type: "ref" };
import { ConfigurationCriteresPage } from "./src/client/pages/ConfigurationCriteresPage" with { type: "ref" };
import { AdminTarifsPage } from "./src/client/pages/AdminTarifsPage" with { type: "ref" };
import { AlertesTachesPage } from "./src/client/pages/AlertesTachesPage" with { type: "ref" };

// === ACTIONS ===
import {
  completeOnboarding,
  createGuichet,
  assignAgent,
  soumettreAvis,
  updateAgent,
  deleteAgent,
  reactivateAgent,
  promouvoirAgent,
  inviteAgent,
  createAgence,
  toggleCritereAgence,
  createCritere,
  createService,
  updatePlanPricing,
  upsertObjectif,
  createTacheCorrective,
  updateStatutTache,
  marquerAlerteTraitee,
  updateGuichetServices,
} from "./src/server/actions" with { type: "ref" };

// === IMPORTS JOBS CRON CXSAT ===
import { detecterAlertesSilence } from "./src/server/jobs/alerteSilence" with { type: "ref" };
import { relancerTachesEnRetard } from "./src/server/jobs/relanceTache" with { type: "ref" };
import { envoyerRapportsMensuels } from "./src/server/jobs/rapportMensuel" with { type: "ref" };

// === QUERIES ===
import {
  getGuichets,
  getAgents,
  getStatsFiltrees,
  getAgentsByAgence,
  getAgences,
  getReponses,
  getAlertes,
  getCriteres,
  getAgenceCriteres,
  getFormDefinitionForGuichet,
  getServices,
  getRadarStats,
  getPlanPricing,
  getObjectifs,
  getTachesCorrectives,
  getAffectationsDuJour,
  getTendanceMensuelle,
  getStatsByAgent,
  getStatsByGuichet,
  getActionsPrioritaires,
  getKPIsPeriode,
} from "./src/server/queries" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { analyticsSpec } from "./src/analytics/analytics.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { fileUploadSpec } from "./src/file-upload/file-upload.wasp";
import { paymentSpec } from "./src/payment/payment.wasp";
import { emailSender } from "./src/server/emailSender.wasp";
import { userSpec } from "./src/user/user.wasp";

// === ROUTES ===
const onboardingRoute = route("OnboardingRoute", "/onboarding", page(OnboardingPage));
const guichetsRoute = route("GuichetsRoute", "/guichets", page(GuichetsPage));
const planningRoute = route("PlanningRoute", "/planning", page(PlanningPage));
const dashboardRoute = route("DashboardRoute", "/dashboard", page(DashboardPage));
const adminPersonnelRoute = route("AdminPersonnelRoute", "/admin/personnel", page(AdminPersonnelPage));
const gestionAgencesRoute = route("GestionAgencesRoute", "/admin/agences", page(GestionAgencesPage));
const avisRoute = route("AvisRoute", "/avis", page(AvisPage));
const configurationCriteresRoute = route("ConfigurationCriteresRoute", "/criteres", page(ConfigurationCriteresPage));
const adminTarifsRoute = route("AdminTarifsRoute", "/admin/tarifs", page(AdminTarifsPage));
const collecteRoute = route("CollecteRoute", "/q/:guichetId", page(CollectePage));
const alertesTachesRoute = route("AlertesTachesRoute", "/alertes-taches", page(AlertesTachesPage));

// === ACTIONS ===
const completeOnboardingAction = action(completeOnboarding, {
  entities: ["User", "Entreprise", "Agence"],
});

const createGuichetAction = action(createGuichet, {
  entities: ["Guichet", "User", "Service", "AffectationGuichet", "Agence"],
});

const assignAgentAction = action(assignAgent, { entities: ["User", "AffectationGuichet", "Guichet", "Agence"] });

const soumettreAvisAction = action(soumettreAvis, {
  entities: ["Reponse", "Critere", "Guichet", "AffectationGuichet", "Alerte", "VoteAntiRejeu", "Service", "User", "Canal"],
});

const createAgenceAction = action(createAgence, { entities: ["Agence", "User"] });
const updateAgentAction = action(updateAgent, { entities: ["User", "Agence"] });
const deleteAgentAction = action(deleteAgent, { entities: ["User", "Agence"] });
const reactivateAgentAction = action(reactivateAgent, { entities: ["User", "Agence"] });
const promouvoirAgentAction = action(promouvoirAgent, { entities: ["User", "Agence"] });
const inviteAgentAction = action(inviteAgent, { entities: ["User", "Agence"] });
const toggleCritereAgenceAction = action(toggleCritereAgence, { entities: ["AgenceCritere", "User", "Agence"] });
const createCritereAction = action(createCritere, { entities: ["Critere", "AgenceCritere", "User", "Agence", "Service"] });
const createServiceAction = action(createService, { entities: ["Service", "User"] });
const updatePlanPricingAction = action(updatePlanPricing, { entities: ["PlanPricing", "User"] });

// Nouvelles actions (Module 1 — Objectifs)
const upsertObjectifAction = action(upsertObjectif, { entities: ["Objectif", "Agence", "Critere", "User"] });

// Nouvelles actions (Module 5 — Tâches correctives / Kanban)
const createTacheCorrectiveAction = action(createTacheCorrective, {
  entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence"],
});
const updateStatutTacheAction = action(updateStatutTache, {
  entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence"],
});
const marquerAlerteTraiteeAction = action(marquerAlerteTraitee, {
  entities: ["Alerte", "Guichet", "Reponse", "User", "Agence"],
});
const updateGuichetServicesAction = action(updateGuichetServices, { entities: ["Guichet", "Service", "User", "Agence"] });

// === QUERIES ===
const getGuichetsQuery = query(getGuichets, {
  entities: ["Guichet", "User", "Service", "Agence"],
});

const getAgentsQuery = query(getAgents, {
  entities: ["User", "Agence"],
});

const getReponsesQuery = query(getReponses, {
  entities: ["Reponse", "Critere", "Guichet", "Service", "Agence", "User"],
});

const getStatsFiltereesQuery = query(getStatsFiltrees, { entities: ["Reponse", "User", "Agence"] });
const getAgentsByAgenceQuery = query(getAgentsByAgence, { entities: ["User", "Agence"] });
const getAgencesQuery = query(getAgences, { entities: ["Agence", "User"] });
const getAlertesQuery = query(getAlertes, { entities: ["Alerte", "Guichet", "Reponse", "User", "Agence"] });
const getCriteresQuery = query(getCriteres, { entities: ["Critere", "User"] });
const getAgenceCriteresQuery = query(getAgenceCriteres, { entities: ["AgenceCritere", "User", "Agence"] });
const getFormDefinitionForGuichetQuery = query(getFormDefinitionForGuichet, {
  entities: ["Guichet", "AgenceCritere", "Critere", "Service"],
});
const getServicesQuery = query(getServices, {
  entities: ["Service", "User"],
});
const getRadarStatsQuery = query(getRadarStats, {
  entities: ["User", "Guichet", "AffectationGuichet", "Reponse", "Alerte", "TacheCorrective", "Agence"],
});
const getPlanPricingQuery = query(getPlanPricing, { entities: ["PlanPricing"] });

// Nouvelles queries
const getObjectifsQuery = query(getObjectifs, { entities: ["Objectif", "Critere", "Agence", "User", "Reponse"] });
const getTachesCorrectivesQuery = query(getTachesCorrectives, {
  entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence"],
});
const getAffectationsDuJourQuery = query(getAffectationsDuJour, {
  entities: ["AffectationGuichet", "Guichet", "User", "Agence"],
});
const getTendanceMensuelleQuery = query(getTendanceMensuelle, { entities: ["Reponse", "User", "Agence"] });
const getStatsByAgentQuery = query(getStatsByAgent, { entities: ["User", "Reponse", "Agence"] });
const getStatsByGuichetQuery = query(getStatsByGuichet, { entities: ["Guichet", "Reponse", "User", "Agence"] });
const getActionsPrioritairesQuery = query(getActionsPrioritaires, {
  entities: ["Alerte", "TacheCorrective", "Guichet", "Reponse", "Critere", "User", "Agence"],
});
const getKPIsPeriodeQuery = query(getKPIsPeriode, { entities: ["Reponse", "User", "Agence"] });

export default app({
  name: "CXSAT",
  wasp: { version: "^0.24.0" },
  title: "CXSAT — Satisfaction Client",
  head,
  auth: authConfig,
  db: {
    seeds: [
      seedMockUsers,
    ],
  },
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
  },
  emailSender,
  spec: [
    route("LandingPageRoute", "/", page(LandingPage), { prerender: true }),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    authSpec,
    userSpec,
    paymentSpec,
    fileUploadSpec,
    analyticsSpec,
    adminSpec,
    // Routes CXSAT
    onboardingRoute,
    guichetsRoute,
    planningRoute,
    dashboardRoute,
    adminPersonnelRoute,
    gestionAgencesRoute,
    avisRoute,
    configurationCriteresRoute,
    adminTarifsRoute,
    collecteRoute,
    alertesTachesRoute,
    // Actions existantes
    completeOnboardingAction,
    createGuichetAction,
    assignAgentAction,
    soumettreAvisAction,
    updateAgentAction,
    deleteAgentAction,
    reactivateAgentAction,
    promouvoirAgentAction,
    inviteAgentAction,
    createAgenceAction,
    toggleCritereAgenceAction,
    createCritereAction,
    createServiceAction,
    updatePlanPricingAction,
    // Nouvelles actions
    upsertObjectifAction,
    createTacheCorrectiveAction,
    updateStatutTacheAction,
    marquerAlerteTraiteeAction,
    updateGuichetServicesAction,
    // Queries existantes
    getPlanPricingQuery,
    getStatsFiltereesQuery,
    getAgentsByAgenceQuery,
    getAgencesQuery,
    getGuichetsQuery,
    getAgentsQuery,
    getReponsesQuery,
    getAlertesQuery,
    getCriteresQuery,
    getAgenceCriteresQuery,
    getFormDefinitionForGuichetQuery,
    getServicesQuery,
    getRadarStatsQuery,
    // Nouvelles queries
    getObjectifsQuery,
    getTachesCorrectivesQuery,
    getAffectationsDuJourQuery,
    getTendanceMensuelleQuery,
    getStatsByAgentQuery,
    getStatsByGuichetQuery,
    getActionsPrioritairesQuery,
    getKPIsPeriodeQuery,
    // === JOBS CRON CXSAT ===
    job(detecterAlertesSilence, {
      executor: "PgBoss",
      entities: ["Alerte", "Guichet", "AffectationGuichet", "Reponse", "User"],
      schedule: { cron: "*/30 * * * *" }, // Toutes les 30 minutes
    }),
    job(relancerTachesEnRetard, {
      executor: "PgBoss",
      entities: ["TacheCorrective", "Alerte", "Guichet", "User"],
      schedule: { cron: "0 8 * * *" }, // Tous les jours à 08h00
    }),
    job(envoyerRapportsMensuels, {
      executor: "PgBoss",
      entities: ["Agence", "Reponse", "Alerte", "TacheCorrective", "User"],
      schedule: { cron: "0 7 1 * *" }, // Le 1er du mois à 07h00
    }),
  ],
});