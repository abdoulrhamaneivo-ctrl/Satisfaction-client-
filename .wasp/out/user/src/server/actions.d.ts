type CreateGuichetArgs = {
    nomGuichet: string;
    typeGuichet: string;
    id_agence: number;
    serviceIds?: number[];
};
export declare const genererCodePublic: () => string;
export declare const createGuichet: (args: CreateGuichetArgs, context: any) => Promise<any>;
export declare const updateGuichetServices: (args: {
    id_guichet: number;
    serviceIds: number[];
}, context: any) => Promise<any>;
export declare const archiverGuichet: (args: {
    id_guichet: number;
}, context: any) => Promise<any>;
export declare const desarchiverGuichet: (args: {
    id_guichet: number;
}, context: any) => Promise<any>;
export declare const assignAgent: (args: any, context: any) => Promise<any>;
/**
 * Modifie une affectation existante (créneau, guichet ou agent).
 * Réutilise les mêmes contrôles d'accès et la même détection de
 * chevauchement que assignAgent, en excluant l'affectation modifiée
 * elle-même de la recherche de chevauchement.
 */
export declare const updateAffectationGuichet: (args: any, context: any) => Promise<any>;
/**
 * Retire une affectation du planning (guichet libéré pour ce créneau).
 * Note : on ne touche pas aux avis déjà collectés pendant ce créneau
 * (Reponse.id_agent conserve son historique, indépendant du planning).
 */
export declare const deleteAffectationGuichet: (args: any, context: any) => Promise<{
    success: boolean;
}>;
/**
 * La collecte est une route publique : aucune exception technique ne doit y
 * parvenir telle quelle. Les erreurs métier gardent leur code (400, 404,
 * 429) ; les erreurs imprévues restent tracées dans Railway avec leur cause,
 * mais le client reçoit une réponse exploitable et sans URL interne.
 */
export declare const soumettreAvis: (args: any, context: any) => Promise<any>;
export declare const updateAgent: (args: {
    id: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    id_agence?: number;
}, context: any) => Promise<any>;
export declare const deleteAgent: (args: {
    id: string;
}, context: any) => Promise<any>;
export declare const reactivateAgent: (args: {
    id: string;
}, context: any) => Promise<any>;
export declare const promouvoirAgent: (args: {
    id_agent: string;
}, context: any) => Promise<any>;
export declare const updateBranding: (args: Record<string, any>, context: any) => Promise<any>;
export declare const createAgence: (args: {
    nom_agence: string;
    commune: string;
    adresse?: string;
    heure_ouverture?: string;
    heure_fermeture?: string;
}, context: any) => Promise<any>;
/**
 * Archive une agence fermée définitivement. Cascade volontaire : ses
 * guichets sont archivés en même temps (une agence fermée n'a plus de
 * guichets ouverts), horodatés à l'identique pour qu'on sache qu'ils ont
 * été fermés "avec" l'agence plutôt qu'individuellement. Rien n'est
 * supprimé : avis, alertes et statistiques historiques restent intacts et
 * consultables.
 */
export declare const archiverAgence: (args: {
    id_agence: number;
}, context: any) => Promise<any>;
/**
 * Désarchive une agence. Choix délibéré : ne restaure PAS automatiquement
 * ses guichets — une réouverture d'agence ne rouvre pas forcément tous les
 * anciens guichets tels quels (locaux réaménagés, etc.). Chaque guichet se
 * désarchive donc individuellement depuis la page Guichets.
 */
