import { type ActionFor, createAction } from './core'
import { UpdateProfile_ext } from 'wasp/server/operations/actions'
import { ChangePassword_ext } from 'wasp/server/operations/actions'
import { ChangeEmail_ext } from 'wasp/server/operations/actions'
import { AddFileToDb_ext } from 'wasp/server/operations/actions'
import { CreateFileUploadUrl_ext } from 'wasp/server/operations/actions'
import { DeleteFile_ext } from 'wasp/server/operations/actions'
import { CreateGuichet_ext } from 'wasp/server/operations/actions'
import { AssignAgent_ext } from 'wasp/server/operations/actions'
import { UpdateAffectationGuichet_ext } from 'wasp/server/operations/actions'
import { DeleteAffectationGuichet_ext } from 'wasp/server/operations/actions'
import { SoumettreAvis_ext } from 'wasp/server/operations/actions'
import { CreateAgence_ext } from 'wasp/server/operations/actions'
import { UpdateAgent_ext } from 'wasp/server/operations/actions'
import { DeleteAgent_ext } from 'wasp/server/operations/actions'
import { ReactivateAgent_ext } from 'wasp/server/operations/actions'
import { PromouvoirAgent_ext } from 'wasp/server/operations/actions'
import { InviteAgent_ext } from 'wasp/server/operations/actions'
import { RenvoyerInvitationAgent_ext } from 'wasp/server/operations/actions'
import { ToggleCritereAgence_ext } from 'wasp/server/operations/actions'
import { CreateCritere_ext } from 'wasp/server/operations/actions'
import { CreateService_ext } from 'wasp/server/operations/actions'
import { UpsertObjectif_ext } from 'wasp/server/operations/actions'
import { DeleteObjectif_ext } from 'wasp/server/operations/actions'
import { CreateTacheCorrective_ext } from 'wasp/server/operations/actions'
import { UpdateStatutTache_ext } from 'wasp/server/operations/actions'
import { MarquerAlerteTraitee_ext } from 'wasp/server/operations/actions'
import { UpdateGuichetServices_ext } from 'wasp/server/operations/actions'
import { MoveCritereToService_ext } from 'wasp/server/operations/actions'
import { RemoveCritereFromService_ext } from 'wasp/server/operations/actions'
import { DeleteCritere_ext } from 'wasp/server/operations/actions'
import { DuplicateCritere_ext } from 'wasp/server/operations/actions'
import { UpdateCritere_ext } from 'wasp/server/operations/actions'
import { ReorderCriteresInService_ext } from 'wasp/server/operations/actions'
import { ArchiverGuichet_ext } from 'wasp/server/operations/actions'
import { DesarchiverGuichet_ext } from 'wasp/server/operations/actions'
import { ArchiverAgence_ext } from 'wasp/server/operations/actions'
import { DesarchiverAgence_ext } from 'wasp/server/operations/actions'
import { ArchiverAlerte_ext } from 'wasp/server/operations/actions'
import { DesarchiverAlerte_ext } from 'wasp/server/operations/actions'
import { ArchiverTache_ext } from 'wasp/server/operations/actions'
import { DesarchiverTache_ext } from 'wasp/server/operations/actions'
import { ArchiverCritere_ext } from 'wasp/server/operations/actions'
import { DesarchiverCritere_ext } from 'wasp/server/operations/actions'
import { CreerEntreprise_ext } from 'wasp/server/operations/actions'
import { SuspendreEntreprise_ext } from 'wasp/server/operations/actions'
import { ReactiverEntreprise_ext } from 'wasp/server/operations/actions'
import { ChangerLimitesEntreprise_ext } from 'wasp/server/operations/actions'
import { RenvoyerInvitation_ext } from 'wasp/server/operations/actions'
import { InviterSuperAdmin_ext } from 'wasp/server/operations/actions'
import { ActiverCompte_ext } from 'wasp/server/operations/actions'
import { ChangerPlatformRole_ext } from 'wasp/server/operations/actions'
import { DesactiverComptePlatform_ext } from 'wasp/server/operations/actions'
import { Setup2fa_ext } from 'wasp/server/operations/actions'
import { Activer2fa_ext } from 'wasp/server/operations/actions'
import { Verifier2fa_ext } from 'wasp/server/operations/actions'

