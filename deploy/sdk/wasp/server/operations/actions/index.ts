
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { updateProfile as updateProfile_ext } from 'wasp/src/user/accountsActions'
import { changePassword as changePassword_ext } from 'wasp/src/user/accountsActions'
import { changeEmail as changeEmail_ext } from 'wasp/src/user/accountsActions'
import { addFileToDb as addFileToDb_ext } from 'wasp/src/file-upload/operations'
import { createFileUploadUrl as createFileUploadUrl_ext } from 'wasp/src/file-upload/operations'
import { deleteFile as deleteFile_ext } from 'wasp/src/file-upload/operations'
import { createGuichet as createGuichet_ext } from 'wasp/src/server/actions'
import { assignAgent as assignAgent_ext } from 'wasp/src/server/actions'
import { updateAffectationGuichet as updateAffectationGuichet_ext } from 'wasp/src/server/actions'
import { deleteAffectationGuichet as deleteAffectationGuichet_ext } from 'wasp/src/server/actions'
import { soumettreAvis as soumettreAvis_ext } from 'wasp/src/server/actions'
import { createAgence as createAgence_ext } from 'wasp/src/server/actions'
import { updateAgent as updateAgent_ext } from 'wasp/src/server/actions'
import { deleteAgent as deleteAgent_ext } from 'wasp/src/server/actions'
import { reactivateAgent as reactivateAgent_ext } from 'wasp/src/server/actions'
import { promouvoirAgent as promouvoirAgent_ext } from 'wasp/src/server/actions'
import { inviteAgent as inviteAgent_ext } from 'wasp/src/server/actions'
import { toggleCritereAgence as toggleCritereAgence_ext } from 'wasp/src/server/actions'
import { createCritere as createCritere_ext } from 'wasp/src/server/actions'
import { createService as createService_ext } from 'wasp/src/server/actions'
import { upsertObjectif as upsertObjectif_ext } from 'wasp/src/server/actions'
import { deleteObjectif as deleteObjectif_ext } from 'wasp/src/server/actions'
import { createTacheCorrective as createTacheCorrective_ext } from 'wasp/src/server/actions'
import { updateStatutTache as updateStatutTache_ext } from 'wasp/src/server/actions'
import { marquerAlerteTraitee as marquerAlerteTraitee_ext } from 'wasp/src/server/actions'
import { updateGuichetServices as updateGuichetServices_ext } from 'wasp/src/server/actions'
import { moveCritereToService as moveCritereToService_ext } from 'wasp/src/server/actions'
import { removeCritereFromService as removeCritereFromService_ext } from 'wasp/src/server/actions'
import { deleteCritere as deleteCritere_ext } from 'wasp/src/server/actions'
import { duplicateCritere as duplicateCritere_ext } from 'wasp/src/server/actions'
import { updateCritere as updateCritere_ext } from 'wasp/src/server/actions'
import { reorderCriteresInService as reorderCriteresInService_ext } from 'wasp/src/server/actions'
import { archiverGuichet as archiverGuichet_ext } from 'wasp/src/server/actions'
import { desarchiverGuichet as desarchiverGuichet_ext } from 'wasp/src/server/actions'
import { archiverAgence as archiverAgence_ext } from 'wasp/src/server/actions'
import { desarchiverAgence as desarchiverAgence_ext } from 'wasp/src/server/actions'
import { archiverAlerte as archiverAlerte_ext } from 'wasp/src/server/actions'
import { desarchiverAlerte as desarchiverAlerte_ext } from 'wasp/src/server/actions'
import { archiverTache as archiverTache_ext } from 'wasp/src/server/actions'
import { desarchiverTache as desarchiverTache_ext } from 'wasp/src/server/actions'
import { archiverCritere as archiverCritere_ext } from 'wasp/src/server/actions'
import { desarchiverCritere as desarchiverCritere_ext } from 'wasp/src/server/actions'
import { creerEntreprise as creerEntreprise_ext } from 'wasp/src/server/actionsPlatform'
import { suspendreEntreprise as suspendreEntreprise_ext } from 'wasp/src/server/actionsPlatform'
import { reactiverEntreprise as reactiverEntreprise_ext } from 'wasp/src/server/actionsPlatform'
import { changerLimitesEntreprise as changerLimitesEntreprise_ext } from 'wasp/src/server/actionsPlatform'
import { renvoyerInvitation as renvoyerInvitation_ext } from 'wasp/src/server/actionsPlatform'
import { inviterSuperAdmin as inviterSuperAdmin_ext } from 'wasp/src/server/actionsPlatform'
import { activerCompte as activerCompte_ext } from 'wasp/src/server/actionsPlatform'
import { changerPlatformRole as changerPlatformRole_ext } from 'wasp/src/server/actionsPlatform'
import { desactiverComptePlatform as desactiverComptePlatform_ext } from 'wasp/src/server/actionsPlatform'
import { setup2fa as setup2fa_ext } from 'wasp/src/server/actionsPlatform'
import { activer2fa as activer2fa_ext } from 'wasp/src/server/actionsPlatform'
import { verifier2fa as verifier2fa_ext } from 'wasp/src/server/actionsPlatform'

