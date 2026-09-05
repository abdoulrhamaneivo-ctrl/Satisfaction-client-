import { action, app, page, query, route, job } from "@wasp.sh/spec";

import { App } from "./src/client/App" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };
import { serveStaticClient } from "./src/server/staticServing" with { type: "ref" };
import { RacinePage } from "./src/client/pages/RacinePage" with { type: "ref" };
// PlatformShell retiré : la route /platform pointe directement vers PlatformOverviewPage
// (voir la correction de la route dupliquée /platform ci-dessous).
import PlatformOverviewPage from "./src/client/platform/pages/PlatformOverviewPage" with { type: "ref" };
import CompaniesPage from "./src/client/platform/pages/CompaniesPage" with { type: "ref" };
import CreateCompanyPage from "./src/client/platform/pages/CreateCompanyPage" with { type: "ref" };
import CompanyDetailsPage from "./src/client/platform/pages/CompanyDetailsPage" with { type: "ref" };
import ActivateAccountPage from "./src/client/platform/pages/ActivateAccountPage" with { type: "ref" };
import AuditLogsPage from "./src/client/platform/pages/AuditLogsPage" with { type: "ref" };
import SecurityPage from "./src/client/platform/pages/SecurityPage" with { type: "ref" };
import { seedEntrepriseUnique, seedSuperAdmin } from "./src/server/scripts/dbSeeds" with { type: "ref" };

// === IMPORTS POUR LES GUICHETS Yeba ===
import { GuichetsPage } from "./src/client/pages/GuichetsPage" with { type: "ref" };
import { PlanningPage } from "./src/client/pages/PlanningPage" with { type: "ref" };
import { CollectePage } from "./src/client/pages/CollectePage" with { type: "ref" };
import { DashboardPage } from "./src/client/pages/DashboardPage" with { type: "ref" };
import { AdminPersonnelPage } from "./src/client/pages/AdminPersonnelPage" with { type: "ref" };
import { GestionAgencesPage } from "./src/client/pages/GestionAgencesPage" with { type: "ref" };
import { AvisPage } from "./src/client/pages/AvisPage" with { type: "ref" };
import { ConfigurationCriteresPage } from "./src/client/pages/ConfigurationCriteresPage" with { type: "ref" };
import { AlertesTachesPage } from "./src/client/pages/AlertesTachesPage" with { type: "ref" };
import { ArchivesPage } from "./src/client/pages/ArchivesPage" with { type: "ref" };
import { SettingsPage } from "./src/client/pages/SettingsPage" with { type: "ref" };

// === ACTIONS ===
import {
  createGuichet,
  assignAgent,
  soumettreAvis,
  updateAgent,
  deleteAgent,
  reactivateAgent,
  promouvoirAgent,
  inviteAgent,
  renvoyerInvitationAgent,
  updateBranding,
  createAgence,
  toggleCritereAgence,
  createCritere,
  createService,
  upsertObjectif,
  deleteObjectif,
  createTacheCorrective,
  updateStatutTache,
  marquerAlerteTraitee,
  updateGuichetServices,
  moveCritereToService,
  removeCritereFromService,
  deleteCritere,
  duplicateCritere,
  updateCritere,
  reorderCriteresInService,
  updateAffectationGuichet,
  deleteAffectationGuichet,
  archiverGuichet,
  desarchiverGuichet,
  archiverAgence,
  desarchiverAgence,
  archiverAlerte,
  desarchiverAlerte,
  archiverTache,
  desarchiverTache,
  archiverCritere,
  desarchiverCritere,
} from "./src/server/actions" with { type: "ref" };

// === IMPORTS JOBS CRON Yeba ===
import { detecterAlertesSilence } from "./src/server/jobs/alerteSilence" with { type: "ref" };
import { relancerTachesEnRetard } from "./src/server/jobs/relanceTache" with { type: "ref" };
import { envoyerRapportsMensuels } from "./src/server/jobs/rapportMensuel" with { type: "ref" };
import { archiverElementsResolusAnciens } from "./src/server/jobs/archivageAutomatique" with { type: "ref" };
import { analyserAvisIAJob } from "./src/server/jobs/analyserAvisIA" with { type: "ref" };

