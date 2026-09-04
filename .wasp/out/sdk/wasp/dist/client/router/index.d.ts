import type { RouteDefinitionsToRoutes, OptionalRouteOptions, ParamValue } from './types';
export declare const routes: {
    readonly LandingPageRoute: {
        readonly to: "/";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly NotFoundRoute: {
        readonly to: "*";
        readonly build: (options: OptionalRouteOptions & {
            params: {
                "*": ParamValue;
            };
        }) => string;
    };
    readonly LoginRoute: {
        readonly to: "/login";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PostAuthRedirectRoute: {
        readonly to: "/apres-connexion";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly RequestPasswordResetRoute: {
        readonly to: "/request-password-reset";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PasswordResetRoute: {
        readonly to: "/password-reset";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly EmailVerificationRoute: {
        readonly to: "/email-verification";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly AccountRoute: {
        readonly to: "/account";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly FileUploadRoute: {
        readonly to: "/file-upload";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly GuichetsRoute: {
        readonly to: "/guichets";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlanningRoute: {
        readonly to: "/planning";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly DashboardRoute: {
        readonly to: "/dashboard";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly AdminPersonnelRoute: {
        readonly to: "/admin/personnel";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly GestionAgencesRoute: {
        readonly to: "/admin/agences";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly AvisRoute: {
        readonly to: "/avis";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly ConfigurationCriteresRoute: {
        readonly to: "/criteres";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly CollecteRoute: {
        readonly to: "/q/:guichetId";
        readonly build: (options: OptionalRouteOptions & {
            params: {
                "guichetId": ParamValue;
            };
        }) => string;
    };
    readonly CollecteCodeRoute: {
        readonly to: "/q/:code";
        readonly build: (options: OptionalRouteOptions & {
            params: {
                "code": ParamValue;
            };
        }) => string;
    };
    readonly AlertesTachesRoute: {
        readonly to: "/alertes-taches";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly ArchivesRoute: {
        readonly to: "/archives";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly SettingsRoute: {
        readonly to: "/settings";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlatformOverviewRoute: {
        readonly to: "/platform";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlatformCompaniesRoute: {
        readonly to: "/platform/entreprises";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlatformNewCompanyRoute: {
        readonly to: "/platform/entreprises/nouvelle";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlatformCompanyDetailRoute: {
        readonly to: "/platform/entreprises/:id";
        readonly build: (options: OptionalRouteOptions & {
            params: {
                "id": ParamValue;
            };
        }) => string;
    };
    readonly PlatformAuditRoute: {
        readonly to: "/platform/audit";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly PlatformSecurityRoute: {
        readonly to: "/platform/securite";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
    readonly ActivateAccountRoute: {
        readonly to: "/account/activate";
        readonly build: (options?: OptionalRouteOptions) => string;
    };
};
export type Routes = RouteDefinitionsToRoutes<typeof routes>;
export { Link } from './Link';
export { NavLink } from './NavLink';
//# sourceMappingURL=index.d.ts.map