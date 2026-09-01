
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { getAllFilesByUser as getAllFilesByUser_ext } from 'wasp/src/file-upload/operations'
import { getDownloadFileSignedURL as getDownloadFileSignedURL_ext } from 'wasp/src/file-upload/operations'
import { getGuichets as getGuichets_ext } from 'wasp/src/server/queries'
import { getAgents as getAgents_ext } from 'wasp/src/server/queries'
import { getReponses as getReponses_ext } from 'wasp/src/server/queries'
import { getAvisGroupes as getAvisGroupes_ext } from 'wasp/src/server/queries'
import { getStatsFiltrees as getStatsFiltrees_ext } from 'wasp/src/server/queries'
import { getAgentsByAgence as getAgentsByAgence_ext } from 'wasp/src/server/queries'
import { getAgences as getAgences_ext } from 'wasp/src/server/queries'
import { getAlertes as getAlertes_ext } from 'wasp/src/server/queries'
import { getCriteres as getCriteres_ext } from 'wasp/src/server/queries'
import { getAgenceCriteres as getAgenceCriteres_ext } from 'wasp/src/server/queries'
import { getFormDefinitionForGuichet as getFormDefinitionForGuichet_ext } from 'wasp/src/server/queries'
import { getServices as getServices_ext } from 'wasp/src/server/queries'
import { getRadarStats as getRadarStats_ext } from 'wasp/src/server/queries'
import { getObjectifs as getObjectifs_ext } from 'wasp/src/server/queries'
import { getObjectifsParAgence as getObjectifsParAgence_ext } from 'wasp/src/server/queries'
import { getTachesCorrectives as getTachesCorrectives_ext } from 'wasp/src/server/queries'
import { getTacheHistorique as getTacheHistorique_ext } from 'wasp/src/server/queries'
import { exportAvisGroupes as exportAvisGroupes_ext } from 'wasp/src/server/queries'
import { getAffectationsDuJour as getAffectationsDuJour_ext } from 'wasp/src/server/queries'
import { getTendanceMensuelle as getTendanceMensuelle_ext } from 'wasp/src/server/queries'
import { getStatsByAgent as getStatsByAgent_ext } from 'wasp/src/server/queries'
import { getStatsByGuichet as getStatsByGuichet_ext } from 'wasp/src/server/queries'
import { getActionsPrioritaires as getActionsPrioritaires_ext } from 'wasp/src/server/queries'
import { getKPIsPeriode as getKPIsPeriode_ext } from 'wasp/src/server/queries'
import { getCriteresParOperation as getCriteresParOperation_ext } from 'wasp/src/server/queries'
import { getHeatmapReponses as getHeatmapReponses_ext } from 'wasp/src/server/queries'
import { getTempsTraitement as getTempsTraitement_ext } from 'wasp/src/server/queries'
import { getRechercheGlobale as getRechercheGlobale_ext } from 'wasp/src/server/queries'
import { getArchives as getArchives_ext } from 'wasp/src/server/queries'
import { getAIStatus as getAIStatus_ext } from 'wasp/src/server/queries'
import { getThemesStats as getThemesStats_ext } from 'wasp/src/server/queries'
import { getPlatformOverview as getPlatformOverview_ext } from 'wasp/src/server/queriesPlatform'
import { getPlatformEntreprises as getPlatformEntreprises_ext } from 'wasp/src/server/queriesPlatform'
import { getPlatformEntreprise as getPlatformEntreprise_ext } from 'wasp/src/server/queriesPlatform'
import { getPlatformAudit as getPlatformAudit_ext } from 'wasp/src/server/queriesPlatform'
import { getPlatformMe as getPlatformMe_ext } from 'wasp/src/server/queriesPlatform'

// PRIVATE API
export type GetAllFilesByUser_ext = typeof getAllFilesByUser_ext

// PUBLIC API
export const getAllFilesByUser: AuthenticatedOperationFor<GetAllFilesByUser_ext> =
  createAuthenticatedOperation(
    getAllFilesByUser_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )


// PRIVATE API
export type GetDownloadFileSignedURL_ext = typeof getDownloadFileSignedURL_ext

