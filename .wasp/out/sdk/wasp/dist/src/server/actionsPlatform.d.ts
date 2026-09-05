import { type PlatformRole } from './middleware/rowLevelSecurity';
export declare const PLANS: Record<string, {
    agences: number;
    utilisateurs: number;
    guichets: number;
}>;
export declare function lienActivation(tokenClair: string): string;
export declare function envoyerEmailActivation(params: {
    to: string;
    prenom: string;
    nomEntreprise: string;
    lien: string;
}): Promise<void>;
export declare const creerEntreprise: (args: {
    entreprise: {
        nom_entreprise: string;
        nom_court?: string;
        email_administratif?: string;
        telephone?: string;
        pays?: string;
    };
    admin: {
        prenom: string;
        nom: string;
        email: string;
        telephone?: string;
    };
    plan: string;
    limite_agences: number;
    limite_utilisateurs: number;
    limite_guichets: number;
    totpCode: string;
}, context: any) => Promise<any>;
export declare const suspendreEntreprise: (args: {
    id_entreprise: number;
    motif: string;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const reactiverEntreprise: (args: {
    id_entreprise: number;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const changerLimitesEntreprise: (args: {
    id_entreprise: number;
    limite_agences?: number;
    limite_utilisateurs?: number;
    limite_guichets?: number;
    plan?: string;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const renvoyerInvitation: (args: {
    id_entreprise: number;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const inviterSuperAdmin: (args: {
    email: string;
    prenom: string;
    nom: string;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const activerCompte: (args: {
    token: string;
    motDePasse: string;
    confirmation: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const changerPlatformRole: (args: {
    id_user_cible: string;
    nouveauRole: "SUPER_ADMIN" | "SUPPORT" | "NONE";
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
export declare const desactiverComptePlatform: (args: {
    id_user_cible: string;
    totpCode: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
/**
 * Étape 1 : générer un secret TOTP chiffré et l'URL otpauth (à encoder en QR
 * côté front). Le secret n'est PAS encore actif tant que activer2fa n'a pas
 * validé un premier code.
 */
export declare const setup2fa: (_args: void, context: any) => Promise<{
    otpauth_url: string;
    secret_pour_qr: string;
}>;
/**
 * Étape 2 : confirmer le premier code → active la 2FA.
 */
export declare const activer2fa: (args: {
    code: string;
}, context: any) => Promise<{
    ok: boolean;
    message: string;
}>;
/**
 * Vérification à l'ouverture de session console : compare le code fourni au
 * secret déchiffré. La "session 2FA validée" est portée par le front (état en
 * mémoire pendant la vie de l'onglet) — le vrai verrou reste le serveur qui
 * refuse les opérations sensibles sans preuve récente (voir exiger2faRecent).
 */
export declare const verifier2fa: (args: {
    code: string;
}, context: any) => Promise<{
    ok: boolean;
    deux_fa: boolean;
}>;
export type { PlatformRole };
//# sourceMappingURL=actionsPlatform.d.ts.map