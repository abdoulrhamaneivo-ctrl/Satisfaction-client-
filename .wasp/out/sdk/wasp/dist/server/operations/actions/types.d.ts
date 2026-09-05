import { type _User, type _File, type _Guichet, type _Service, type _AffectationGuichet, type _Agence, type _Reponse, type _Critere, type _AgenceCritere, type _CritereService, type _Alerte, type _VoteAntiRejeu, type _AnalyseAvisIA, type _Canal, type _Entreprise, type _Invitation, type _AuditLog, type _Objectif, type _TacheCorrective, type _TacheCorrectiveHistorique, type AuthenticatedActionDefinition, type Payload } from 'wasp/server/_types';
export type UpdateProfile<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type ChangePassword<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type ChangeEmail<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type AddFileToDb<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type CreateFileUploadUrl<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type DeleteFile<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type CreateGuichet<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Guichet,
    _User,
    _Service,
    _AffectationGuichet,
    _Agence
], Input, Output>;
export type AssignAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AffectationGuichet,
    _Guichet,
    _Agence
], Input, Output>;
export type UpdateAffectationGuichet<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AffectationGuichet,
    _Guichet,
    _Agence
], Input, Output>;
export type DeleteAffectationGuichet<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _AffectationGuichet,
    _Guichet,
    _Agence
], Input, Output>;
export type SoumettreAvis<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
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
    _Canal
], Input, Output>;
export type CreateAgence<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Agence,
    _User,
    _Entreprise
], Input, Output>;
export type UpdateAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence
], Input, Output>;
export type DeleteAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence
], Input, Output>;
export type ReactivateAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence
], Input, Output>;
export type PromouvoirAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence
], Input, Output>;
export type InviteAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence,
    _Entreprise,
    _Invitation
], Input, Output>;
export type RenvoyerInvitationAgent<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Agence,
    _Invitation,
    _AuditLog
], Input, Output>;
export type ToggleCritereAgence<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _AgenceCritere,
    _User,
    _Agence
], Input, Output>;
export type CreateCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _AgenceCritere,
    _User,
    _Agence,
    _Service
], Input, Output>;
export type CreateService<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Service,
    _User
], Input, Output>;
export type UpsertObjectif<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Objectif,
    _Agence,
    _Critere,
    _User
], Input, Output>;
export type DeleteObjectif<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Objectif,
    _Agence,
    _User
], Input, Output>;
export type CreateTacheCorrective<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _TacheCorrective,
    _TacheCorrectiveHistorique,
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type UpdateStatutTache<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _TacheCorrective,
    _TacheCorrectiveHistorique,
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type MarquerAlerteTraitee<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type UpdateGuichetServices<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Guichet,
    _Service,
    _User,
    _Agence
], Input, Output>;
export type MoveCritereToService<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _CritereService,
    _Critere,
    _Service,
    _User
], Input, Output>;
export type RemoveCritereFromService<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _CritereService,
    _Critere,
    _Service,
    _User
], Input, Output>;
export type DeleteCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _Reponse,
    _AgenceCritere,
    _CritereService,
    _Objectif,
    _User
], Input, Output>;
export type DuplicateCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _AgenceCritere,
    _CritereService,
    _Agence,
    _Service,
    _User
], Input, Output>;
export type UpdateCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _User
], Input, Output>;
export type ReorderCriteresInService<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _CritereService,
    _Service,
    _User
], Input, Output>;
export type ArchiverGuichet<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Guichet,
    _User,
    _Agence
], Input, Output>;
export type DesarchiverGuichet<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Guichet,
    _User,
    _Agence
], Input, Output>;
export type ArchiverAgence<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Agence,
    _Guichet,
    _User
], Input, Output>;
export type DesarchiverAgence<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Agence,
    _User
], Input, Output>;
export type ArchiverAlerte<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type DesarchiverAlerte<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type ArchiverTache<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _TacheCorrective,
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type DesarchiverTache<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _TacheCorrective,
    _Alerte,
    _Guichet,
    _Reponse,
    _User,
    _Agence
], Input, Output>;
export type ArchiverCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _User
], Input, Output>;
export type DesarchiverCritere<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Critere,
    _User
], Input, Output>;
export type CreerEntreprise<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Entreprise,
    _User,
    _Invitation,
    _AuditLog
], Input, Output>;
export type SuspendreEntreprise<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Entreprise,
    _AuditLog
], Input, Output>;
export type ReactiverEntreprise<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Entreprise,
    _AuditLog
], Input, Output>;
export type ChangerLimitesEntreprise<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Entreprise,
    _AuditLog
], Input, Output>;
export type RenvoyerInvitation<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Entreprise,
    _User,
    _Invitation,
    _AuditLog
], Input, Output>;
export type InviterSuperAdmin<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Invitation,
    _AuditLog
], Input, Output>;
export type ActiverCompte<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Invitation,
    _User,
    _AuditLog
], Input, Output>;
export type ChangerPlatformRole<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AuditLog
], Input, Output>;
export type DesactiverComptePlatform<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AuditLog
], Input, Output>;
export type Setup2fa<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AuditLog
], Input, Output>;
export type Activer2fa<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AuditLog
], Input, Output>;
export type Verifier2fa<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _AuditLog
], Input, Output>;
//# sourceMappingURL=types.d.ts.map