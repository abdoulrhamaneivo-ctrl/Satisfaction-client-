import {
  type _User,
  type _File,
  type _Guichet,
  type _Service,
  type _AffectationGuichet,
  type _Agence,
  type _Reponse,
  type _Critere,
  type _AgenceCritere,
  type _CritereService,
  type _Alerte,
  type _VoteAntiRejeu,
  type _AnalyseAvisIA,
  type _Canal,
  type _Entreprise,
  type _Objectif,
  type _TacheCorrective,
  type _TacheCorrectiveHistorique,
  type _Invitation,
  type _AuditLog,
  type AuthenticatedActionDefinition,
  type Payload,
} from 'wasp/server/_types'

// PUBLIC API
export type UpdateProfile<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ChangePassword<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ChangeEmail<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type AddFileToDb<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _File,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateFileUploadUrl<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _File,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteFile<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _File,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Guichet,
      _User,
      _Service,
      _AffectationGuichet,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type AssignAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AffectationGuichet,
      _Guichet,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateAffectationGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AffectationGuichet,
      _Guichet,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteAffectationGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _AffectationGuichet,
      _Guichet,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type SoumettreAvis<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Reponse,
      _Critere,
      _AgenceCritere,
      _CritereService,
      _Guichet,
      _AffectationGuichet,
      _Alerte,
      _VoteAntiRejeu,
      _Service,
      _User,
      _AnalyseAvisIA,
      _Canal,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Agence,
      _User,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ReactivateAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type PromouvoirAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type InviteAgent<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Agence,
      _Entreprise,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ToggleCritereAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _AgenceCritere,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _AgenceCritere,
      _User,
      _Agence,
      _Service,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateService<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Service,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpsertObjectif<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Objectif,
      _Agence,
      _Critere,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteObjectif<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Objectif,
      _Agence,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateTacheCorrective<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _TacheCorrective,
      _TacheCorrectiveHistorique,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateStatutTache<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _TacheCorrective,
      _TacheCorrectiveHistorique,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type MarquerAlerteTraitee<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateGuichetServices<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Guichet,
      _Service,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type MoveCritereToService<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _CritereService,
      _Critere,
      _Service,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type RemoveCritereFromService<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _CritereService,
      _Critere,
      _Service,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _Reponse,
      _AgenceCritere,
      _CritereService,
      _Objectif,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DuplicateCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _AgenceCritere,
      _CritereService,
      _Agence,
      _Service,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ReorderCriteresInService<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _CritereService,
      _Service,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ArchiverGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Guichet,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesarchiverGuichet<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Guichet,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ArchiverAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Agence,
      _Guichet,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesarchiverAgence<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Agence,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ArchiverAlerte<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesarchiverAlerte<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ArchiverTache<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _TacheCorrective,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesarchiverTache<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _TacheCorrective,
      _Alerte,
      _Guichet,
      _Reponse,
      _User,
      _Agence,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ArchiverCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesarchiverCritere<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Critere,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreerEntreprise<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Entreprise,
      _User,
      _Invitation,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type SuspendreEntreprise<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Entreprise,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ReactiverEntreprise<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Entreprise,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ChangerLimitesEntreprise<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Entreprise,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type RenvoyerInvitation<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Entreprise,
      _User,
      _Invitation,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type InviterSuperAdmin<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _Invitation,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ActiverCompte<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Invitation,
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type ChangerPlatformRole<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DesactiverComptePlatform<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type Setup2fa<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type Activer2fa<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

// PUBLIC API
export type Verifier2fa<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _User,
      _AuditLog,
    ],
    Input,
    Output
  >

