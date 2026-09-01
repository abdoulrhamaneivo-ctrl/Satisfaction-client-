import { interpolatePath } from './linkHelpers';
// PUBLIC API
export const routes = {
    LandingPageRoute: {
        to: "/",
        build: (options) => interpolatePath("/", undefined, options?.search, options?.hash),
    },
    NotFoundRoute: {
        to: "*",
        build: (options) => interpolatePath("*", options.params, options?.search, options?.hash),
    },
    LoginRoute: {
        to: "/login",
        build: (options) => interpolatePath("/login", undefined, options?.search, options?.hash),
    },
    PostAuthRedirectRoute: {
        to: "/apres-connexion",
        build: (options) => interpolatePath("/apres-connexion", undefined, options?.search, options?.hash),
    },
    RequestPasswordResetRoute: {
        to: "/request-password-reset",
        build: (options) => interpolatePath("/request-password-reset", undefined, options?.search, options?.hash),
    },
    PasswordResetRoute: {
        to: "/password-reset",
        build: (options) => interpolatePath("/password-reset", undefined, options?.search, options?.hash),
    },
    EmailVerificationRoute: {
        to: "/email-verification",
        build: (options) => interpolatePath("/email-verification", undefined, options?.search, options?.hash),
    },
    AccountRoute: {
        to: "/account",
        build: (options) => interpolatePath("/account", undefined, options?.search, options?.hash),
    },
    FileUploadRoute: {
        to: "/file-upload",
        build: (options) => interpolatePath("/file-upload", undefined, options?.search, options?.hash),
    },
    GuichetsRoute: {
        to: "/guichets",
        build: (options) => interpolatePath("/guichets", undefined, options?.search, options?.hash),
    },
    PlanningRoute: {
        to: "/planning",
        build: (options) => interpolatePath("/planning", undefined, options?.search, options?.hash),
    },
    DashboardRoute: {
        to: "/dashboard",
        build: (options) => interpolatePath("/dashboard", undefined, options?.search, options?.hash),
    },
    AdminPersonnelRoute: {
        to: "/admin/personnel",
        build: (options) => interpolatePath("/admin/personnel", undefined, options?.search, options?.hash),
    },
    GestionAgencesRoute: {
        to: "/admin/agences",
        build: (options) => interpolatePath("/admin/agences", undefined, options?.search, options?.hash),
    },
    AvisRoute: {
        to: "/avis",
        build: (options) => interpolatePath("/avis", undefined, options?.search, options?.hash),
    },
    ConfigurationCriteresRoute: {
        to: "/criteres",
        build: (options) => interpolatePath("/criteres", undefined, options?.search, options?.hash),
    },
    CollecteRoute: {
        to: "/q/:guichetId",
        build: (options) => interpolatePath("/q/:guichetId", options.params, options?.search, options?.hash),
    },
    CollecteCodeRoute: {
        to: "/q/:code",
        build: (options) => interpolatePath("/q/:code", options.params, options?.search, options?.hash),
    },
    AlertesTachesRoute: {
        to: "/alertes-taches",
        build: (options) => interpolatePath("/alertes-taches", undefined, options?.search, options?.hash),
    },
    ArchivesRoute: {
        to: "/archives",
        build: (options) => interpolatePath("/archives", undefined, options?.search, options?.hash),
    },
    SettingsRoute: {
        to: "/settings",
        build: (options) => interpolatePath("/settings", undefined, options?.search, options?.hash),
    },
    PlatformOverviewRoute: {
        to: "/platform",
        build: (options) => interpolatePath("/platform", undefined, options?.search, options?.hash),
    },
    PlatformCompaniesRoute: {
        to: "/platform/entreprises",
        build: (options) => interpolatePath("/platform/entreprises", undefined, options?.search, options?.hash),
    },
    PlatformNewCompanyRoute: {
        to: "/platform/entreprises/nouvelle",
        build: (options) => interpolatePath("/platform/entreprises/nouvelle", undefined, options?.search, options?.hash),
    },
    PlatformCompanyDetailRoute: {
        to: "/platform/entreprises/:id",
        build: (options) => interpolatePath("/platform/entreprises/:id", options.params, options?.search, options?.hash),
    },
    PlatformAuditRoute: {
        to: "/platform/audit",
        build: (options) => interpolatePath("/platform/audit", undefined, options?.search, options?.hash),
    },
    PlatformSecurityRoute: {
        to: "/platform/securite",
        build: (options) => interpolatePath("/platform/securite", undefined, options?.search, options?.hash),
    },
    ActivateAccountRoute: {
        to: "/account/activate",
        build: (options) => interpolatePath("/account/activate", undefined, options?.search, options?.hash),
    },
};
// PUBLIC API
export { Link } from './Link';
// PUBLIC API
export { NavLink } from './NavLink';
//# sourceMappingURL=index.js.map