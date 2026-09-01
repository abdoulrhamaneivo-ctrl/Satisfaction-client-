import { type QueryFor, createQuery } from './core'
import { GetAllFilesByUser_ext } from 'wasp/server/operations/queries'
import { GetDownloadFileSignedURL_ext } from 'wasp/server/operations/queries'
import { GetGuichets_ext } from 'wasp/server/operations/queries'
import { GetAgents_ext } from 'wasp/server/operations/queries'
import { GetReponses_ext } from 'wasp/server/operations/queries'
import { GetAvisGroupes_ext } from 'wasp/server/operations/queries'
import { GetStatsFiltrees_ext } from 'wasp/server/operations/queries'
import { GetAgentsByAgence_ext } from 'wasp/server/operations/queries'
import { GetAgences_ext } from 'wasp/server/operations/queries'
import { GetAlertes_ext } from 'wasp/server/operations/queries'
import { GetCriteres_ext } from 'wasp/server/operations/queries'
import { GetAgenceCriteres_ext } from 'wasp/server/operations/queries'
import { GetFormDefinitionForGuichet_ext } from 'wasp/server/operations/queries'
import { GetServices_ext } from 'wasp/server/operations/queries'
import { GetRadarStats_ext } from 'wasp/server/operations/queries'
import { GetObjectifs_ext } from 'wasp/server/operations/queries'
import { GetObjectifsParAgence_ext } from 'wasp/server/operations/queries'
import { GetTachesCorrectives_ext } from 'wasp/server/operations/queries'
import { GetTacheHistorique_ext } from 'wasp/server/operations/queries'
import { ExportAvisGroupes_ext } from 'wasp/server/operations/queries'
import { GetAffectationsDuJour_ext } from 'wasp/server/operations/queries'
import { GetTendanceMensuelle_ext } from 'wasp/server/operations/queries'
import { GetStatsByAgent_ext } from 'wasp/server/operations/queries'
import { GetStatsByGuichet_ext } from 'wasp/server/operations/queries'
import { GetActionsPrioritaires_ext } from 'wasp/server/operations/queries'
import { GetKPIsPeriode_ext } from 'wasp/server/operations/queries'
import { GetCriteresParOperation_ext } from 'wasp/server/operations/queries'
import { GetHeatmapReponses_ext } from 'wasp/server/operations/queries'
import { GetTempsTraitement_ext } from 'wasp/server/operations/queries'
import { GetRechercheGlobale_ext } from 'wasp/server/operations/queries'
import { GetArchives_ext } from 'wasp/server/operations/queries'
import { GetAIStatus_ext } from 'wasp/server/operations/queries'
import { GetThemesStats_ext } from 'wasp/server/operations/queries'
import { GetPlatformOverview_ext } from 'wasp/server/operations/queries'
import { GetPlatformEntreprises_ext } from 'wasp/server/operations/queries'
import { GetPlatformEntreprise_ext } from 'wasp/server/operations/queries'
import { GetPlatformAudit_ext } from 'wasp/server/operations/queries'
import { GetPlatformMe_ext } from 'wasp/server/operations/queries'

// PUBLIC API
export const getAllFilesByUser: QueryFor<GetAllFilesByUser_ext> = createQuery<GetAllFilesByUser_ext>(
  'operations/get-all-files-by-user',
  ['User', 'File'],
)

// PUBLIC API
export const getDownloadFileSignedURL: QueryFor<GetDownloadFileSignedURL_ext> = createQuery<GetDownloadFileSignedURL_ext>(
  'operations/get-download-file-signed-url',
  ['User', 'File'],
)

