import { createQuery } from './core';
// PUBLIC API
export const getAllFilesByUser = createQuery('operations/get-all-files-by-user', ['User', 'File']);
// PUBLIC API
export const getDownloadFileSignedURL = createQuery('operations/get-download-file-signed-url', ['User', 'File']);
// PUBLIC API
export const getGuichets = createQuery('operations/get-guichets', ['Guichet', 'User', 'Service', 'Agence', 'Entreprise']);
// PUBLIC API
export const getAgents = createQuery('operations/get-agents', ['User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getReponses = createQuery('operations/get-reponses', ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise']);
// PUBLIC API
export const getAvisGroupes = createQuery('operations/get-avis-groupes', ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise']);
// PUBLIC API
export const getStatsFiltrees = createQuery('operations/get-stats-filtrees', ['Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getAgentsByAgence = createQuery('operations/get-agents-by-agence', ['User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getAgences = createQuery('operations/get-agences', ['Agence', 'User', 'Entreprise']);
// PUBLIC API
export const getAlertes = createQuery('operations/get-alertes', ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getCriteres = createQuery('operations/get-criteres', ['Critere', 'User', 'Entreprise']);
// PUBLIC API
export const getAgenceCriteres = createQuery('operations/get-agence-criteres', ['AgenceCritere', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getFormDefinitionForGuichet = createQuery('operations/get-form-definition-for-guichet', ['Guichet', 'AgenceCritere', 'Critere', 'Service', 'CritereService', 'Entreprise', 'BrandingConfig']);
// PUBLIC API
export const getServices = createQuery('operations/get-services', ['Service', 'User', 'Entreprise']);
// PUBLIC API
export const getBranding = createQuery('operations/get-branding', ['BrandingConfig', 'User', 'Entreprise']);
// PUBLIC API
export const getRadarStats = createQuery('operations/get-radar-stats', ['User', 'Guichet', 'AffectationGuichet', 'Reponse', 'Alerte', 'TacheCorrective', 'Agence', 'Entreprise']);
// PUBLIC API
export const getObjectifs = createQuery('operations/get-objectifs', ['Objectif', 'Critere', 'Agence', 'User', 'Reponse', 'Entreprise']);
// PUBLIC API
export const getObjectifsParAgence = createQuery('operations/get-objectifs-par-agence', ['Objectif', 'Critere', 'Agence', 'User', 'Reponse', 'Entreprise']);
// PUBLIC API
export const getTachesCorrectives = createQuery('operations/get-taches-correctives', ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getTacheHistorique = createQuery('operations/get-tache-historique', ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const exportAvisGroupes = createQuery('operations/export-avis-groupes', ['Reponse', 'Critere', 'Guichet', 'Service', 'Agence', 'User', 'Entreprise']);
// PUBLIC API
export const getAffectationsDuJour = createQuery('operations/get-affectations-du-jour', ['AffectationGuichet', 'Guichet', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getTendanceMensuelle = createQuery('operations/get-tendance-mensuelle', ['Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getStatsByAgent = createQuery('operations/get-stats-by-agent', ['User', 'Reponse', 'Agence', 'Entreprise']);
// PUBLIC API
export const getStatsByGuichet = createQuery('operations/get-stats-by-guichet', ['Guichet', 'Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getActionsPrioritaires = createQuery('operations/get-actions-prioritaires', ['Alerte', 'TacheCorrective', 'Guichet', 'Reponse', 'Critere', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getKPIsPeriode = createQuery('operations/get-kpis-periode', ['Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getCriteresParOperation = createQuery('operations/get-criteres-par-operation', ['Service', 'Critere', 'CritereService', 'AgenceCritere', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getHeatmapReponses = createQuery('operations/get-heatmap-reponses', ['Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getComparaisonAgences = createQuery('operations/get-comparaison-agences', ['Agence', 'Reponse', 'User', 'Entreprise']);
// PUBLIC API
export const getTempsTraitement = createQuery('operations/get-temps-traitement', ['Alerte', 'TacheCorrective', 'Guichet', 'Reponse', 'User', 'Agence', 'Entreprise']);
// PUBLIC API
export const getRechercheGlobale = createQuery('operations/get-recherche-globale', ['Agence', 'Guichet', 'User', 'Reponse', 'Entreprise']);
// PUBLIC API
export const getArchives = createQuery('operations/get-archives', ['Guichet', 'Agence', 'Alerte', 'TacheCorrective', 'Reponse', 'User', 'Entreprise']);
// PUBLIC API
export const getAIStatus = createQuery('operations/get-aistatus', ['AnalyseAvisIA', 'Entreprise']);
// PUBLIC API
export const getThemesStats = createQuery('operations/get-themes-stats', ['AnalyseAvisIA', 'Agence', 'Reponse', 'Entreprise']);
// PUBLIC API
export const getPlatformOverview = createQuery('operations/get-platform-overview', ['Entreprise', 'User', 'Reponse']);
// PUBLIC API
export const getPlatformEntreprises = createQuery('operations/get-platform-entreprises', ['Entreprise', 'User']);
// PUBLIC API
export const getPlatformEntreprise = createQuery('operations/get-platform-entreprise', ['Entreprise', 'User', 'Agence', 'Guichet', 'Reponse', 'Invitation', 'AuditLog']);
// PUBLIC API
export const getPlatformAudit = createQuery('operations/get-platform-audit', ['AuditLog', 'User']);
// PUBLIC API
export const getPlatformMe = createQuery('operations/get-platform-me', ['User']);
// PRIVATE API (used in SDK)
export { buildAndRegisterQuery } from './core';
//# sourceMappingURL=index.js.map