export declare const desarchiverAgence: (args: {
    id_agence: number;
}, context: any) => Promise<any>;
export declare const inviteAgent: (args: {
    email?: string;
    nom: string;
    prenom: string;
    id_agence: number;
    role: string;
    telephone?: string;
}, context: any) => Promise<any>;
export declare const renvoyerInvitationAgent: (args: {
    id_user: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const toggleCritereAgence: (args: {
    id_critere: number;
    id_agence?: number;
    active: boolean;
}, context: any) => Promise<any>;
export declare const createService: (args: {
    libelle_service: string;
}, context: any) => Promise<any>;
export declare const createCritere: (args: {
    libelle_critere: string;
    description?: string;
    type_reponse?: string;
    options_reponse?: string;
    obligatoire?: boolean;
    id_agence?: number;
    serviceIds?: number[];
}, context: any) => Promise<{
    id: number;
    libelle_critere: string;
    description: string | null;
    type_reponse: string;
    options_reponse: string | null;
    obligatoire: boolean;
    archive: boolean;
    date_archivage: Date | null;
    id_entreprise: number | null;
}>;
/**
 * Met à jour un critère existant (libellé, description, type de réponse,
 * options et caractère obligatoire). Seuls les champs fournis sont modifiés.
 * Permet de corriger une question directement depuis le tableau
 * d'organisation (glisser-déposer) sans repasser par le formulaire complet.
 */
export declare const updateCritere: (args: {
    id_critere: number;
    libelle_critere?: string;
    description?: string;
    type_reponse?: string;
    options_reponse?: string;
    obligatoire?: boolean;
}, context: any) => Promise<any>;
/**
 * Déplace une question (critère) vers une opération, à une position donnée
 * (glisser-déposer depuis le vivier "non assignées" vers une colonne
 * d'opération, ou d'une opération vers une autre). Si la question était déjà
 * rattachée à une autre opération, elle en est retirée (une question ne
 * peut être active que dans les opérations où elle est explicitement
 * placée). `ordre` est la position cible dans la colonne de destination ;
 * les autres questions de cette colonne sont décalées en conséquence.
 */
export declare const moveCritereToService: (args: {
    id_critere: number;
    id_service: number;
    ordre: number;
}, context: any) => Promise<{
    success: boolean;
}>;
/** Retire une question d'une opération (retour dans le vivier "non assignées"). */
export declare const removeCritereFromService: (args: {
    id_critere: number;
    id_service: number;
}, context: any) => Promise<{
    success: boolean;
}>;
/**
 * Supprime définitivement un critère créé par l'entreprise courante.
 * Les critères "socle" (id_entreprise NULL, fournis par la plateforme) ne
 * sont jamais supprimables. S'il existe déjà des réponses de clients
 * rattachées à ce critère, la suppression est refusée (on perdrait de
 * l'historique d'avis) : on invite plutôt à le désactiver via
 * toggleCritereAgence, ce qui le cache sans effacer les données passées.
 */
export declare const deleteCritere: (args: {
    id_critere: number;
}, context: any) => Promise<{
    success: boolean;
}>;
/**
 * Duplique un critère existant (y compris un critère "socle" partagé) en
 * une copie appartenant à l'entreprise courante — pratique pour partir d'un
 * standard existant et l'adapter légèrement sans toucher à l'original.
 * La copie reprend les mêmes activations par agence et les mêmes
 * rattachements à des opérations que l'original.
 */
export declare const duplicateCritere: (args: {
    id_critere: number;
}, context: any) => Promise<{
    id: number;
    libelle_critere: string;
    description: string | null;
    type_reponse: string;
    options_reponse: string | null;
    obligatoire: boolean;
    archive: boolean;
    date_archivage: Date | null;
    id_entreprise: number | null;
}>;
/**
 * Réordonnancement en masse d'une opération : reçoit la liste complète des
 * ids de critères dans le nouvel ordre souhaité (résultat d'un drag & drop
 * réordonnant plusieurs cartes à la fois côté client).
 */
export declare const reorderCriteresInService: (args: {
    id_service: number;
    orderedCritereIds: number[];
}, context: any) => Promise<{
    success: boolean;
}>;
export declare const upsertObjectif: (args: {
    id_agence?: number;
    id_critere: number;
    valeur_cible: number;
    date_debut: string;
    date_fin: string;
}, context: any) => Promise<any>;
export declare const createTacheCorrective: (args: {
    id_alerte: number;
    titre: string;
    description?: string;
    date_echeance: string;
    id_responsable: string;
}, context: any) => Promise<any>;
export declare const updateStatutTache: (args: {
    id: number;
    statut: "A_FAIRE" | "EN_COURS" | "TERMINEE";
}, context: any) => Promise<any>;
export declare const marquerAlerteTraitee: (args: {
    id_alerte: number;
}, context: any) => Promise<any>;
export declare const deleteObjectif: (args: {
    id: number;
}, context: any) => Promise<any>;
/**
 * Archive manuellement une alerte déjà traitée (le job quotidien
 * `archiverElementsResolusAnciens` le fait automatiquement pour celles de
 * plus de 6 mois, mais un manager peut vouloir alléger sa vue plus tôt).
 * On refuse d'archiver une alerte encore NOUVELLE : elle doit d'abord être
 * traitée, sinon on perdrait sa visibilité opérationnelle par erreur.
 */
export declare const archiverAlerte: (args: {
    id_alerte: number;
}, context: any) => Promise<any>;
export declare const desarchiverAlerte: (args: {
    id_alerte: number;
}, context: any) => Promise<any>;
/**
 * Archive manuellement une tâche déjà TERMINEE. Même règle d'autorisation
 * que updateStatutTache : un profil de gestion, ou le responsable de la
 * tâche lui-même.
 */
export declare const archiverTache: (args: {
    id_tache: number;
}, context: any) => Promise<any>;
export declare const desarchiverTache: (args: {
    id_tache: number;
}, context: any) => Promise<any>;
export declare const archiverCritere: (args: {
    id_critere: number;
}, context: any) => Promise<any>;
export declare const desarchiverCritere: (args: {
    id_critere: number;
}, context: any) => Promise<any>;
export {};
