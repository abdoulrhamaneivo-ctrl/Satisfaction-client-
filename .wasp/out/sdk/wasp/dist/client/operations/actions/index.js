import { createAction } from './core';
// PUBLIC API
export const updateProfile = createAction('operations/update-profile', ['User']);
// PUBLIC API
export const changePassword = createAction('operations/change-password', ['User']);
// PUBLIC API
export const changeEmail = createAction('operations/change-email', ['User']);
// PUBLIC API
export const addFileToDb = createAction('operations/add-file-to-db', ['User', 'File']);
// PUBLIC API
export const createFileUploadUrl = createAction('operations/create-file-upload-url', ['User', 'File']);
// PUBLIC API
export const deleteFile = createAction('operations/delete-file', ['User', 'File']);
// PUBLIC API
export const createGuichet = createAction('operations/create-guichet', ['Guichet', 'User', 'Service', 'AffectationGuichet', 'Agence']);
// PUBLIC API
export const assignAgent = createAction('operations/assign-agent', ['User', 'AffectationGuichet', 'Guichet', 'Agence']);
// PUBLIC API
export const updateAffectationGuichet = createAction('operations/update-affectation-guichet', ['User', 'AffectationGuichet', 'Guichet', 'Agence']);
// PUBLIC API
export const deleteAffectationGuichet = createAction('operations/delete-affectation-guichet', ['AffectationGuichet', 'Guichet', 'Agence']);
// PUBLIC API
export const soumettreAvis = createAction('operations/soumettre-avis', ['Reponse', 'Critere', 'AgenceCritere', 'CritereService', 'Guichet', 'AffectationGuichet', 'Alerte', 'VoteAntiRejeu', 'Service', 'User', 'AnalyseAvisIA', 'Canal']);
// PUBLIC API
export const createAgence = createAction('operations/create-agence', ['Agence', 'User', 'Entreprise']);
// PUBLIC API
export const updateAgent = createAction('operations/update-agent', ['User', 'Agence']);
// PUBLIC API
export const deleteAgent = createAction('operations/delete-agent', ['User', 'Agence']);
// PUBLIC API
export const reactivateAgent = createAction('operations/reactivate-agent', ['User', 'Agence']);
// PUBLIC API
export const promouvoirAgent = createAction('operations/promouvoir-agent', ['User', 'Agence']);
// PUBLIC API
export const inviteAgent = createAction('operations/invite-agent', ['User', 'Agence', 'Entreprise', 'Invitation']);
// PUBLIC API
export const renvoyerInvitationAgent = createAction('operations/renvoyer-invitation-agent', ['User', 'Agence', 'Invitation', 'AuditLog']);
// PUBLIC API
export const toggleCritereAgence = createAction('operations/toggle-critere-agence', ['AgenceCritere', 'User', 'Agence']);
// PUBLIC API
export const createCritere = createAction('operations/create-critere', ['Critere', 'AgenceCritere', 'User', 'Agence', 'Service']);
// PUBLIC API
export const createService = createAction('operations/create-service', ['Service', 'User']);
// PUBLIC API
export const upsertObjectif = createAction('operations/upsert-objectif', ['Objectif', 'Agence', 'Critere', 'User']);
// PUBLIC API
export const deleteObjectif = createAction('operations/delete-objectif', ['Objectif', 'Agence', 'User']);
// PUBLIC API
export const createTacheCorrective = createAction('operations/create-tache-corrective', ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const updateStatutTache = createAction('operations/update-statut-tache', ['TacheCorrective', 'TacheCorrectiveHistorique', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const marquerAlerteTraitee = createAction('operations/marquer-alerte-traitee', ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const updateGuichetServices = createAction('operations/update-guichet-services', ['Guichet', 'Service', 'User', 'Agence']);
// PUBLIC API
export const moveCritereToService = createAction('operations/move-critere-to-service', ['CritereService', 'Critere', 'Service', 'User']);
// PUBLIC API
export const removeCritereFromService = createAction('operations/remove-critere-from-service', ['CritereService', 'Critere', 'Service', 'User']);
// PUBLIC API
export const deleteCritere = createAction('operations/delete-critere', ['Critere', 'Reponse', 'AgenceCritere', 'CritereService', 'Objectif', 'User']);
// PUBLIC API
export const duplicateCritere = createAction('operations/duplicate-critere', ['Critere', 'AgenceCritere', 'CritereService', 'Agence', 'Service', 'User']);
// PUBLIC API
export const updateCritere = createAction('operations/update-critere', ['Critere', 'User']);
// PUBLIC API
export const reorderCriteresInService = createAction('operations/reorder-criteres-in-service', ['CritereService', 'Service', 'User']);
// PUBLIC API
export const archiverGuichet = createAction('operations/archiver-guichet', ['Guichet', 'User', 'Agence']);
// PUBLIC API
export const desarchiverGuichet = createAction('operations/desarchiver-guichet', ['Guichet', 'User', 'Agence']);
// PUBLIC API
export const archiverAgence = createAction('operations/archiver-agence', ['Agence', 'Guichet', 'User']);
// PUBLIC API
export const desarchiverAgence = createAction('operations/desarchiver-agence', ['Agence', 'User']);
// PUBLIC API
export const archiverAlerte = createAction('operations/archiver-alerte', ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const desarchiverAlerte = createAction('operations/desarchiver-alerte', ['Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const archiverTache = createAction('operations/archiver-tache', ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const desarchiverTache = createAction('operations/desarchiver-tache', ['TacheCorrective', 'Alerte', 'Guichet', 'Reponse', 'User', 'Agence']);
// PUBLIC API
export const archiverCritere = createAction('operations/archiver-critere', ['Critere', 'User']);
// PUBLIC API
export const desarchiverCritere = createAction('operations/desarchiver-critere', ['Critere', 'User']);
// PUBLIC API
export const creerEntreprise = createAction('operations/creer-entreprise', ['Entreprise', 'User', 'Invitation', 'AuditLog']);
// PUBLIC API
export const suspendreEntreprise = createAction('operations/suspendre-entreprise', ['Entreprise', 'AuditLog']);
// PUBLIC API
export const reactiverEntreprise = createAction('operations/reactiver-entreprise', ['Entreprise', 'AuditLog']);
// PUBLIC API
export const changerLimitesEntreprise = createAction('operations/changer-limites-entreprise', ['Entreprise', 'AuditLog']);
// PUBLIC API
export const renvoyerInvitation = createAction('operations/renvoyer-invitation', ['Entreprise', 'User', 'Invitation', 'AuditLog']);
// PUBLIC API
export const inviterSuperAdmin = createAction('operations/inviter-super-admin', ['User', 'Invitation', 'AuditLog']);
// PUBLIC API
export const activerCompte = createAction('operations/activer-compte', ['Invitation', 'User', 'AuditLog']);
// PUBLIC API
export const changerPlatformRole = createAction('operations/changer-platform-role', ['User', 'AuditLog']);
// PUBLIC API
export const desactiverComptePlatform = createAction('operations/desactiver-compte-platform', ['User', 'AuditLog']);
// PUBLIC API
export const setup2fa = createAction('operations/setup2fa', ['User', 'AuditLog']);
// PUBLIC API
export const activer2fa = createAction('operations/activer2fa', ['User', 'AuditLog']);
// PUBLIC API
export const verifier2fa = createAction('operations/verifier2fa', ['User', 'AuditLog']);
//# sourceMappingURL=index.js.map