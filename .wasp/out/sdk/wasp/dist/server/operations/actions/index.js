import { prisma } from 'wasp/server';
import { createAuthenticatedOperation, } from '../wrappers.js';
import { updateProfile as updateProfile_ext } from 'wasp/src/user/accountsActions';
import { changePassword as changePassword_ext } from 'wasp/src/user/accountsActions';
import { changeEmail as changeEmail_ext } from 'wasp/src/user/accountsActions';
import { addFileToDb as addFileToDb_ext } from 'wasp/src/file-upload/operations';
import { createFileUploadUrl as createFileUploadUrl_ext } from 'wasp/src/file-upload/operations';
import { deleteFile as deleteFile_ext } from 'wasp/src/file-upload/operations';
import { createGuichet as createGuichet_ext } from 'wasp/src/server/actions';
import { assignAgent as assignAgent_ext } from 'wasp/src/server/actions';
import { updateAffectationGuichet as updateAffectationGuichet_ext } from 'wasp/src/server/actions';
import { deleteAffectationGuichet as deleteAffectationGuichet_ext } from 'wasp/src/server/actions';
import { soumettreAvis as soumettreAvis_ext } from 'wasp/src/server/actions';
import { createAgence as createAgence_ext } from 'wasp/src/server/actions';
import { updateAgent as updateAgent_ext } from 'wasp/src/server/actions';
import { deleteAgent as deleteAgent_ext } from 'wasp/src/server/actions';
import { reactivateAgent as reactivateAgent_ext } from 'wasp/src/server/actions';
import { promouvoirAgent as promouvoirAgent_ext } from 'wasp/src/server/actions';
import { updateBranding as updateBranding_ext } from 'wasp/src/server/actions';
import { inviteAgent as inviteAgent_ext } from 'wasp/src/server/actions';
import { renvoyerInvitationAgent as renvoyerInvitationAgent_ext } from 'wasp/src/server/actions';
import { toggleCritereAgence as toggleCritereAgence_ext } from 'wasp/src/server/actions';
import { createCritere as createCritere_ext } from 'wasp/src/server/actions';
import { createService as createService_ext } from 'wasp/src/server/actions';
import { upsertObjectif as upsertObjectif_ext } from 'wasp/src/server/actions';
import { deleteObjectif as deleteObjectif_ext } from 'wasp/src/server/actions';
import { createTacheCorrective as createTacheCorrective_ext } from 'wasp/src/server/actions';
import { updateStatutTache as updateStatutTache_ext } from 'wasp/src/server/actions';
import { marquerAlerteTraitee as marquerAlerteTraitee_ext } from 'wasp/src/server/actions';
import { updateGuichetServices as updateGuichetServices_ext } from 'wasp/src/server/actions';
import { moveCritereToService as moveCritereToService_ext } from 'wasp/src/server/actions';
import { removeCritereFromService as removeCritereFromService_ext } from 'wasp/src/server/actions';
import { deleteCritere as deleteCritere_ext } from 'wasp/src/server/actions';
import { duplicateCritere as duplicateCritere_ext } from 'wasp/src/server/actions';
import { updateCritere as updateCritere_ext } from 'wasp/src/server/actions';
import { reorderCriteresInService as reorderCriteresInService_ext } from 'wasp/src/server/actions';
import { archiverGuichet as archiverGuichet_ext } from 'wasp/src/server/actions';
import { desarchiverGuichet as desarchiverGuichet_ext } from 'wasp/src/server/actions';
import { archiverAgence as archiverAgence_ext } from 'wasp/src/server/actions';
import { desarchiverAgence as desarchiverAgence_ext } from 'wasp/src/server/actions';
import { archiverAlerte as archiverAlerte_ext } from 'wasp/src/server/actions';
import { desarchiverAlerte as desarchiverAlerte_ext } from 'wasp/src/server/actions';
import { archiverTache as archiverTache_ext } from 'wasp/src/server/actions';
import { desarchiverTache as desarchiverTache_ext } from 'wasp/src/server/actions';
import { archiverCritere as archiverCritere_ext } from 'wasp/src/server/actions';
import { desarchiverCritere as desarchiverCritere_ext } from 'wasp/src/server/actions';
import { creerEntreprise as creerEntreprise_ext } from 'wasp/src/server/actionsPlatform';
import { suspendreEntreprise as suspendreEntreprise_ext } from 'wasp/src/server/actionsPlatform';
import { reactiverEntreprise as reactiverEntreprise_ext } from 'wasp/src/server/actionsPlatform';
import { changerLimitesEntreprise as changerLimitesEntreprise_ext } from 'wasp/src/server/actionsPlatform';
import { renvoyerInvitation as renvoyerInvitation_ext } from 'wasp/src/server/actionsPlatform';
import { inviterSuperAdmin as inviterSuperAdmin_ext } from 'wasp/src/server/actionsPlatform';
import { activerCompte as activerCompte_ext } from 'wasp/src/server/actionsPlatform';
import { changerPlatformRole as changerPlatformRole_ext } from 'wasp/src/server/actionsPlatform';
import { desactiverComptePlatform as desactiverComptePlatform_ext } from 'wasp/src/server/actionsPlatform';
import { setup2fa as setup2fa_ext } from 'wasp/src/server/actionsPlatform';
import { activer2fa as activer2fa_ext } from 'wasp/src/server/actionsPlatform';
import { verifier2fa as verifier2fa_ext } from 'wasp/src/server/actionsPlatform';
// PUBLIC API
export const updateProfile = createAuthenticatedOperation(updateProfile_ext, {
    User: prisma.user,
});
// PUBLIC API
export const changePassword = createAuthenticatedOperation(changePassword_ext, {
    User: prisma.user,
});
// PUBLIC API
export const changeEmail = createAuthenticatedOperation(changeEmail_ext, {
    User: prisma.user,
});
// PUBLIC API
export const addFileToDb = createAuthenticatedOperation(addFileToDb_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const createFileUploadUrl = createAuthenticatedOperation(createFileUploadUrl_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const deleteFile = createAuthenticatedOperation(deleteFile_ext, {
    User: prisma.user,
    File: prisma.file,
});
// PUBLIC API
export const createGuichet = createAuthenticatedOperation(createGuichet_ext, {
    Guichet: prisma.guichet,
    User: prisma.user,
    Service: prisma.service,
    AffectationGuichet: prisma.affectationGuichet,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const assignAgent = createAuthenticatedOperation(assignAgent_ext, {
    User: prisma.user,
    AffectationGuichet: prisma.affectationGuichet,
    Guichet: prisma.guichet,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const updateAffectationGuichet = createAuthenticatedOperation(updateAffectationGuichet_ext, {
    User: prisma.user,
    AffectationGuichet: prisma.affectationGuichet,
    Guichet: prisma.guichet,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const deleteAffectationGuichet = createAuthenticatedOperation(deleteAffectationGuichet_ext, {
    AffectationGuichet: prisma.affectationGuichet,
    Guichet: prisma.guichet,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const soumettreAvis = createAuthenticatedOperation(soumettreAvis_ext, {
    Reponse: prisma.reponse,
    Critere: prisma.critere,
    AgenceCritere: prisma.agenceCritere,
    CritereService: prisma.critereService,
    Guichet: prisma.guichet,
    AffectationGuichet: prisma.affectationGuichet,
    Alerte: prisma.alerte,
    VoteAntiRejeu: prisma.voteAntiRejeu,
    Service: prisma.service,
    User: prisma.user,
    AnalyseAvisIA: prisma.analyseAvisIA,
    Canal: prisma.canal,
});
// PUBLIC API
export const createAgence = createAuthenticatedOperation(createAgence_ext, {
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const updateAgent = createAuthenticatedOperation(updateAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const deleteAgent = createAuthenticatedOperation(deleteAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const reactivateAgent = createAuthenticatedOperation(reactivateAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const promouvoirAgent = createAuthenticatedOperation(promouvoirAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const updateBranding = createAuthenticatedOperation(updateBranding_ext, {
    BrandingConfig: prisma.brandingConfig,
    User: prisma.user,
    Entreprise: prisma.entreprise,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const inviteAgent = createAuthenticatedOperation(inviteAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
    Invitation: prisma.invitation,
});
// PUBLIC API
export const renvoyerInvitationAgent = createAuthenticatedOperation(renvoyerInvitationAgent_ext, {
    User: prisma.user,
    Agence: prisma.agence,
    Invitation: prisma.invitation,
    AuditLog: prisma.auditLog,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const toggleCritereAgence = createAuthenticatedOperation(toggleCritereAgence_ext, {
    AgenceCritere: prisma.agenceCritere,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const createCritere = createAuthenticatedOperation(createCritere_ext, {
    Critere: prisma.critere,
    AgenceCritere: prisma.agenceCritere,
    User: prisma.user,
    Agence: prisma.agence,
    Service: prisma.service,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const createService = createAuthenticatedOperation(createService_ext, {
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const upsertObjectif = createAuthenticatedOperation(upsertObjectif_ext, {
    Objectif: prisma.objectif,
    Agence: prisma.agence,
    Critere: prisma.critere,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const deleteObjectif = createAuthenticatedOperation(deleteObjectif_ext, {
    Objectif: prisma.objectif,
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const createTacheCorrective = createAuthenticatedOperation(createTacheCorrective_ext, {
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
export const updateStatutTache = createAuthenticatedOperation(updateStatutTache_ext, {
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
export const marquerAlerteTraitee = createAuthenticatedOperation(marquerAlerteTraitee_ext, {
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const updateGuichetServices = createAuthenticatedOperation(updateGuichetServices_ext, {
    Guichet: prisma.guichet,
    Service: prisma.service,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const moveCritereToService = createAuthenticatedOperation(moveCritereToService_ext, {
    CritereService: prisma.critereService,
    Critere: prisma.critere,
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const removeCritereFromService = createAuthenticatedOperation(removeCritereFromService_ext, {
    CritereService: prisma.critereService,
    Critere: prisma.critere,
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const deleteCritere = createAuthenticatedOperation(deleteCritere_ext, {
    Critere: prisma.critere,
    Reponse: prisma.reponse,
    AgenceCritere: prisma.agenceCritere,
    CritereService: prisma.critereService,
    Objectif: prisma.objectif,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const duplicateCritere = createAuthenticatedOperation(duplicateCritere_ext, {
    Critere: prisma.critere,
    AgenceCritere: prisma.agenceCritere,
    CritereService: prisma.critereService,
    Agence: prisma.agence,
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const updateCritere = createAuthenticatedOperation(updateCritere_ext, {
    Critere: prisma.critere,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const reorderCriteresInService = createAuthenticatedOperation(reorderCriteresInService_ext, {
    CritereService: prisma.critereService,
    Service: prisma.service,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const archiverGuichet = createAuthenticatedOperation(archiverGuichet_ext, {
    Guichet: prisma.guichet,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const desarchiverGuichet = createAuthenticatedOperation(desarchiverGuichet_ext, {
    Guichet: prisma.guichet,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const archiverAgence = createAuthenticatedOperation(archiverAgence_ext, {
    Agence: prisma.agence,
    Guichet: prisma.guichet,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const desarchiverAgence = createAuthenticatedOperation(desarchiverAgence_ext, {
    Agence: prisma.agence,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const archiverAlerte = createAuthenticatedOperation(archiverAlerte_ext, {
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const desarchiverAlerte = createAuthenticatedOperation(desarchiverAlerte_ext, {
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const archiverTache = createAuthenticatedOperation(archiverTache_ext, {
    TacheCorrective: prisma.tacheCorrective,
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const desarchiverTache = createAuthenticatedOperation(desarchiverTache_ext, {
    TacheCorrective: prisma.tacheCorrective,
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    Reponse: prisma.reponse,
    User: prisma.user,
    Agence: prisma.agence,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const archiverCritere = createAuthenticatedOperation(archiverCritere_ext, {
    Critere: prisma.critere,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const desarchiverCritere = createAuthenticatedOperation(desarchiverCritere_ext, {
    Critere: prisma.critere,
    User: prisma.user,
    Entreprise: prisma.entreprise,
});
// PUBLIC API
export const creerEntreprise = createAuthenticatedOperation(creerEntreprise_ext, {
    Entreprise: prisma.entreprise,
    User: prisma.user,
    Invitation: prisma.invitation,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const suspendreEntreprise = createAuthenticatedOperation(suspendreEntreprise_ext, {
    Entreprise: prisma.entreprise,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const reactiverEntreprise = createAuthenticatedOperation(reactiverEntreprise_ext, {
    Entreprise: prisma.entreprise,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const changerLimitesEntreprise = createAuthenticatedOperation(changerLimitesEntreprise_ext, {
    Entreprise: prisma.entreprise,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const renvoyerInvitation = createAuthenticatedOperation(renvoyerInvitation_ext, {
    Entreprise: prisma.entreprise,
    User: prisma.user,
    Invitation: prisma.invitation,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const inviterSuperAdmin = createAuthenticatedOperation(inviterSuperAdmin_ext, {
    User: prisma.user,
    Invitation: prisma.invitation,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const activerCompte = createAuthenticatedOperation(activerCompte_ext, {
    Invitation: prisma.invitation,
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const changerPlatformRole = createAuthenticatedOperation(changerPlatformRole_ext, {
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const desactiverComptePlatform = createAuthenticatedOperation(desactiverComptePlatform_ext, {
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const setup2fa = createAuthenticatedOperation(setup2fa_ext, {
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const activer2fa = createAuthenticatedOperation(activer2fa_ext, {
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
// PUBLIC API
export const verifier2fa = createAuthenticatedOperation(verifier2fa_ext, {
    User: prisma.user,
    AuditLog: prisma.auditLog,
});
//# sourceMappingURL=index.js.map