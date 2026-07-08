import { action, app, page, query, route } from "@wasp.sh/spec";

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
  createAgent,
  updateAgent,
  deleteAgent,
  createChefAgence,
  promouvoirAgent,
  inviteAgent,
  toggleCritereAgence,
  createCritere,
  updatePlanPricing,
  upsertObjectif,
  createTacheCorrective,
  updateStatutTache,
  marquerAlerteTraitee,
} from "./src/server/actions" with { type: "ref" };

// === QUERIES ===
import {
  getGuichets,
  getAgents,
  getStatsFiltrees,
  getAgentsByAgence,
  getAgences,
  getReponses,
  getAlertes,
  getTasks,
  getCriteres,
  getAgenceCriteres,
  getActiveCritereForGuichet,
  getRadarStats,
  getPlanPricing,
  getObjectifs,
  getTachesCorrectives,
  getAffectationsDuJour,
  getTendanceMensuelle,
  getStatsByAgent,
} from "./src/server/queries" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { analyticsSpec } from "./src/analytics/analytics.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { demoAiAppSpec } from "./src/demo-ai-app/demo-ai-app.wasp";
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
  entities: ["Guichet", "User"],
});

const assignAgentAction = action(assignAgent, { entities: ["User", "AffectationGuichet"] });

const soumettreAvisAction = action(soumettreAvis, {
  entities: ["Reponse", "Critere", "Guichet", "AffectationGuichet", "Alerte", "VoteAntiRejeu"],
});

const createAgentAction = action(createAgent, { entities: ["User"] });
const updateAgentAction = action(updateAgent, { entities: ["User"] });
const deleteAgentAction = action(deleteAgent, { entities: ["User"] });
const createChefAgenceAction = action(createChefAgence, { entities: ["User"] });
const promouvoirAgentAction = action(promouvoirAgent, { entities: ["User"] });
const inviteAgentAction = action(inviteAgent, { entities: ["User"] });
const toggleCritereAgenceAction = action(toggleCritereAgence, { entities: ["AgenceCritere", "User"] });
const createCritereAction = action(createCritere, { entities: ["Critere", "AgenceCritere", "User"] });
const updatePlanPricingAction = action(updatePlanPricing, { entities: ["PlanPricing", "User"] });

// Nouvelles actions (Module 1 — Objectifs)
const upsertObjectifAction = action(upsertObjectif, { entities: ["Objectif", "Agence", "Critere"] });

// Nouvelles actions (Module 5 — Tâches correctives / Kanban)
const createTacheCorrectiveAction = action(createTacheCorrective, {
  entities: ["TacheCorrective", "Alerte", "User"],
});
const updateStatutTacheAction = action(updateStatutTache, { entities: ["TacheCorrective"] });
const marquerAlerteTraiteeAction = action(marquerAlerteTraitee, { entities: ["Alerte"] });

// === QUERIES ===
const getGuichetsQuery = query(getGuichets, {
  entities: ["Guichet", "User"],
});

const getAgentsQuery = query(getAgents, {
  entities: ["User"],
});

const getReponsesQuery = query(getReponses, {
  entities: ["Reponse", "Critere", "Guichet"],
});

const getStatsFiltereesQuery = query(getStatsFiltrees, { entities: ["Reponse"] });
const getAgentsByAgenceQuery = query(getAgentsByAgence, { entities: ["User"] });
const getAgencesQuery = query(getAgences, { entities: ["Agence"] });
const getAlertesQuery = query(getAlertes, { entities: ["Alerte", "Guichet", "Reponse"] });
const getTasksQuery = query(getTasks, { entities: ["Task", "User", "Alerte"] });
const getCriteresQuery = query(getCriteres, { entities: ["Critere"] });
const getAgenceCriteresQuery = query(getAgenceCriteres, { entities: ["AgenceCritere", "User"] });
const getActiveCritereForGuichetQuery = query(getActiveCritereForGuichet, {
  entities: ["Guichet", "AgenceCritere", "Critere"],
});
const getRadarStatsQuery = query(getRadarStats, {
  entities: ["User", "Guichet", "AffectationGuichet", "Reponse", "Alerte", "Task"],
});
const getPlanPricingQuery = query(getPlanPricing, { entities: ["PlanPricing"] });

// Nouvelles queries
const getObjectifsQuery = query(getObjectifs, { entities: ["Objectif", "Critere", "Agence"] });
const getTachesCorrectivesQuery = query(getTachesCorrectives, {
  entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User"],
});
const getAffectationsDuJourQuery = query(getAffectationsDuJour, {
  entities: ["AffectationGuichet", "Guichet", "User"],
});
const getTendanceMensuelleQuery = query(getTendanceMensuelle, { entities: ["Reponse"] });
const getStatsByAgentQuery = query(getStatsByAgent, { entities: ["User", "Reponse"] });

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
    demoAiAppSpec,
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
    createAgentAction,
    updateAgentAction,
    deleteAgentAction,
    createChefAgenceAction,
    promouvoirAgentAction,
    inviteAgentAction,
    toggleCritereAgenceAction,
    createCritereAction,
    updatePlanPricingAction,
    // Nouvelles actions
    upsertObjectifAction,
    createTacheCorrectiveAction,
    updateStatutTacheAction,
    marquerAlerteTraiteeAction,
    // Queries existantes
    getPlanPricingQuery,
    getStatsFiltereesQuery,
    getAgentsByAgenceQuery,
    getAgencesQuery,
    getGuichetsQuery,
    getAgentsQuery,
    getReponsesQuery,
    getAlertesQuery,
    getTasksQuery,
    getCriteresQuery,
    getAgenceCriteresQuery,
    getActiveCritereForGuichetQuery,
    getRadarStatsQuery,
    // Nouvelles queries
    getObjectifsQuery,
    getTachesCorrectivesQuery,
    getAffectationsDuJourQuery,
    getTendanceMensuelleQuery,
    getStatsByAgentQuery,
  ],
});