// PRIVATE API
export type UpdateProfile_ext = typeof updateProfile_ext

// PUBLIC API
export const updateProfile: AuthenticatedOperationFor<UpdateProfile_ext> =
  createAuthenticatedOperation(
    updateProfile_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type ChangePassword_ext = typeof changePassword_ext

// PUBLIC API
export const changePassword: AuthenticatedOperationFor<ChangePassword_ext> =
  createAuthenticatedOperation(
    changePassword_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type ChangeEmail_ext = typeof changeEmail_ext

// PUBLIC API
export const changeEmail: AuthenticatedOperationFor<ChangeEmail_ext> =
  createAuthenticatedOperation(
    changeEmail_ext,
    {
      User: prisma.user,
    },
  )

// PRIVATE API
export type AddFileToDb_ext = typeof addFileToDb_ext

// PUBLIC API
export const addFileToDb: AuthenticatedOperationFor<AddFileToDb_ext> =
  createAuthenticatedOperation(
    addFileToDb_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )

// PRIVATE API
export type CreateFileUploadUrl_ext = typeof createFileUploadUrl_ext

// PUBLIC API
export const createFileUploadUrl: AuthenticatedOperationFor<CreateFileUploadUrl_ext> =
  createAuthenticatedOperation(
    createFileUploadUrl_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )

// PRIVATE API
export type DeleteFile_ext = typeof deleteFile_ext

// PUBLIC API
export const deleteFile: AuthenticatedOperationFor<DeleteFile_ext> =
  createAuthenticatedOperation(
    deleteFile_ext,
    {
      User: prisma.user,
      File: prisma.file,
    },
  )

// PRIVATE API
export type CreateGuichet_ext = typeof createGuichet_ext

// PUBLIC API
export const createGuichet: AuthenticatedOperationFor<CreateGuichet_ext> =
  createAuthenticatedOperation(
    createGuichet_ext,
    {
      Guichet: prisma.guichet,
      User: prisma.user,
      Service: prisma.service,
      AffectationGuichet: prisma.affectationGuichet,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type AssignAgent_ext = typeof assignAgent_ext

// PUBLIC API
export const assignAgent: AuthenticatedOperationFor<AssignAgent_ext> =
  createAuthenticatedOperation(
    assignAgent_ext,
    {
      User: prisma.user,
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type UpdateAffectationGuichet_ext = typeof updateAffectationGuichet_ext

// PUBLIC API
export const updateAffectationGuichet: AuthenticatedOperationFor<UpdateAffectationGuichet_ext> =
  createAuthenticatedOperation(
    updateAffectationGuichet_ext,
    {
      User: prisma.user,
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type DeleteAffectationGuichet_ext = typeof deleteAffectationGuichet_ext

// PUBLIC API
export const deleteAffectationGuichet: AuthenticatedOperationFor<DeleteAffectationGuichet_ext> =
  createAuthenticatedOperation(
    deleteAffectationGuichet_ext,
    {
      AffectationGuichet: prisma.affectationGuichet,
      Guichet: prisma.guichet,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type SoumettreAvis_ext = typeof soumettreAvis_ext

// PUBLIC API
export const soumettreAvis: AuthenticatedOperationFor<SoumettreAvis_ext> =
  createAuthenticatedOperation(
    soumettreAvis_ext,
    {
      Reponse: prisma.reponse,
      Critere: prisma.critere,
      AgenceCritere: prisma.agenceCritere,
      Guichet: prisma.guichet,
      AffectationGuichet: prisma.affectationGuichet,
      Alerte: prisma.alerte,
      VoteAntiRejeu: prisma.voteAntiRejeu,
      Service: prisma.service,
      User: prisma.user,
      AnalyseAvisIA: prisma.analyseAvisIA,
      Canal: prisma.canal,
    },
  )

// PRIVATE API
export type CreateAgence_ext = typeof createAgence_ext

// PUBLIC API
export const createAgence: AuthenticatedOperationFor<CreateAgence_ext> =
  createAuthenticatedOperation(
    createAgence_ext,
    {
      Agence: prisma.agence,
      User: prisma.user,
      Entreprise: prisma.entreprise,
    },
  )

// PRIVATE API
export type UpdateAgent_ext = typeof updateAgent_ext

// PUBLIC API
export const updateAgent: AuthenticatedOperationFor<UpdateAgent_ext> =
  createAuthenticatedOperation(
    updateAgent_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type DeleteAgent_ext = typeof deleteAgent_ext

// PUBLIC API
export const deleteAgent: AuthenticatedOperationFor<DeleteAgent_ext> =
  createAuthenticatedOperation(
    deleteAgent_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type ReactivateAgent_ext = typeof reactivateAgent_ext

// PUBLIC API
export const reactivateAgent: AuthenticatedOperationFor<ReactivateAgent_ext> =
  createAuthenticatedOperation(
    reactivateAgent_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type PromouvoirAgent_ext = typeof promouvoirAgent_ext

// PUBLIC API
export const promouvoirAgent: AuthenticatedOperationFor<PromouvoirAgent_ext> =
  createAuthenticatedOperation(
    promouvoirAgent_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type InviteAgent_ext = typeof inviteAgent_ext

// PUBLIC API
export const inviteAgent: AuthenticatedOperationFor<InviteAgent_ext> =
  createAuthenticatedOperation(
    inviteAgent_ext,
    {
      User: prisma.user,
      Agence: prisma.agence,
      Entreprise: prisma.entreprise,
    },
  )

// PRIVATE API
export type ToggleCritereAgence_ext = typeof toggleCritereAgence_ext

// PUBLIC API
export const toggleCritereAgence: AuthenticatedOperationFor<ToggleCritereAgence_ext> =
  createAuthenticatedOperation(
    toggleCritereAgence_ext,
    {
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type CreateCritere_ext = typeof createCritere_ext

// PUBLIC API
export const createCritere: AuthenticatedOperationFor<CreateCritere_ext> =
  createAuthenticatedOperation(
    createCritere_ext,
    {
      Critere: prisma.critere,
      AgenceCritere: prisma.agenceCritere,
      User: prisma.user,
      Agence: prisma.agence,
      Service: prisma.service,
    },
  )

// PRIVATE API
export type CreateService_ext = typeof createService_ext

// PUBLIC API
export const createService: AuthenticatedOperationFor<CreateService_ext> =
  createAuthenticatedOperation(
    createService_ext,
    {
      Service: prisma.service,
      User: prisma.user,
    },
  )

// PRIVATE API
export type UpsertObjectif_ext = typeof upsertObjectif_ext

// PUBLIC API
export const upsertObjectif: AuthenticatedOperationFor<UpsertObjectif_ext> =
  createAuthenticatedOperation(
    upsertObjectif_ext,
    {
      Objectif: prisma.objectif,
      Agence: prisma.agence,
      Critere: prisma.critere,
      User: prisma.user,
    },
  )

// PRIVATE API
export type DeleteObjectif_ext = typeof deleteObjectif_ext

// PUBLIC API
export const deleteObjectif: AuthenticatedOperationFor<DeleteObjectif_ext> =
  createAuthenticatedOperation(
    deleteObjectif_ext,
    {
      Objectif: prisma.objectif,
      Agence: prisma.agence,
      User: prisma.user,
    },
  )

// PRIVATE API
export type CreateTacheCorrective_ext = typeof createTacheCorrective_ext

// PUBLIC API
export const createTacheCorrective: AuthenticatedOperationFor<CreateTacheCorrective_ext> =
  createAuthenticatedOperation(
    createTacheCorrective_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type UpdateStatutTache_ext = typeof updateStatutTache_ext

// PUBLIC API
export const updateStatutTache: AuthenticatedOperationFor<UpdateStatutTache_ext> =
  createAuthenticatedOperation(
    updateStatutTache_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type MarquerAlerteTraitee_ext = typeof marquerAlerteTraitee_ext

// PUBLIC API
export const marquerAlerteTraitee: AuthenticatedOperationFor<MarquerAlerteTraitee_ext> =
  createAuthenticatedOperation(
    marquerAlerteTraitee_ext,
    {
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type UpdateGuichetServices_ext = typeof updateGuichetServices_ext

// PUBLIC API
export const updateGuichetServices: AuthenticatedOperationFor<UpdateGuichetServices_ext> =
  createAuthenticatedOperation(
    updateGuichetServices_ext,
    {
      Guichet: prisma.guichet,
      Service: prisma.service,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type MoveCritereToService_ext = typeof moveCritereToService_ext

// PUBLIC API
export const moveCritereToService: AuthenticatedOperationFor<MoveCritereToService_ext> =
  createAuthenticatedOperation(
    moveCritereToService_ext,
    {
      CritereService: prisma.critereService,
      Critere: prisma.critere,
      Service: prisma.service,
      User: prisma.user,
    },
  )

// PRIVATE API
export type RemoveCritereFromService_ext = typeof removeCritereFromService_ext

// PUBLIC API
export const removeCritereFromService: AuthenticatedOperationFor<RemoveCritereFromService_ext> =
  createAuthenticatedOperation(
    removeCritereFromService_ext,
    {
      CritereService: prisma.critereService,
      Critere: prisma.critere,
      Service: prisma.service,
      User: prisma.user,
    },
  )

// PRIVATE API
export type DeleteCritere_ext = typeof deleteCritere_ext

// PUBLIC API
export const deleteCritere: AuthenticatedOperationFor<DeleteCritere_ext> =
  createAuthenticatedOperation(
    deleteCritere_ext,
    {
      Critere: prisma.critere,
      Reponse: prisma.reponse,
      AgenceCritere: prisma.agenceCritere,
      CritereService: prisma.critereService,
      Objectif: prisma.objectif,
      User: prisma.user,
    },
  )

// PRIVATE API
export type DuplicateCritere_ext = typeof duplicateCritere_ext

// PUBLIC API
export const duplicateCritere: AuthenticatedOperationFor<DuplicateCritere_ext> =
  createAuthenticatedOperation(
    duplicateCritere_ext,
    {
      Critere: prisma.critere,
      AgenceCritere: prisma.agenceCritere,
      CritereService: prisma.critereService,
      User: prisma.user,
    },
  )

// PRIVATE API
export type UpdateCritere_ext = typeof updateCritere_ext

// PUBLIC API
export const updateCritere: AuthenticatedOperationFor<UpdateCritere_ext> =
  createAuthenticatedOperation(
    updateCritere_ext,
    {
      Critere: prisma.critere,
      User: prisma.user,
    },
  )

// PRIVATE API
export type ReorderCriteresInService_ext = typeof reorderCriteresInService_ext

// PUBLIC API
export const reorderCriteresInService: AuthenticatedOperationFor<ReorderCriteresInService_ext> =
  createAuthenticatedOperation(
    reorderCriteresInService_ext,
    {
      CritereService: prisma.critereService,
      Service: prisma.service,
      User: prisma.user,
    },
  )

// PRIVATE API
export type ArchiverGuichet_ext = typeof archiverGuichet_ext

// PUBLIC API
export const archiverGuichet: AuthenticatedOperationFor<ArchiverGuichet_ext> =
  createAuthenticatedOperation(
    archiverGuichet_ext,
    {
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type DesarchiverGuichet_ext = typeof desarchiverGuichet_ext

// PUBLIC API
export const desarchiverGuichet: AuthenticatedOperationFor<DesarchiverGuichet_ext> =
  createAuthenticatedOperation(
    desarchiverGuichet_ext,
    {
      Guichet: prisma.guichet,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type ArchiverAgence_ext = typeof archiverAgence_ext

// PUBLIC API
export const archiverAgence: AuthenticatedOperationFor<ArchiverAgence_ext> =
  createAuthenticatedOperation(
    archiverAgence_ext,
    {
      Agence: prisma.agence,
      Guichet: prisma.guichet,
      User: prisma.user,
    },
  )

// PRIVATE API
export type DesarchiverAgence_ext = typeof desarchiverAgence_ext

// PUBLIC API
export const desarchiverAgence: AuthenticatedOperationFor<DesarchiverAgence_ext> =
  createAuthenticatedOperation(
    desarchiverAgence_ext,
    {
      Agence: prisma.agence,
      User: prisma.user,
    },
  )

// PRIVATE API
export type ArchiverAlerte_ext = typeof archiverAlerte_ext

// PUBLIC API
export const archiverAlerte: AuthenticatedOperationFor<ArchiverAlerte_ext> =
  createAuthenticatedOperation(
    archiverAlerte_ext,
    {
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type DesarchiverAlerte_ext = typeof desarchiverAlerte_ext

// PUBLIC API
export const desarchiverAlerte: AuthenticatedOperationFor<DesarchiverAlerte_ext> =
  createAuthenticatedOperation(
    desarchiverAlerte_ext,
    {
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type ArchiverTache_ext = typeof archiverTache_ext

// PUBLIC API
export const archiverTache: AuthenticatedOperationFor<ArchiverTache_ext> =
  createAuthenticatedOperation(
    archiverTache_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type DesarchiverTache_ext = typeof desarchiverTache_ext

// PUBLIC API
export const desarchiverTache: AuthenticatedOperationFor<DesarchiverTache_ext> =
  createAuthenticatedOperation(
    desarchiverTache_ext,
    {
      TacheCorrective: prisma.tacheCorrective,
      Alerte: prisma.alerte,
      Guichet: prisma.guichet,
      Reponse: prisma.reponse,
      User: prisma.user,
      Agence: prisma.agence,
    },
  )

// PRIVATE API
export type ArchiverCritere_ext = typeof archiverCritere_ext

// PUBLIC API
export const archiverCritere: AuthenticatedOperationFor<ArchiverCritere_ext> =
  createAuthenticatedOperation(
    archiverCritere_ext,
    {
      Critere: prisma.critere,
      User: prisma.user,
    },
  )

// PRIVATE API
export type DesarchiverCritere_ext = typeof desarchiverCritere_ext

// PUBLIC API
export const desarchiverCritere: AuthenticatedOperationFor<DesarchiverCritere_ext> =
  createAuthenticatedOperation(
    desarchiverCritere_ext,
    {
      Critere: prisma.critere,
      User: prisma.user,
    },
  )

// PRIVATE API
export type CreerEntreprise_ext = typeof creerEntreprise_ext

// PUBLIC API
export const creerEntreprise: AuthenticatedOperationFor<CreerEntreprise_ext> =
  createAuthenticatedOperation(
    creerEntreprise_ext,
    {
      Entreprise: prisma.entreprise,
      User: prisma.user,
      Invitation: prisma.invitation,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type SuspendreEntreprise_ext = typeof suspendreEntreprise_ext

// PUBLIC API
export const suspendreEntreprise: AuthenticatedOperationFor<SuspendreEntreprise_ext> =
  createAuthenticatedOperation(
    suspendreEntreprise_ext,
    {
      Entreprise: prisma.entreprise,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type ReactiverEntreprise_ext = typeof reactiverEntreprise_ext

// PUBLIC API
export const reactiverEntreprise: AuthenticatedOperationFor<ReactiverEntreprise_ext> =
  createAuthenticatedOperation(
    reactiverEntreprise_ext,
    {
      Entreprise: prisma.entreprise,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type ChangerLimitesEntreprise_ext = typeof changerLimitesEntreprise_ext

// PUBLIC API
export const changerLimitesEntreprise: AuthenticatedOperationFor<ChangerLimitesEntreprise_ext> =
  createAuthenticatedOperation(
    changerLimitesEntreprise_ext,
    {
      Entreprise: prisma.entreprise,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type RenvoyerInvitation_ext = typeof renvoyerInvitation_ext

// PUBLIC API
export const renvoyerInvitation: AuthenticatedOperationFor<RenvoyerInvitation_ext> =
  createAuthenticatedOperation(
    renvoyerInvitation_ext,
    {
      Entreprise: prisma.entreprise,
      User: prisma.user,
      Invitation: prisma.invitation,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type InviterSuperAdmin_ext = typeof inviterSuperAdmin_ext

// PUBLIC API
export const inviterSuperAdmin: AuthenticatedOperationFor<InviterSuperAdmin_ext> =
  createAuthenticatedOperation(
    inviterSuperAdmin_ext,
    {
      User: prisma.user,
      Invitation: prisma.invitation,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type ActiverCompte_ext = typeof activerCompte_ext

// PUBLIC API
export const activerCompte: AuthenticatedOperationFor<ActiverCompte_ext> =
  createAuthenticatedOperation(
    activerCompte_ext,
    {
      Invitation: prisma.invitation,
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type ChangerPlatformRole_ext = typeof changerPlatformRole_ext

// PUBLIC API
export const changerPlatformRole: AuthenticatedOperationFor<ChangerPlatformRole_ext> =
  createAuthenticatedOperation(
    changerPlatformRole_ext,
    {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type DesactiverComptePlatform_ext = typeof desactiverComptePlatform_ext

// PUBLIC API
export const desactiverComptePlatform: AuthenticatedOperationFor<DesactiverComptePlatform_ext> =
  createAuthenticatedOperation(
    desactiverComptePlatform_ext,
    {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type Setup2fa_ext = typeof setup2fa_ext

// PUBLIC API
export const setup2fa: AuthenticatedOperationFor<Setup2fa_ext> =
  createAuthenticatedOperation(
    setup2fa_ext,
    {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type Activer2fa_ext = typeof activer2fa_ext

// PUBLIC API
export const activer2fa: AuthenticatedOperationFor<Activer2fa_ext> =
  createAuthenticatedOperation(
    activer2fa_ext,
    {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )

// PRIVATE API
export type Verifier2fa_ext = typeof verifier2fa_ext

// PUBLIC API
export const verifier2fa: AuthenticatedOperationFor<Verifier2fa_ext> =
  createAuthenticatedOperation(
    verifier2fa_ext,
    {
      User: prisma.user,
      AuditLog: prisma.auditLog,
    },
  )