// PUBLIC API
export const updateProfile: ActionFor<UpdateProfile_ext> = createAction<UpdateProfile_ext>(
  'operations/update-profile',
  ['User'],
)

// PUBLIC API
export const changePassword: ActionFor<ChangePassword_ext> = createAction<ChangePassword_ext>(
  'operations/change-password',
  ['User'],
)

// PUBLIC API
export const changeEmail: ActionFor<ChangeEmail_ext> = createAction<ChangeEmail_ext>(
  'operations/change-email',
  ['User'],
)

// PUBLIC API
export const addFileToDb: ActionFor<AddFileToDb_ext> = createAction<AddFileToDb_ext>(
  'operations/add-file-to-db',
  ['User', 'File'],
)

// PUBLIC API
export const createFileUploadUrl: ActionFor<CreateFileUploadUrl_ext> = createAction<CreateFileUploadUrl_ext>(
  'operations/create-file-upload-url',
  ['User', 'File'],
)

// PUBLIC API
export const deleteFile: ActionFor<DeleteFile_ext> = createAction<DeleteFile_ext>(
  'operations/delete-file',
  ['User', 'File'],
)

// PUBLIC API
export const createGuichet: ActionFor<CreateGuichet_ext> = createAction<CreateGuichet_ext>(
  'operations/create-guichet',
  ['Guichet', 'User', 'Service', 'AffectationGuichet', 'Agence'],
)

// PUBLIC API
export const assignAgent: ActionFor<AssignAgent_ext> = createAction<AssignAgent_ext>(
  'operations/assign-agent',
  ['User', 'AffectationGuichet', 'Guichet', 'Agence'],
)

// PUBLIC API
export const updateAffectationGuichet: ActionFor<UpdateAffectationGuichet_ext> = createAction<UpdateAffectationGuichet_ext>(
  'operations/update-affectation-guichet',
  ['User', 'AffectationGuichet', 'Guichet', 'Agence'],
)

// PUBLIC API
export const deleteAffectationGuichet: ActionFor<DeleteAffectationGuichet_ext> = createAction<DeleteAffectationGuichet_ext>(
  'operations/delete-affectation-guichet',
  ['AffectationGuichet', 'Guichet', 'Agence'],
)

// PUBLIC API
export const soumettreAvis: ActionFor<SoumettreAvis_ext> = createAction<SoumettreAvis_ext>(
  'operations/soumettre-avis',
  ['Reponse', 'Critere', 'AgenceCritere', 'CritereService', 'Guichet', 'AffectationGuichet', 'Alerte', 'VoteAntiRejeu', 'Service', 'User', 'AnalyseAvisIA', 'Canal'],
)

// PUBLIC API
export const createAgence: ActionFor<CreateAgence_ext> = createAction<CreateAgence_ext>(
  'operations/create-agence',
  ['Agence', 'User', 'Entreprise'],
)

// PUBLIC API
export const updateAgent: ActionFor<UpdateAgent_ext> = createAction<UpdateAgent_ext>(
  'operations/update-agent',
  ['User', 'Agence'],
)

// PUBLIC API
export const deleteAgent: ActionFor<DeleteAgent_ext> = createAction<DeleteAgent_ext>(
  'operations/delete-agent',
  ['User', 'Agence'],
)

// PUBLIC API
export const reactivateAgent: ActionFor<ReactivateAgent_ext> = createAction<ReactivateAgent_ext>(
  'operations/reactivate-agent',
  ['User', 'Agence'],
)

// PUBLIC API
export const promouvoirAgent: ActionFor<PromouvoirAgent_ext> = createAction<PromouvoirAgent_ext>(
  'operations/promouvoir-agent',
  ['User', 'Agence'],
)

// PUBLIC API
export const inviteAgent: ActionFor<InviteAgent_ext> = createAction<InviteAgent_ext>(
  'operations/invite-agent',
  ['User', 'Agence', 'Entreprise', 'Invitation'],
)

// PUBLIC API
export const renvoyerInvitationAgent: ActionFor<RenvoyerInvitationAgent_ext> = createAction<RenvoyerInvitationAgent_ext>(
  'operations/renvoyer-invitation-agent',
  ['User', 'Agence', 'Invitation', 'AuditLog'],
)

