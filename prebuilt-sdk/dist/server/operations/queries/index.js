import { prisma } from 'wasp/server';
import { createAuthenticatedOperation, } from '../wrappers.js';
import { getAllFilesByUser as getAllFilesByUser_ext } from 'wasp/src/file-upload/operations';
import { getDownloadFileSignedURL as getDownloadFileSignedURL_ext } from 'wasp/src/file-upload/operations';
import { getGuichets as getGuichets_ext } from 'wasp/src/server/queries';
import { getAgents as getAgents_ext } from 'wasp/src/server/queries';
import { getReponses as getReponses_ext } from 'wasp/src/server/queries';
import { getAvisGroupes as getAvisGroupes_ext } from 'wasp/src/server/queries';
import { getStatsFiltrees as getStatsFiltrees_ext } from 'wasp/src/server/queries';
import { getAgentsByAgence as getAgentsByAgence_ext } from 'wasp/src/server/queries';
import { getAgences as getAgences_ext } from 'wasp/src/server/queries';
import { getAlertes as getAlertes_ext } from 'wasp/src/server/queries';
import { getCriteres as getCriteres_ext } from 'wasp/src/server/queries';
import { getAgenceCriteres as getAgenceCriteres_ext } from 'wasp/src/server/queries';
import { getFormDefinitionForGuichet as getFormDefinitionForGuichet_ext } from 'wasp/src/server/queries';
import { getServices as getServices_ext } from 'wasp/src/server/queries';
import { getRadarStats as getRadarStats_ext } from 'wasp/src/server/queries';
import { getObjectifs as getObjectifs_ext } from 'wasp/src/server/queries';
import { getObjectifsParAgence as getObjectifsParAgence_ext } from 'wasp/src/server/queries';
import { getTachesCorrectives as getTachesCorrectives_ext } from 'wasp/src/server/queries';
import { getTacheHistorique as getTacheHistorique_ext } from 'wasp/src/server/queries';
import { exportAvisGroupes as exportAvisGroupes_ext } from 'wasp/src/server/queries';
import { getAffectationsDuJour as getAffectationsDuJour_ext } from 'wasp/src/server/queries';
import { getTendanceMensuelle as getTendanceMensuelle_ext } from 'wasp/src/server/queries';
import { getStatsByAgent as getStatsByAgent_ext } from 'wasp/src/server/queries';
import { getStatsByGuichet as getStatsByGuichet_ext } from 'wasp/src/server/queries';
import { getActionsPrioritaires as getActionsPrioritaires_ext } from 'wasp/src/server/queries';
import { getKPIsPeriode as getKPIsPeriode_ext } from 'wasp/src/server/queries';
import { getCriteresParOperation as getCriteresParOperation_ext } from 'wasp/src/server/queries';
import { getHeatmapReponses as getHeatmapReponses_ext } from 'wasp/src/server/queries';
import { getComparaisonAgences as getComparaisonAgences_ext } from 'wasp/src/server/queries';
import { getTempsTraitement as getTempsTraitement_ext } from 'wasp/src/server/queries';
import { getRechercheGlobale as getRechercheGlobale_ext } from 'wasp/src/server/queries';
import { getArchives as getArchives_ext } from 'wasp/src/server/queries';
import { getAIStatus as getAIStatus_ext } from 'wasp/src/server/queries';
import { getThemesStats as getThemesStats_ext } from 'wasp/src/server/queries';
import { getPlatformOverview as getPlatformOverview_ext } from 'wasp/src/server/queriesPlatform';
import { getPlatformEntreprises as getPlatformEntreprises_ext } from 'wasp/src/server/queriesPlatform';
import { getPlatformEntreprise as getPlatformEntreprise_ext } from 'wasp/src/server/queriesPlatform';
import { getPlatformAudit as getPlatformAudit_ext } from 'wasp/src/server/queriesPlatform';
import { getPlatformMe as getPlatformMe_ext } from 'wasp/src/server/queriesPlatform';
// PUBLIC API
export const getAllFilesByUser = createAuthenticatedOperation(getAllFilesByUser_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const getDownloadFileSignedURL = createAuthenticatedOperation(getDownloadFileSignedURL_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const getGuichets = createAuthenticatedOperation(getGuichets_ext, {
    Guichet: prisma.guichet,
    User: prisma.user,
    Service: prisma.service,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAgents = createAuthenticatedOperation(getAgents_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getReponses = createAuthenticatedOperation(getReponses_ext, {
    Reponse: prisma.reponse,
    Critere: prisma.critere,
    Guichet: prisma.guichet,
    Service: prisma.service,
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAvisGroupes = createAuthenticatedOperation(getAvisGroupes_ext, {
    Reponse: prisma.reponse,
    Critere: prisma.critere,
    Guichet: prisma.guichet,
    Service: prisma.service,
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getStatsFiltrees = createAuthenticatedOperation(getStatsFiltrees_ext, {
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAgentsByAgence = createAuthenticatedOperation(getAgentsByAgence_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAgences = createAuthenticatedOperation(getAgences_ext, {
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAlertes = createAuthenticatedOperation(getAlertes_ext, {
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getCriteres = createAuthenticatedOperation(getCriteres_ext, {
    Critere: prisma.critere,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAgenceCriteres = createAuthenticatedOperation(getAgenceCriteres_ext, {
    AgenceCritere: prisma.agenceCritere,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getFormDefinitionForGuichet = createAuthenticatedOperation(getFormDefinitionForGuichet_ext, {
    Guichet: prisma.guichet,
    AgenceCritere: prisma.agenceCritere,
    Critere: prisma.critere,
    Service: prisma.service,
    CritereService: prisma.critereService,
    Entreprise: prisma.entreprise,
    BrandingConfig: prisma.brandingConfig,
});
// PUBLIC API
export const getServices = createAuthenticatedOperation(getServices_ext, {
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getRadarStats = createAuthenticatedOperation(getRadarStats_ext, {
    User: prisma.user,
    Guichet: prisma.guichet,
    AffectationGuichet: prisma.affectationGuichet,
    Reponse: prisma.reponse,
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getObjectifs = createAuthenticatedOperation(getObjectifs_ext, {
    Objectif: prisma.objectif,
    Critere: prisma.critere,
    Agence: prisma.agence,
    User: prisma.user,
    Reponse: prisma.reponse,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getObjectifsParAgence = createAuthenticatedOperation(getObjectifsParAgence_ext, {
    Objectif: prisma.objectif,
    Critere: prisma.critere,
    Agence: prisma.agence,
    User: prisma.user,
    Reponse: prisma.reponse,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getTachesCorrectives = createAuthenticatedOperation(getTachesCorrectives_ext, {
    TacheCorrective: prisma.tacheCorrective,
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getTacheHistorique = createAuthenticatedOperation(getTacheHistorique_ext, {
    TacheCorrective: prisma.tacheCorrective,
    TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const exportAvisGroupes = createAuthenticatedOperation(exportAvisGroupes_ext, {
    Reponse: prisma.reponse,
    Critere: prisma.critere,
    Guichet: prisma.guichet,
    Service: prisma.service,
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAffectationsDuJour = createAuthenticatedOperation(getAffectationsDuJour_ext, {
    AffectationGuichet: prisma.affectationGuichet,
    Guichet: prisma.guichet,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getTendanceMensuelle = createAuthenticatedOperation(getTendanceMensuelle_ext, {
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getStatsByAgent = createAuthenticatedOperation(getStatsByAgent_ext, {
    User: prisma.user,
    Reponse: prisma.reponse,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getStatsByGuichet = createAuthenticatedOperation(getStatsByGuichet_ext, {
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getActionsPrioritaires = createAuthenticatedOperation(getActionsPrioritaires_ext, {
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    Critere: prisma.critere,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getKPIsPeriode = createAuthenticatedOperation(getKPIsPeriode_ext, {
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getCriteresParOperation = createAuthenticatedOperation(getCriteresParOperation_ext, {
    Service: prisma.service,
    Critere: prisma.critere,
    CritereService: prisma.critereService,
    AgenceCritere: prisma.agenceCritere,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getHeatmapReponses = createAuthenticatedOperation(getHeatmapReponses_ext, {
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getComparaisonAgences = createAuthenticatedOperation(getComparaisonAgences_ext, {
    Agence: prisma.agence,
    Reponse: prisma.reponse,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getTempsTraitement = createAuthenticatedOperation(getTempsTraitement_ext, {
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getRechercheGlobale = createAuthenticatedOperation(getRechercheGlobale_ext, {
    Agence: prisma.agence,
    Guichet: prisma.guichet,
    User: prisma.user,
    Reponse: prisma.reponse,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getArchives = createAuthenticatedOperation(getArchives_ext, {
    Guichet: prisma.guichet,
    Agence: prisma.agence,
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
    Reponse: prisma.reponse,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getAIStatus = createAuthenticatedOperation(getAIStatus_ext, {
    AnalyseAvisIA: prisma.analyseAvisIA,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getThemesStats = createAuthenticatedOperation(getThemesStats_ext, {
    AnalyseAvisIA: prisma.analyseAvisIA,
    Agence: prisma.agence,
    Reponse: prisma.reponse,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const getPlatformOverview = createAuthenticatedOperation(getPlatformOverview_ext, {
    Entreprise: prisma.entreprise,
    User: prisma.user,
    Reponse: prisma.reponse,
});
// PUBLIC API
export const getPlatformEntreprises = createAuthenticatedOperation(getPlatformEntreprises_ext, {
    Entreprise: prisma.entreprise,
    User: prisma.user,
});
// PUBLIC API
export const getPlatformEntreprise = createAuthenticatedOperation(getPlatformEntreprise_ext, {
    Entreprise: prisma.entreprise,
    User: prisma.user,
    Agence: prisma.agence,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    Invitation: prisma.invitation,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const getPlatformAudit = createAuthenticatedOperation(getPlatformAudit_ext, {
    AuditLog: prisma.auditLog,
    User: prisma.user,
});
// PUBLIC API
export const getPlatformMe = createAuthenticatedOperation(getPlatformMe_ext, {
    User: prisma.user,
});
//# sourceMappingURL=index.js.map