// PUBLIC API
export const getDownloadFileSignedURL: AuthenticatedOperationFor<GetDownloadFileSignedURL_ext> =
  createAuthenticatedOperation(
    getDownloadFileSignedURL_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )


// PRIVATE API
export type GetGuichets_ext = typeof getGuichets_ext

// PUBLIC API
export const getGuichets: AuthenticatedOperationFor<GetGuichets_ext> =
  createAuthenticatedOperation(
    getGuichets_ext,
    {
      Guichet: prisma.guichet,
      User: prisma.user,
      Service: prisma.service,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAgents_ext = typeof getAgents_ext

// PUBLIC API
export const getAgents: AuthenticatedOperationFor<GetAgents_ext> =
  createAuthenticatedOperation(
    getAgents_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetReponses_ext = typeof getReponses_ext

// PUBLIC API
export const getReponses: AuthenticatedOperationFor<GetReponses_ext> =
  createAuthenticatedOperation(
    getReponses_ext,
    {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      Guichet: prisma.guichet,
      Service: prisma.service,
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAvisGroupes_ext = typeof getAvisGroupes_ext

// PUBLIC API
export const getAvisGroupes: AuthenticatedOperationFor<GetAvisGroupes_ext> =
  createAuthenticatedOperation(
    getAvisGroupes_ext,
    {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      Guichet: prisma.guichet,
      Service: prisma.service,
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetStatsFiltrees_ext = typeof getStatsFiltrees_ext

// PUBLIC API
export const getStatsFiltrees: AuthenticatedOperationFor<GetStatsFiltrees_ext> =
  createAuthenticatedOperation(
    getStatsFiltrees_ext,
    {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAgentsByAgence_ext = typeof getAgentsByAgence_ext

// PUBLIC API
export const getAgentsByAgence: AuthenticatedOperationFor<GetAgentsByAgence_ext> =
  createAuthenticatedOperation(
    getAgentsByAgence_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAgences_ext = typeof getAgences_ext

// PUBLIC API
export const getAgences: AuthenticatedOperationFor<GetAgences_ext> =
  createAuthenticatedOperation(
    getAgences_ext,
    {
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAlertes_ext = typeof getAlertes_ext

// PUBLIC API
export const getAlertes: AuthenticatedOperationFor<GetAlertes_ext> =
  createAuthenticatedOperation(
    getAlertes_ext,
    {
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetCriteres_ext = typeof getCriteres_ext

// PUBLIC API
export const getCriteres: AuthenticatedOperationFor<GetCriteres_ext> =
  createAuthenticatedOperation(
    getCriteres_ext,
    {
      Critere: prisma.critere,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAgenceCriteres_ext = typeof getAgenceCriteres_ext

// PUBLIC API
export const getAgenceCriteres: AuthenticatedOperationFor<GetAgenceCriteres_ext> =
  createAuthenticatedOperation(
    getAgenceCriteres_ext,
    {
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetFormDefinitionForGuichet_ext = typeof getFormDefinitionForGuichet_ext

// PUBLIC API
export const getFormDefinitionForGuichet: AuthenticatedOperationFor<GetFormDefinitionForGuichet_ext> =
  createAuthenticatedOperation(
    getFormDefinitionForGuichet_ext,
    {
      Guichet: prisma.guichet,
      AgenceCritere: prisma.agenceCritere,
      Critere: prisma.critere,
      Service: prisma.service,
      CritereService: prisma.critereService,
      Entreprise: prisma.entreprise,
      BrandingConfig: prisma.brandingConfig,
    },
  )


// PRIVATE API
export type GetServices_ext = typeof getServices_ext

// PUBLIC API
export const getServices: AuthenticatedOperationFor<GetServices_ext> =
  createAuthenticatedOperation(
    getServices_ext,
    {
      Service: prisma.service,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetRadarStats_ext = typeof getRadarStats_ext

// PUBLIC API
export const getRadarStats: AuthenticatedOperationFor<GetRadarStats_ext> =
  createAuthenticatedOperation(
    getRadarStats_ext,
    {
      User: prisma.user,
      Guichet: prisma.guichet,
      AffectationGuichet: prisma.affectationGuichet,
      Reponse: prisma.reponse,
      Alerte: prisma.alerte,
      TacheCorrective: prisma.tacheCorrective,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetObjectifs_ext = typeof getObjectifs_ext

// PUBLIC API
export const getObjectifs: AuthenticatedOperationFor<GetObjectifs_ext> =
  createAuthenticatedOperation(
    getObjectifs_ext,
    {
      Objectif: prisma.objectif,
      Critere: prisma.critere,
      Agence: prisma.agence,
      User: prisma.user,
      Reponse: prisma.reponse,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetObjectifsParAgence_ext = typeof getObjectifsParAgence_ext

// PUBLIC API
export const getObjectifsParAgence: AuthenticatedOperationFor<GetObjectifsParAgence_ext> =
  createAuthenticatedOperation(
    getObjectifsParAgence_ext,
    {
      Objectif: prisma.objectif,
      Critere: prisma.critere,
      Agence: prisma.agence,
      User: prisma.user,
      Reponse: prisma.reponse,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetTachesCorrectives_ext = typeof getTachesCorrectives_ext

// PUBLIC API
export const getTachesCorrectives: AuthenticatedOperationFor<GetTachesCorrectives_ext> =
  createAuthenticatedOperation(
    getTachesCorrectives_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetTacheHistorique_ext = typeof getTacheHistorique_ext

// PUBLIC API
export const getTacheHistorique: AuthenticatedOperationFor<GetTacheHistorique_ext> =
  createAuthenticatedOperation(
    getTacheHistorique_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type ExportAvisGroupes_ext = typeof exportAvisGroupes_ext

// PUBLIC API
export const exportAvisGroupes: AuthenticatedOperationFor<ExportAvisGroupes_ext> =
  createAuthenticatedOperation(
    exportAvisGroupes_ext,
    {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      Guichet: prisma.guichet,
      Service: prisma.service,
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAffectationsDuJour_ext = typeof getAffectationsDuJour_ext

// PUBLIC API
export const getAffectationsDuJour: AuthenticatedOperationFor<GetAffectationsDuJour_ext> =
  createAuthenticatedOperation(
    getAffectationsDuJour_ext,
    {
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetTendanceMensuelle_ext = typeof getTendanceMensuelle_ext

// PUBLIC API
export const getTendanceMensuelle: AuthenticatedOperationFor<GetTendanceMensuelle_ext> =
  createAuthenticatedOperation(
    getTendanceMensuelle_ext,
    {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetStatsByAgent_ext = typeof getStatsByAgent_ext

// PUBLIC API
export const getStatsByAgent: AuthenticatedOperationFor<GetStatsByAgent_ext> =
  createAuthenticatedOperation(
    getStatsByAgent_ext,
    {
      User: prisma.user,
      Reponse: prisma.reponse,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetStatsByGuichet_ext = typeof getStatsByGuichet_ext

// PUBLIC API
export const getStatsByGuichet: AuthenticatedOperationFor<GetStatsByGuichet_ext> =
  createAuthenticatedOperation(
    getStatsByGuichet_ext,
    {
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetActionsPrioritaires_ext = typeof getActionsPrioritaires_ext

// PUBLIC API
export const getActionsPrioritaires: AuthenticatedOperationFor<GetActionsPrioritaires_ext> =
  createAuthenticatedOperation(
    getActionsPrioritaires_ext,
    {
      Alerte: prisma.alerte,
      TacheCorrective: prisma.tacheCorrective,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetKPIsPeriode_ext = typeof getKPIsPeriode_ext

// PUBLIC API
export const getKPIsPeriode: AuthenticatedOperationFor<GetKPIsPeriode_ext> =
  createAuthenticatedOperation(
    getKPIsPeriode_ext,
    {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetCriteresParOperation_ext = typeof getCriteresParOperation_ext

// PUBLIC API
export const getCriteresParOperation: AuthenticatedOperationFor<GetCriteresParOperation_ext> =
  createAuthenticatedOperation(
    getCriteresParOperation_ext,
    {
      Service: prisma.service,
      Critere: prisma.critere,
      CritereService: prisma.critereService,
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetHeatmapReponses_ext = typeof getHeatmapReponses_ext

// PUBLIC API
export const getHeatmapReponses: AuthenticatedOperationFor<GetHeatmapReponses_ext> =
  createAuthenticatedOperation(
    getHeatmapReponses_ext,
    {
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetTempsTraitement_ext = typeof getTempsTraitement_ext

// PUBLIC API
export const getTempsTraitement: AuthenticatedOperationFor<GetTempsTraitement_ext> =
  createAuthenticatedOperation(
    getTempsTraitement_ext,
    {
      Alerte: prisma.alerte,
      TacheCorrective: prisma.tacheCorrective,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetRechercheGlobale_ext = typeof getRechercheGlobale_ext

// PUBLIC API
export const getRechercheGlobale: AuthenticatedOperationFor<GetRechercheGlobale_ext> =
  createAuthenticatedOperation(
    getRechercheGlobale_ext,
    {
      Agence: prisma.agence,
      Guichet: prisma.guichet,
      User: prisma.user,
      Reponse: prisma.reponse,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetArchives_ext = typeof getArchives_ext

// PUBLIC API
export const getArchives: AuthenticatedOperationFor<GetArchives_ext> =
  createAuthenticatedOperation(
    getArchives_ext,
    {
      Guichet: prisma.guichet,
      Agence: prisma.agence,
      Alerte: prisma.alerte,
      TacheCorrective: prisma.tacheCorrective,
      Reponse: prisma.reponse,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetAIStatus_ext = typeof getAIStatus_ext

// PUBLIC API
export const getAIStatus: AuthenticatedOperationFor<GetAIStatus_ext> =
  createAuthenticatedOperation(
    getAIStatus_ext,
    {
      AnalyseAvisIA: prisma.analyseAvisIA,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetThemesStats_ext = typeof getThemesStats_ext

// PUBLIC API
export const getThemesStats: AuthenticatedOperationFor<GetThemesStats_ext> =
  createAuthenticatedOperation(
    getThemesStats_ext,
    {
      AnalyseAvisIA: prisma.analyseAvisIA,
      Agence: prisma.agence,
      Reponse: prisma.reponse,
      Entreprise: prisma.entreprise,
    },
  )


// PRIVATE API
export type GetPlatformOverview_ext = typeof getPlatformOverview_ext

// PUBLIC API
export const getPlatformOverview: AuthenticatedOperationFor<GetPlatformOverview_ext> =
  createAuthenticatedOperation(
    getPlatformOverview_ext,
    {
      Entreprise: prisma.entreprise,
      User: prisma.user,
      Reponse: prisma.reponse,
    },
  )


// PRIVATE API
export type GetPlatformEntreprises_ext = typeof getPlatformEntreprises_ext

// PUBLIC API
export const getPlatformEntreprises: AuthenticatedOperationFor<GetPlatformEntreprises_ext> =
  createAuthenticatedOperation(
    getPlatformEntreprises_ext,
    {
      Entreprise: prisma.entreprise,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetPlatformEntreprise_ext = typeof getPlatformEntreprise_ext

// PUBLIC API
export const getPlatformEntreprise: AuthenticatedOperationFor<GetPlatformEntreprise_ext> =
  createAuthenticatedOperation(
    getPlatformEntreprise_ext,
    {
      Entreprise: prisma.entreprise,
      User: prisma.user,
      Agence: prisma.agence,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      Invitation: prisma.invitation,
      AuditLog: prisma.auditLog,
    },
  )


// PRIVATE API
export type GetPlatformAudit_ext = typeof getPlatformAudit_ext

// PUBLIC API
export const getPlatformAudit: AuthenticatedOperationFor<GetPlatformAudit_ext> =
  createAuthenticatedOperation(
    getPlatformAudit_ext,
    {
      AuditLog: prisma.auditLog,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetPlatformMe_ext = typeof getPlatformMe_ext

// PUBLIC API
export const getPlatformMe: AuthenticatedOperationFor<GetPlatformMe_ext> =
  createAuthenticatedOperation(
    getPlatformMe_ext,
    {
      User: prisma.user,
    },
  )