// === QUERIES ===
import {
  getGuichets,
  getAgents,
  getStatsFiltrees,
  getAgentsByAgence,
  getAgences,
  getReponses,
  getAvisGroupes,
  exportAvisGroupes,
  getAlertes,
  getCriteres,
  getAgenceCriteres,
  getFormDefinitionForGuichet,
  getServices,
  getBranding,
  getRadarStats,
  getObjectifs,
  getObjectifsParAgence,
  getTachesCorrectives,
  getTacheHistorique,
  getAffectationsDuJour,
  getTendanceMensuelle,
  getStatsByAgent,
  getStatsByGuichet,
  getActionsPrioritaires,
  getKPIsPeriode,
  getCriteresParOperation,
  getHeatmapReponses,
  getTempsTraitement,
  getRechercheGlobale,
  getArchives,
  getAIStatus,
  getThemesStats,
  getComparaisonAgences,} from "./src/server/queries" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { fileUploadSpec } from "./src/file-upload/file-upload.wasp";
import { emailSender } from "./src/server/emailSender.wasp";
import { userSpec } from "./src/user/user.wasp";

// === ROUTES ===
const guichetsRoute = route("GuichetsRoute", "/guichets", page(GuichetsPage));
const planningRoute = route("PlanningRoute", "/planning", page(PlanningPage));
const dashboardRoute = route("DashboardRoute", "/dashboard", page(DashboardPage));
const adminPersonnelRoute = route("AdminPersonnelRoute", "/admin/personnel", page(AdminPersonnelPage));
const gestionAgencesRoute = route("GestionAgencesRoute", "/admin/agences", page(GestionAgencesPage));
const avisRoute = route("AvisRoute", "/avis", page(AvisPage));
const configurationCriteresRoute = route("ConfigurationCriteresRoute", "/criteres", page(ConfigurationCriteresPage));
const collecteRoute = route("CollecteRoute", "/q/:guichetId", page(CollectePage));
// QR opaque (Doc 11 §7) : nouvelle voie normale — code public non prédictible.
const collecteCodeRoute = route("CollecteCodeRoute", "/q/:code", page(CollectePage));
const alertesTachesRoute = route("AlertesTachesRoute", "/alertes-taches", page(AlertesTachesPage));
const archivesRoute = route("ArchivesRoute", "/archives", page(ArchivesPage));
const settingsRoute = route("SettingsRoute", "/settings", page(SettingsPage));
// SAAS Platform (route dupliquée /platform corrigée — seule PlatformOverviewPage reste)
const platformOverviewRoute = route("PlatformOverviewRoute", "/platform", page(PlatformOverviewPage));
const platformCompaniesRoute = route("PlatformCompaniesRoute", "/platform/entreprises", page(CompaniesPage));
const platformNewCompanyRoute = route("PlatformNewCompanyRoute", "/platform/entreprises/nouvelle", page(CreateCompanyPage));
const platformCompanyDetailRoute = route("PlatformCompanyDetailRoute", "/platform/entreprises/:id", page(CompanyDetailsPage));
const platformAuditRoute = route("PlatformAuditRoute", "/platform/audit", page(AuditLogsPage));
const platformSecurityRoute = route("PlatformSecurityRoute", "/platform/securite", page(SecurityPage));
const activateAccountRoute = route("ActivateAccountRoute", "/account/activate", page(ActivateAccountPage));

