import { interpolatePath } from './linkHelpers'
import type {
  RouteDefinitionsToRoutes,
  OptionalRouteOptions,
  ParamValue,
  ExpandRouteOnOptionalStaticSegments,
} from './types'

// PUBLIC API
export const routes = {
  LandingPageRoute: {
    to: "/",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  NotFoundRoute: {
    to: "*",
    build: (
      options: OptionalRouteOptions
      & { params: {"*": ParamValue;}}
    ) => interpolatePath(
        
        "*",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  LoginRoute: {
    to: "/login",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/login",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PostAuthRedirectRoute: {
    to: "/apres-connexion",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/apres-connexion",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  RequestPasswordResetRoute: {
    to: "/request-password-reset",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/request-password-reset",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PasswordResetRoute: {
    to: "/password-reset",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/password-reset",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  EmailVerificationRoute: {
    to: "/email-verification",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/email-verification",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  AccountRoute: {
    to: "/account",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/account",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  FileUploadRoute: {
    to: "/file-upload",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/file-upload",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  GuichetsRoute: {
    to: "/guichets",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/guichets",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlanningRoute: {
    to: "/planning",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/planning",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  DashboardRoute: {
    to: "/dashboard",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/dashboard",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  AdminPersonnelRoute: {
    to: "/admin/personnel",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/admin/personnel",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  GestionAgencesRoute: {
    to: "/admin/agences",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/admin/agences",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  AvisRoute: {
    to: "/avis",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/avis",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  ConfigurationCriteresRoute: {
    to: "/criteres",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/criteres",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  CollecteRoute: {
    to: "/q/:guichetId",
    build: (
      options: OptionalRouteOptions
      & { params: {"guichetId": ParamValue;}}
    ) => interpolatePath(
        
        "/q/:guichetId",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  CollecteCodeRoute: {
    to: "/q/:code",
    build: (
      options: OptionalRouteOptions
      & { params: {"code": ParamValue;}}
    ) => interpolatePath(
        
        "/q/:code",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  AlertesTachesRoute: {
    to: "/alertes-taches",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/alertes-taches",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  ArchivesRoute: {
    to: "/archives",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/archives",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  SettingsRoute: {
    to: "/settings",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/settings",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlatformOverviewRoute: {
    to: "/platform",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/platform",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlatformCompaniesRoute: {
    to: "/platform/entreprises",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/platform/entreprises",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlatformNewCompanyRoute: {
    to: "/platform/entreprises/nouvelle",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/platform/entreprises/nouvelle",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlatformCompanyDetailRoute: {
    to: "/platform/entreprises/:id",
    build: (
      options: OptionalRouteOptions
      & { params: {"id": ParamValue;}}
    ) => interpolatePath(
        
        "/platform/entreprises/:id",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  PlatformAuditRoute: {
    to: "/platform/audit",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/platform/audit",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PlatformSecurityRoute: {
    to: "/platform/securite",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/platform/securite",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  ActivateAccountRoute: {
    to: "/account/activate",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/account/activate",
        undefined,
        options?.search,
        options?.hash
      ),
  },
} as const;

// PRIVATE API
export type Routes = RouteDefinitionsToRoutes<typeof routes>

// PUBLIC API
export { Link } from './Link'
// PUBLIC API
export { NavLink } from './NavLink'