// PUBLIC API
export const getGuichets: QueryFor<GetGuichets_ext> = createQuery<GetGuichets_ext>(
  'operations/get-guichets',
  ['Guichet', 'User', 'Service', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getAgents: QueryFor<GetAgents_ext> = createQuery<GetAgents_ext>(
  'operations/get-agents',
  ['User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getReponses: QueryFor<GetReponses_ext> = createQuery<GetReponses_ext>(
  'operations/get-reponses',
  ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise'],
)

// PUBLIC API
export const getAvisGroupes: QueryFor<GetAvisGroupes_ext> = createQuery<GetAvisGroupes_ext>(
  'operations/get-avis-groupes',
  ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise'],
)

// PUBLIC API
export const getStatsFiltrees: QueryFor<GetStatsFiltrees_ext> = createQuery<GetStatsFiltrees_ext>(
  'operations/get-stats-filtrees',
  ['Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getAgentsByAgence: QueryFor<GetAgentsByAgence_ext> = createQuery<GetAgentsByAgence_ext>(
  'operations/get-agents-by-agence',
  ['User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getAgences: QueryFor<GetAgences_ext> = createQuery<GetAgences_ext>(
  'operations/get-agences',
  ['Agence', 'User', 'Entreprise'],
)

// PUBLIC API
export const getAlertes: QueryFor<GetAlertes_ext> = createQuery<GetAlertes_ext>(
  'operations/get-alertes',
  ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getCriteres: QueryFor<GetCriteres_ext> = createQuery<GetCriteres_ext>(
  'operations/get-criteres',
  ['Critere', 'User', 'Entreprise'],
)

// PUBLIC API
export const getAgenceCriteres: QueryFor<GetAgenceCriteres_ext> = createQuery<GetAgenceCriteres_ext>(
  'operations/get-agence-criteres',
  ['AgenceCritere', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getFormDefinitionForGuichet: QueryFor<GetFormDefinitionForGuichet_ext> = createQuery<GetFormDefinitionForGuichet_ext>(
  'operations/get-form-definition-for-guichet',
  ['Guichet', 'AgenceCritere', 'Critere', 'Service', 'CritereService', 'Entreprise', 'BrandingConfig'],
)

// PUBLIC API
export const getServices: QueryFor<GetServices_ext> = createQuery<GetServices_ext>(
  'operations/get-services',
  ['Service', 'User', 'Entreprise'],
)

// PUBLIC API
export const getRadarStats: QueryFor<GetRadarStats_ext> = createQuery<GetRadarStats_ext>(
  'operations/get-radar-stats',
  ['User', 'Guichet', 'AffectationGuichet', 'Reponse', 'Alerte', 'TacheCorrective', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getObjectifs: QueryFor<GetObjectifs_ext> = createQuery<GetObjectifs_ext>(
  'operations/get-objectifs',
  ['Objectif', 'Critere', 'Agence', 'User', 'Reponse', 'Entreprise'],
)

// PUBLIC API
export const getObjectifsParAgence: QueryFor<GetObjectifsParAgence_ext> = createQuery<GetObjectifsParAgence_ext>(
  'operations/get-objectifs-par-agence',
  ['Objectif', 'Critere', 'Agence', 'User', 'Reponse', 'Entreprise'],
)

// PUBLIC API
export const getTachesCorrectives: QueryFor<GetTachesCorrectives_ext> = createQuery<GetTachesCorrectives_ext>(
  'operations/get-taches-correctives',
  ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getTacheHistorique: QueryFor<GetTacheHistorique_ext> = createQuery<GetTacheHistorique_ext>(
  'operations/get-tache-historique',
  ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const exportAvisGroupes: QueryFor<ExportAvisGroupes_ext> = createQuery<ExportAvisGroupes_ext>(
  'operations/export-avis-groupes',
  ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise'],
)

// PUBLIC API
export const getAffectationsDuJour: QueryFor<GetAffectationsDuJour_ext> = createQuery<GetAffectationsDuJour_ext>(
  'operations/get-affectations-du-jour',
  ['AffectationGuichet', 'Guichet', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getTendanceMensuelle: QueryFor<GetTendanceMensuelle_ext> = createQuery<GetTendanceMensuelle_ext>(
  'operations/get-tendance-mensuelle',
  ['Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getStatsByAgent: QueryFor<GetStatsByAgent_ext> = createQuery<GetStatsByAgent_ext>(
  'operations/get-stats-by-agent',
  ['User', 'Reponse', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getStatsByGuichet: QueryFor<GetStatsByGuichet_ext> = createQuery<GetStatsByGuichet_ext>(
  'operations/get-stats-by-guichet',
  ['Guichet', 'Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getActionsPrioritaires: QueryFor<GetActionsPrioritaires_ext> = createQuery<GetActionsPrioritaires_ext>(
  'operations/get-actions-prioritaires',
  ['Alerte', 'TacheCorrective', 'Guichet', 'Reponse', 'Critere', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getKPIsPeriode: QueryFor<GetKPIsPeriode_ext> = createQuery<GetKPIsPeriode_ext>(
  'operations/get-kpis-periode',
  ['Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getCriteresParOperation: QueryFor<GetCriteresParOperation_ext> = createQuery<GetCriteresParOperation_ext>(
  'operations/get-criteres-par-operation',
  ['Service', 'Critere', 'CritereService', 'AgenceCritere', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getHeatmapReponses: QueryFor<GetHeatmapReponses_ext> = createQuery<GetHeatmapReponses_ext>(
  'operations/get-heatmap-reponses',
  ['Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getTempsTraitement: QueryFor<GetTempsTraitement_ext> = createQuery<GetTempsTraitement_ext>(
  'operations/get-temps-traitement',
  ['Alerte', 'TacheCorrective', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise'],
)

// PUBLIC API
export const getRechercheGlobale: QueryFor<GetRechercheGlobale_ext> = createQuery<GetRechercheGlobale_ext>(
  'operations/get-recherche-globale',
  ['Agence', 'Guichet', 'User', 'Reponse', 'Entreprise'],
)

// PUBLIC API
export const getArchives: QueryFor<GetArchives_ext> = createQuery<GetArchives_ext>(
  'operations/get-archives',
  ['Guichet', 'Agence', 'Alerte', 'TacheCorrective', 'Reponse', 'User', 'Entreprise'],
)

// PUBLIC API
export const getAIStatus: QueryFor<GetAIStatus_ext> = createQuery<GetAIStatus_ext>(
  'operations/get-aistatus',
  ['AnalyseAvisIA', 'Entreprise'],
)

// PUBLIC API
export const getThemesStats: QueryFor<GetThemesStats_ext> = createQuery<GetThemesStats_ext>(
  'operations/get-themes-stats',
  ['AnalyseAvisIA', 'Agence', 'Reponse', 'Entreprise'],
)

// PUBLIC API
export const getPlatformOverview: QueryFor<GetPlatformOverview_ext> = createQuery<GetPlatformOverview_ext>(
  'operations/get-platform-overview',
  ['Entreprise', 'User', 'Reponse'],
)

// PUBLIC API
export const getPlatformEntreprises: QueryFor<GetPlatformEntreprises_ext> = createQuery<GetPlatformEntreprises_ext>(
  'operations/get-platform-entreprises',
  ['Entreprise', 'User'],
)

// PUBLIC API
export const getPlatformEntreprise: QueryFor<GetPlatformEntreprise_ext> = createQuery<GetPlatformEntreprise_ext>(
  'operations/get-platform-entreprise',
  ['Entreprise', 'User', 'Agence', 'Guichet', 'Reponse', 'Invitation', 'AuditLog'],
)

// PUBLIC API
export const getPlatformAudit: QueryFor<GetPlatformAudit_ext> = createQuery<GetPlatformAudit_ext>(
  'operations/get-platform-audit',
  ['AuditLog', 'User'],
)

// PUBLIC API
export const getPlatformMe: QueryFor<GetPlatformMe_ext> = createQuery<GetPlatformMe_ext>(
  'operations/get-platform-me',
  ['User'],
)

// PRIVATE API (used in SDK)
export { buildAndRegisterQuery } from './core'