// === ACTIONS DEFINITIONS ===
const createGuichetAction = action(createGuichet, {
  entities: ["Guichet", "User", "Service", "AffectationGuichet", "Agence", "Entreprise"],
});
const assignAgentAction = action(assignAgent, { entities: ["User", "AffectationGuichet", "Guichet", "Agence", "Entreprise"] });
const updateAffectationGuichetAction = action(updateAffectationGuichet, { entities: ["User", "AffectationGuichet", "Guichet", "Agence", "Entreprise"] });
const deleteAffectationGuichetAction = action(deleteAffectationGuichet, { entities: ["AffectationGuichet", "Guichet", "Agence", "Entreprise"] });
const soumettreAvisAction = action(soumettreAvis, {
  entities: ["Reponse", "Critere", "AgenceCritere", "CritereService", "Guichet", "AffectationGuichet", "Alerte", "VoteAntiRejeu", "Service", "User", "AnalyseAvisIA", "Canal"],
});
const createAgenceAction = action(createAgence, { entities: ["Agence", "User", "Entreprise"] });
const updateAgentAction = action(updateAgent, { entities: ["User", "Agence", "Entreprise"] });
const deleteAgentAction = action(deleteAgent, { entities: ["User", "Agence", "Entreprise"] });
const reactivateAgentAction = action(reactivateAgent, { entities: ["User", "Agence", "Entreprise"] });
const promouvoirAgentAction = action(promouvoirAgent, { entities: ["User", "Agence", "Entreprise"] });
const updateBrandingAction = action(updateBranding, { entities: ["BrandingConfig", "User", "Entreprise", "AuditLog"] });
const inviteAgentAction = action(inviteAgent, { entities: ["User", "Agence", "Entreprise", "Invitation"] });
const renvoyerInvitationAgentAction = action(renvoyerInvitationAgent, { entities: ["User", "Agence", "Invitation", "AuditLog", "Entreprise"] });
const toggleCritereAgenceAction = action(toggleCritereAgence, { entities: ["AgenceCritere", "User", "Agence", "Entreprise"] });
const createCritereAction = action(createCritere, { entities: ["Critere", "AgenceCritere", "User", "Agence", "Service", "Entreprise"] });
const createServiceAction = action(createService, { entities: ["Service", "User", "Entreprise"] });
const upsertObjectifAction = action(upsertObjectif, { entities: ["Objectif", "Agence", "Critere", "User", "Entreprise"] });
const deleteObjectifAction = action(deleteObjectif, { entities: ["Objectif", "Agence", "User", "Entreprise"] });
const createTacheCorrectiveAction = action(createTacheCorrective, {
  entities: ["TacheCorrective", "TacheCorrectiveHistorique", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"],
});
const updateStatutTacheAction = action(updateStatutTache, {
  entities: ["TacheCorrective", "TacheCorrectiveHistorique", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"],
});
const marquerAlerteTraiteeAction = action(marquerAlerteTraitee, {
  entities: ["Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"],
});
const updateGuichetServicesAction = action(updateGuichetServices, { entities: ["Guichet", "Service", "User", "Agence", "Entreprise"] });
const moveCritereToServiceAction = action(moveCritereToService, { entities: ["CritereService", "Critere", "Service", "User", "Entreprise"] });
const removeCritereFromServiceAction = action(removeCritereFromService, { entities: ["CritereService", "Critere", "Service", "User", "Entreprise"] });
const deleteCritereAction = action(deleteCritere, { entities: ["Critere", "Reponse", "AgenceCritere", "CritereService", "Objectif", "User", "Entreprise"] });
const duplicateCritereAction = action(duplicateCritere, { entities: ["Critere", "AgenceCritere", "CritereService", "Agence", "Service", "User", "Entreprise"] });
const updateCritereAction = action(updateCritere, { entities: ["Critere", "User", "Entreprise"] });
const reorderCriteresInServiceAction = action(reorderCriteresInService, { entities: ["CritereService", "Service", "User", "Entreprise"] });
const archiverGuichetAction = action(archiverGuichet, { entities: ["Guichet", "User", "Agence", "Entreprise"] });
const desarchiverGuichetAction = action(desarchiverGuichet, { entities: ["Guichet", "User", "Agence", "Entreprise"] });
const archiverAgenceAction = action(archiverAgence, { entities: ["Agence", "Guichet", "User", "Entreprise"] });
const desarchiverAgenceAction = action(desarchiverAgence, { entities: ["Agence", "User", "Entreprise"] });
const archiverAlerteAction = action(archiverAlerte, { entities: ["Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const desarchiverAlerteAction = action(desarchiverAlerte, { entities: ["Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const archiverTacheAction = action(archiverTache, { entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const desarchiverTacheAction = action(desarchiverTache, { entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const archiverCritereAction = action(archiverCritere, { entities: ["Critere", "User", "Entreprise"] });
const desarchiverCritereAction = action(desarchiverCritere, { entities: ["Critere", "User", "Entreprise"] });

// === QUERIES DEFINITIONS ===
const getGuichetsQuery = query(getGuichets, { entities: ["Guichet", "User", "Service", "Agence", "Entreprise"] });
const getAgentsQuery = query(getAgents, { entities: ["User", "Agence", "Entreprise"] });
const getReponsesQuery = query(getReponses, { entities: ["Reponse", "Critere", "Guichet", "Service", "Agence", "User", "Entreprise"] });
const getAvisGroupesQuery = query(getAvisGroupes, { entities: ["Reponse", "Critere", "Guichet", "Service", "Agence", "User", "Entreprise"] });
const getStatsFiltereesQuery = query(getStatsFiltrees, { entities: ["Reponse", "User", "Agence", "Entreprise"] });
const getAgentsByAgenceQuery = query(getAgentsByAgence, { entities: ["User", "Agence", "Entreprise"] });
const getAgencesQuery = query(getAgences, { entities: ["Agence", "User", "Entreprise"] });
const getAlertesQuery = query(getAlertes, { entities: ["Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const getCriteresQuery = query(getCriteres, { entities: ["Critere", "User", "Entreprise"] });
const getAgenceCriteresQuery = query(getAgenceCriteres, { entities: ["AgenceCritere", "User", "Agence", "Entreprise"] });
const getFormDefinitionForGuichetQuery = query(getFormDefinitionForGuichet, { entities: ["Guichet", "AgenceCritere", "Critere", "Service", "CritereService", "Entreprise", "BrandingConfig"] });
const getServicesQuery = query(getServices, { entities: ["Service", "User", "Entreprise"] });
const getBrandingQuery = query(getBranding, { entities: ["BrandingConfig", "User", "Entreprise"] });
const getRadarStatsQuery = query(getRadarStats, { entities: ["User", "Guichet", "AffectationGuichet", "Reponse", "Alerte", "TacheCorrective", "Agence", "Entreprise"] });
const getObjectifsQuery = query(getObjectifs, { entities: ["Objectif", "Critere", "Agence", "User", "Reponse", "Entreprise"] });
const getObjectifsParAgenceQuery = query(getObjectifsParAgence, { entities: ["Objectif", "Critere", "Agence", "User", "Reponse", "Entreprise"] });
const getTachesCorrectivesQuery = query(getTachesCorrectives, { entities: ["TacheCorrective", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const getTacheHistoriqueQuery = query(getTacheHistorique, { entities: ["TacheCorrective", "TacheCorrectiveHistorique", "Alerte", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const exportAvisGroupesQuery = query(exportAvisGroupes, { entities: ["Reponse", "Critere", "Guichet", "Service", "Agence", "User", "Entreprise"] });
const getAffectationsDuJourQuery = query(getAffectationsDuJour, { entities: ["AffectationGuichet", "Guichet", "User", "Agence", "Entreprise"] });
const getTendanceMensuelleQuery = query(getTendanceMensuelle, { entities: ["Reponse", "User", "Agence", "Entreprise"] });
const getStatsByAgentQuery = query(getStatsByAgent, { entities: ["User", "Reponse", "Agence", "Entreprise"] });
const getStatsByGuichetQuery = query(getStatsByGuichet, { entities: ["Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const getActionsPrioritairesQuery = query(getActionsPrioritaires, { entities: ["Alerte", "TacheCorrective", "Guichet", "Reponse", "Critere", "User", "Agence", "Entreprise"] });
const getKPIsPeriodeQuery = query(getKPIsPeriode, { entities: ["Reponse", "User", "Agence", "Entreprise"] });
const getCriteresParOperationQuery = query(getCriteresParOperation, { entities: ["Service", "Critere", "CritereService", "AgenceCritere", "User", "Agence", "Entreprise"] });
const getHeatmapReponsesQuery = query(getHeatmapReponses, { entities: ["Reponse", "User", "Agence", "Entreprise"] });
const getComparaisonAgencesQuery = query(getComparaisonAgences, { entities: ["Agence", "Reponse", "User", "Entreprise"] });
const getTempsTraitementQuery = query(getTempsTraitement, { entities: ["Alerte", "TacheCorrective", "Guichet", "Reponse", "User", "Agence", "Entreprise"] });
const getRechercheGlobaleQuery = query(getRechercheGlobale, { entities: ["Agence", "Guichet", "User", "Reponse", "Entreprise"] });
const getArchivesQuery = query(getArchives, { entities: ["Guichet", "Agence", "Alerte", "TacheCorrective", "Reponse", "User", "Entreprise"] });
const getAIStatusQuery = query(getAIStatus, { entities: ["AnalyseAvisIA", "Entreprise"] });
const getThemesStatsQuery = query(getThemesStats, { entities: ["AnalyseAvisIA", "Agence", "Reponse", "Entreprise"] });

// === SAAS PLATFORM (Doc 11/12 — phase P1) ===
import {
  creerEntreprise,
  suspendreEntreprise,
  reactiverEntreprise,
  changerLimitesEntreprise,
  renvoyerInvitation,
  inviterSuperAdmin,
  activerCompte,
  changerPlatformRole,
  desactiverComptePlatform,
  setup2fa,
  activer2fa,
  verifier2fa,
} from "./src/server/actionsPlatform" with { type: "ref" };
import {
  getPlatformOverview,
  getPlatformEntreprises,
  getPlatformEntreprise,
  getPlatformAudit,
  getPlatformMe,
} from "./src/server/queriesPlatform" with { type: "ref" };

const creerEntrepriseAction = action(creerEntreprise, { entities: ["Entreprise", "User", "Invitation", "AuditLog"] });
const suspendreEntrepriseAction = action(suspendreEntreprise, { entities: ["Entreprise", "AuditLog"] });
const reactiverEntrepriseAction = action(reactiverEntreprise, { entities: ["Entreprise", "AuditLog"] });
const changerLimitesEntrepriseAction = action(changerLimitesEntreprise, { entities: ["Entreprise", "AuditLog"] });
const renvoyerInvitationAction = action(renvoyerInvitation, { entities: ["Entreprise", "User", "Invitation", "AuditLog"] });
const inviterSuperAdminAction = action(inviterSuperAdmin, { entities: ["User", "Invitation", "AuditLog"] });
const activerCompteAction = action(activerCompte, { entities: ["Invitation", "User", "AuditLog"] });
const changerPlatformRoleAction = action(changerPlatformRole, { entities: ["User", "AuditLog"] });
const desactiverComptePlatformAction = action(desactiverComptePlatform, { entities: ["User", "AuditLog"] });
const setup2faAction = action(setup2fa, { entities: ["User", "AuditLog"] });
const activer2faAction = action(activer2fa, { entities: ["User", "AuditLog"] });
const verifier2faAction = action(verifier2fa, { entities: ["User", "AuditLog"] });

const getPlatformOverviewQuery = query(getPlatformOverview, { entities: ["Entreprise", "User", "Reponse"] });
const getPlatformEntreprisesQuery = query(getPlatformEntreprises, { entities: ["Entreprise", "User"] });
const getPlatformEntrepriseQuery = query(getPlatformEntreprise, { entities: ["Entreprise", "User", "Agence", "Guichet", "Reponse", "Invitation", "AuditLog"] });
const getPlatformAuditQuery = query(getPlatformAudit, { entities: ["AuditLog", "User"] });
const getPlatformMeQuery = query(getPlatformMe, { entities: ["User"] });

export default app({
  name: "Yeba",
  wasp: { version: "^0.24.0" },
  title: "Yeba — Satisfaction Client",
  head,
  auth: authConfig,
  db: {
    seeds: [
      seedEntrepriseUnique,
      seedSuperAdmin,
    ],
  },
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
    // Servir le build client depuis le serveur Express (Render mono-service,
    // voir Dockerfile.render + src/server/staticServing.ts). setupFn reçoit
    // l'app Express complète — le static s'applique à TOUTES les requêtes
    // (assets, routes SPA), contrairement à middlewareConfigFn. No-op si le
    // dossier du client est absent (déploiements client séparé comme Railway).
    setupFn: serveStaticClient,
  },
  emailSender,
  spec: [
    route("LandingPageRoute", "/", page(RacinePage)),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    authSpec,
    userSpec,
    fileUploadSpec,
    adminSpec,
    // Routes Yeba
    guichetsRoute,
    planningRoute,
    dashboardRoute,
    adminPersonnelRoute,
    gestionAgencesRoute,
    avisRoute,
    configurationCriteresRoute,
    collecteRoute,
    collecteCodeRoute,
    alertesTachesRoute,
    archivesRoute,
    settingsRoute,
    // SAAS Platform
    platformOverviewRoute,
    platformCompaniesRoute,
    platformNewCompanyRoute,
    platformCompanyDetailRoute,
    platformAuditRoute,
    platformSecurityRoute,
    activateAccountRoute,
    // Actions
    createGuichetAction,
    assignAgentAction,
    updateAffectationGuichetAction,
    deleteAffectationGuichetAction,
    soumettreAvisAction,
    createAgenceAction,
    updateAgentAction,
    deleteAgentAction,
    reactivateAgentAction,
    promouvoirAgentAction,
    updateBrandingAction,
    inviteAgentAction,
    renvoyerInvitationAgentAction,
    toggleCritereAgenceAction,
    createCritereAction,
    createServiceAction,
    upsertObjectifAction,
    deleteObjectifAction,
    createTacheCorrectiveAction,
    updateStatutTacheAction,
    marquerAlerteTraiteeAction,
    updateGuichetServicesAction,
    moveCritereToServiceAction,
    removeCritereFromServiceAction,
    deleteCritereAction,
    duplicateCritereAction,
    updateCritereAction,
    reorderCriteresInServiceAction,
    archiverGuichetAction,
    desarchiverGuichetAction,
    archiverAgenceAction,
    desarchiverAgenceAction,
    archiverAlerteAction,
    desarchiverAlerteAction,
    archiverTacheAction,
    desarchiverTacheAction,
    archiverCritereAction,
    desarchiverCritereAction,
    // SAAS Platform
    creerEntrepriseAction,
    suspendreEntrepriseAction,
    reactiverEntrepriseAction,
    changerLimitesEntrepriseAction,
    renvoyerInvitationAction,
    inviterSuperAdminAction,
    activerCompteAction,
    changerPlatformRoleAction,
    desactiverComptePlatformAction,
    setup2faAction,
    activer2faAction,
    verifier2faAction,
    // Queries
    getGuichetsQuery,
    getAgentsQuery,
    getReponsesQuery,
    getAvisGroupesQuery,
    getStatsFiltereesQuery,
    getAgentsByAgenceQuery,
    getAgencesQuery,
    getAlertesQuery,
    getCriteresQuery,
    getAgenceCriteresQuery,
    getFormDefinitionForGuichetQuery,
    getServicesQuery,
    getBrandingQuery,
    getRadarStatsQuery,
    getObjectifsQuery,
    getObjectifsParAgenceQuery,
    getTachesCorrectivesQuery,
    getTacheHistoriqueQuery,
    exportAvisGroupesQuery,
    getAffectationsDuJourQuery,
    getTendanceMensuelleQuery,
    getStatsByAgentQuery,
    getStatsByGuichetQuery,
    getActionsPrioritairesQuery,
    getKPIsPeriodeQuery,
    getCriteresParOperationQuery,
    getHeatmapReponsesQuery,
    getComparaisonAgencesQuery,
    getTempsTraitementQuery,
    getRechercheGlobaleQuery,
    getArchivesQuery,
    getAIStatusQuery,
    getThemesStatsQuery,
    // SAAS Platform
    getPlatformOverviewQuery,
    getPlatformEntreprisesQuery,
    getPlatformEntrepriseQuery,
    getPlatformAuditQuery,
    getPlatformMeQuery,
    // Jobs PgBoss
    job(detecterAlertesSilence, {
      executor: "PgBoss",
      entities: ["Alerte", "Guichet", "AffectationGuichet", "Reponse", "User"],
      schedule: { cron: "*/30 * * * *" },
    }),
    job(relancerTachesEnRetard, {
      executor: "PgBoss",
      entities: ["TacheCorrective", "Alerte", "Guichet", "User"],
      schedule: { cron: "0 8 * * *" },
    }),
    job(envoyerRapportsMensuels, {
      executor: "PgBoss",
      entities: ["Agence", "Reponse", "Alerte", "TacheCorrective", "User"],
      schedule: { cron: "0 7 1 * *" },
    }),
    job(archiverElementsResolusAnciens, {
      executor: "PgBoss",
      entities: ["Alerte", "TacheCorrective"],
      schedule: { cron: "0 3 * * *" },
    }),
    job(analyserAvisIAJob, {
      executor: "PgBoss",
      entities: ["AnalyseAvisIA", "Reponse", "Agence", "Guichet", "Service", "Critere", "User", "Alerte"],
      schedule: { cron: "* * * * *" },
    }),
  ],
});