// PUBLIC API
export const toggleCritereAgence: ActionFor<ToggleCritereAgence_ext> = createAction<ToggleCritereAgence_ext>(
  'operations/toggle-critere-agence',
  ['AgenceCritere', 'User', 'Agence'],
)

// PUBLIC API
export const createCritere: ActionFor<CreateCritere_ext> = createAction<CreateCritere_ext>(
  'operations/create-critere',
  ['Critere', 'AgenceCritere', 'User', 'Agence', 'Service'],
)

// PUBLIC API
export const createService: ActionFor<CreateService_ext> = createAction<CreateService_ext>(
  'operations/create-service',
  ['Service', 'User'],
)

// PUBLIC API
export const upsertObjectif: ActionFor<UpsertObjectif_ext> = createAction<UpsertObjectif_ext>(
  'operations/upsert-objectif',
  ['Objectif', 'Agence', 'Critere', 'User'],
)

// PUBLIC API
export const deleteObjectif: ActionFor<DeleteObjectif_ext> = createAction<DeleteObjectif_ext>(
  'operations/delete-objectif',
  ['Objectif', 'Agence', 'User'],
)

// PUBLIC API
export const createTacheCorrective: ActionFor<CreateTacheCorrective_ext> = createAction<CreateTacheCorrective_ext>(
  'operations/create-tache-corrective',
  ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const updateStatutTache: ActionFor<UpdateStatutTache_ext> = createAction<UpdateStatutTache_ext>(
  'operations/update-statut-tache',
  ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const marquerAlerteTraitee: ActionFor<MarquerAlerteTraitee_ext> = createAction<MarquerAlerteTraitee_ext>(
  'operations/marquer-alerte-traitee',
  ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const updateGuichetServices: ActionFor<UpdateGuichetServices_ext> = createAction<UpdateGuichetServices_ext>(
  'operations/update-guichet-services',
  ['Guichet', 'Service', 'User', 'Agence'],
)

// PUBLIC API
export const moveCritereToService: ActionFor<MoveCritereToService_ext> = createAction<MoveCritereToService_ext>(
  'operations/move-critere-to-service',
  ['CritereService', 'Critere', 'Service', 'User'],
)

// PUBLIC API
export const removeCritereFromService: ActionFor<RemoveCritereFromService_ext> = createAction<RemoveCritereFromService_ext>(
  'operations/remove-critere-from-service',
  ['CritereService', 'Critere', 'Service', 'User'],
)

// PUBLIC API
export const deleteCritere: ActionFor<DeleteCritere_ext> = createAction<DeleteCritere_ext>(
  'operations/delete-critere',
  ['Critere', 'Reponse', 'AgenceCritere', 'CritereService', 'Objectif', 'User'],
)

// PUBLIC API
export const duplicateCritere: ActionFor<DuplicateCritere_ext> = createAction<DuplicateCritere_ext>(
  'operations/duplicate-critere',
  ['Critere', 'AgenceCritere', 'CritereService', 'Agence', 'Service', 'User'],
)

// PUBLIC API
export const updateCritere: ActionFor<UpdateCritere_ext> = createAction<UpdateCritere_ext>(
  'operations/update-critere',
  ['Critere', 'User'],
)

// PUBLIC API
export const reorderCriteresInService: ActionFor<ReorderCriteresInService_ext> = createAction<ReorderCriteresInService_ext>(
  'operations/reorder-criteres-in-service',
  ['CritereService', 'Service', 'User'],
)

// PUBLIC API
export const archiverGuichet: ActionFor<ArchiverGuichet_ext> = createAction<ArchiverGuichet_ext>(
  'operations/archiver-guichet',
  ['Guichet', 'User', 'Agence'],
)

// PUBLIC API
export const desarchiverGuichet: ActionFor<DesarchiverGuichet_ext> = createAction<DesarchiverGuichet_ext>(
  'operations/desarchiver-guichet',
  ['Guichet', 'User', 'Agence'],
)

// PUBLIC API
export const archiverAgence: ActionFor<ArchiverAgence_ext> = createAction<ArchiverAgence_ext>(
  'operations/archiver-agence',
  ['Agence', 'Guichet', 'User'],
)

// PUBLIC API
export const desarchiverAgence: ActionFor<DesarchiverAgence_ext> = createAction<DesarchiverAgence_ext>(
  'operations/desarchiver-agence',
  ['Agence', 'User'],
)

// PUBLIC API
export const archiverAlerte: ActionFor<ArchiverAlerte_ext> = createAction<ArchiverAlerte_ext>(
  'operations/archiver-alerte',
  ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const desarchiverAlerte: ActionFor<DesarchiverAlerte_ext> = createAction<DesarchiverAlerte_ext>(
  'operations/desarchiver-alerte',
  ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const archiverTache: ActionFor<ArchiverTache_ext> = createAction<ArchiverTache_ext>(
  'operations/archiver-tache',
  ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const desarchiverTache: ActionFor<DesarchiverTache_ext> = createAction<DesarchiverTache_ext>(
  'operations/desarchiver-tache',
  ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence'],
)

// PUBLIC API
export const archiverCritere: ActionFor<ArchiverCritere_ext> = createAction<ArchiverCritere_ext>(
  'operations/archiver-critere',
  ['Critere', 'User'],
)

// PUBLIC API
export const desarchiverCritere: ActionFor<DesarchiverCritere_ext> = createAction<DesarchiverCritere_ext>(
  'operations/desarchiver-critere',
  ['Critere', 'User'],
)

// PUBLIC API
export const creerEntreprise: ActionFor<CreerEntreprise_ext> = createAction<CreerEntreprise_ext>(
  'operations/creer-entreprise',
  ['Entreprise', 'User', 'Invitation', 'AuditLog'],
)

// PUBLIC API
export const suspendreEntreprise: ActionFor<SuspendreEntreprise_ext> = createAction<SuspendreEntreprise_ext>(
  'operations/suspendre-entreprise',
  ['Entreprise', 'AuditLog'],
)

// PUBLIC API
export const reactiverEntreprise: ActionFor<ReactiverEntreprise_ext> = createAction<ReactiverEntreprise_ext>(
  'operations/reactiver-entreprise',
  ['Entreprise', 'AuditLog'],
)

// PUBLIC API
export const changerLimitesEntreprise: ActionFor<ChangerLimitesEntreprise_ext> = createAction<ChangerLimitesEntreprise_ext>(
  'operations/changer-limites-entreprise',
  ['Entreprise', 'AuditLog'],
)

// PUBLIC API
export const renvoyerInvitation: ActionFor<RenvoyerInvitation_ext> = createAction<RenvoyerInvitation_ext>(
  'operations/renvoyer-invitation',
  ['Entreprise', 'User', 'Invitation', 'AuditLog'],
)

// PUBLIC API
export const inviterSuperAdmin: ActionFor<InviterSuperAdmin_ext> = createAction<InviterSuperAdmin_ext>(
  'operations/inviter-super-admin',
  ['User', 'Invitation', 'AuditLog'],
)

// PUBLIC API
export const activerCompte: ActionFor<ActiverCompte_ext> = createAction<ActiverCompte_ext>(
  'operations/activer-compte',
  ['Invitation', 'User', 'AuditLog'],
)

// PUBLIC API
export const changerPlatformRole: ActionFor<ChangerPlatformRole_ext> = createAction<ChangerPlatformRole_ext>(
  'operations/changer-platform-role',
  ['User', 'AuditLog'],
)

// PUBLIC API
export const desactiverComptePlatform: ActionFor<DesactiverComptePlatform_ext> = createAction<DesactiverComptePlatform_ext>(
  'operations/desactiver-compte-platform',
  ['User', 'AuditLog'],
)

// PUBLIC API
export const setup2fa: ActionFor<Setup2fa_ext> = createAction<Setup2fa_ext>(
  'operations/setup2fa',
  ['User', 'AuditLog'],
)

// PUBLIC API
export const activer2fa: ActionFor<Activer2fa_ext> = createAction<Activer2fa_ext>(
  'operations/activer2fa',
  ['User', 'AuditLog'],
)

// PUBLIC API
export const verifier2fa: ActionFor<Verifier2fa_ext> = createAction<Verifier2fa_ext>(
  'operations/verifier2fa',
  ['User', 'AuditLog'],
)
