
import {
  type _User,
  type _File,
  type _Guichet,
  type _Service,
  type _Agence,
  type _Entreprise,
  type _Reponse,
  type _Critere,
  type _Alerte,
  type _AgenceCritere,
  type _CritereService,
  type _BrandingConfig,
  type _AffectationGuichet,
  type _TacheCorrective,
  type _Objectif,
  type _TacheCorrectiveHistorique,
  type _AnalyseAvisIA,
  type _Invitation,
  type _AuditLog,
  type AuthenticatedQueryDefinition,
  type Payload,
} from 'wasp/server/_types'

// PUBLIC API
export type GetAllFilesByUser<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _File,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetDownloadFileSignedURL<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _File,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetGuichets<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Guichet,
      _User,
      _Service,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAgents<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetReponses<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _Critere,
      _Guichet,
      _Service,
      _Agence,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAvisGroupes<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _Critere,
      _Guichet,
      _Service,
      _Agence,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetStatsFiltrees<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAgentsByAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAgences<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Agence,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAlertes<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetCriteres<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Critere,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAgenceCriteres<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _AgenceCritere,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetFormDefinitionForGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Guichet,
      _AgenceCritere,
      _Critere,
      _Service,
      _CritereService,
      _Entreprise,
      _BrandingConfig,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetServices<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Service,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetRadarStats<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _Guichet,
      _AffectationGuichet,
      _Reponse,
      _Alerte,
      _TacheCorrective,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetObjectifs<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Objectif,
      _Critere,
      _Agence,
      _User,
      _Reponse,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetObjectifsParAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Objectif,
      _Critere,
      _Agence,
      _User,
      _Reponse,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTachesCorrectives<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _TacheCorrective,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTacheHistorique<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _TacheCorrective,
      _TacheCorrectiveHistorique,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ExportAvisGroupes<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _Critere,
      _Guichet,
      _Service,
      _Agence,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAffectationsDuJour<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _AffectationGuichet,
      _Guichet,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTendanceMensuelle<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetStatsByAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
      _Reponse,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetStatsByGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Guichet,
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetActionsPrioritaires<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Alerte,
      _TacheCorrective,
      _Guichet,
      _Reponse,
      _Critere,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetKPIsPeriode<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetCriteresParOperation<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Service,
      _Critere,
      _CritereService,
      _AgenceCritere,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetHeatmapReponses<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTempsTraitement<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Alerte,
      _TacheCorrective,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetRechercheGlobale<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Agence,
      _Guichet,
      _User,
      _Reponse,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetArchives<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Guichet,
      _Agence,
      _Alerte,
      _TacheCorrective,
      _Reponse,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAIStatus<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _AnalyseAvisIA,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetThemesStats<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _AnalyseAvisIA,
      _Agence,
      _Reponse,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetPlatformOverview<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Entreprise,
      _User,
      _Reponse,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetPlatformEntreprises<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Entreprise,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetPlatformEntreprise<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Entreprise,
      _User,
      _Agence,
      _Guichet,
      _Reponse,
      _Invitation,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetPlatformAudit<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _AuditLog,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetPlatformMe<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
    ],
    Input,
    Output
  >

