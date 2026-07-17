/**
 * This module contains sample data that can be used for testing purposes.
 * In our case the sample data represents TsAppSpec data.
 */
import { App } from "../../src/legacy/publicApi/App.js";
export function createApp(scope) {
    const { name: appName, config: appConfig } = getAppConfig(scope);
    const app = new App(appName, appConfig);
    switch (scope) {
        case "minimal":
            return { appConfigName: appName, app };
        case "full": {
            app.auth(getAuthConfig("full"));
            app.client(getClientConfig("full"));
            app.server(getServerConfig("full"));
            app.emailSender(getEmailSenderConfig("full"));
            app.webSocket(getWebSocketConfig("full"));
            app.db(getDbConfig("full"));
            /**
             * We thinks this may be a false positive
             * @see https://www.typescriptlang.org/play/?#code/LAKAxgNghgzjAEAZKBzKA7A9vA3qe8ADgE4BuUAFAC4AWAljAFxKoaYA08AHszFcXXQoAlM1KY6AE1wBffPEnEArmmr0mLNFk4946JQFsARgFNio+OKmzQckKCoBPQifgA5KAZMAVTN+euALy48gDaANLwgvAA1iaOmABmmmwAuswAClDEniZUZjAAPMhamBGpAHyhAAyptqCgYJjofPDQWoJ08MHoJgDuKVgUwgDcDSCJSuhgVHTN8PkwMZiFALLwJlz56JIIcQnJHl6+-i4VFOi5zKuc2SjMRz5+AaGrqRZW0nggBO0YnaFLl5UhQ7sJ4AB6CHwABWZngfAEQngADI9IZTMRunoTKQzPUQEA
             */
            function addNamedDecl({ declName, namedConfigs, }) {
                namedConfigs.forEach(({ name, config }) => 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                app[declName](name, config));
            }
            addNamedDecl({
                declName: "page",
                namedConfigs: getPageConfigs(),
            });
            addNamedDecl({
                declName: "route",
                namedConfigs: getRouteConfigs(),
            });
            addNamedDecl({
                declName: "query",
                namedConfigs: getQueryConfigs(),
            });
            addNamedDecl({
                declName: "action",
                namedConfigs: getActionConfigs(),
            });
            addNamedDecl({
                declName: "crud",
                namedConfigs: getCrudConfigs(),
            });
            addNamedDecl({
                declName: "apiNamespace",
                namedConfigs: getApiNamespaceConfigs(),
            });
            addNamedDecl({
                declName: "api",
                namedConfigs: getApiConfigs(),
            });
            addNamedDecl({
                declName: "job",
                namedConfigs: getJobConfigs(),
            });
            return { appConfigName: appName, app };
        }
        default:
            assertUnreachable(scope);
    }
}
export function getAppConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalApp",
                config: {
                    title: "Mock App",
                    wasp: { version: "^0.16.3" },
                },
            };
        case "full":
            return {
                name: "FullApp",
                config: {
                    title: "Mock App",
                    wasp: { version: "^0.16.3" },
                    head: ['<link rel="icon" href="/favicon.ico" />'],
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getAuthConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                userEntity: getEntity("user"),
                onAuthFailedRedirectTo: "/login",
                methods: getAuthMethods(scope),
            };
        case "full":
            return {
                userEntity: getEntity("user"),
                onAuthFailedRedirectTo: "/login",
                methods: getAuthMethods(scope),
                onAuthSucceededRedirectTo: "/profile",
                onBeforeSignup: getExtImport(scope, "named"),
                onAfterSignup: getExtImport(scope, "named"),
                onAfterEmailVerified: getExtImport(scope, "named"),
                onBeforeOAuthRedirect: getExtImport(scope, "named"),
                onBeforeLogin: getExtImport(scope, "named"),
                onAfterLogin: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getAuthMethods(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                email: getEmailAuthConfig(scope),
                usernameAndPassword: getUsernameAndPasswordConfig(scope),
                slack: getExternalAuthConfig(scope),
                discord: getExternalAuthConfig(scope),
                google: getExternalAuthConfig(scope),
                gitHub: getExternalAuthConfig(scope),
                keycloak: getExternalAuthConfig(scope),
                microsoft: getExternalAuthConfig(scope),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getExternalAuthConfig(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                configFn: getExtImport(scope, "named"),
                userSignupFields: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getUsernameAndPasswordConfig(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                userSignupFields: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getEmailAuthConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                fromField: getEmailFromField(scope),
                emailVerification: getEmailVerificationConfig(scope),
                passwordReset: getPasswordResetConfig(scope),
            };
        case "full":
            return {
                fromField: getEmailFromField(scope),
                emailVerification: getEmailVerificationConfig(scope),
                passwordReset: getPasswordResetConfig(scope),
                userSignupFields: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getPasswordResetConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                clientRoute: getRouteConfig("password-reset").name,
            };
        case "full":
            return {
                clientRoute: getRouteConfig("password-reset").name,
                getEmailContentFn: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getEmailVerificationConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                clientRoute: getRouteConfig("email-verification").name,
            };
        case "full":
            return {
                clientRoute: getRouteConfig("email-verification").name,
                getEmailContentFn: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getClientConfig(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                rootComponent: getExtImport(scope, "named"),
                setupFn: getExtImport(scope, "named"),
                baseDir: "/src",
                envValidationSchema: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getServerConfig(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                setupFn: getExtImport(scope, "named"),
                middlewareConfigFn: getExtImport(scope, "named"),
                envValidationSchema: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getEmailSenderConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                provider: "SMTP",
            };
        case "full":
            return {
                provider: "SMTP",
                defaultFrom: getEmailFromField(scope),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getWebSocketConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                fn: getExtImport(scope, "named"),
            };
        case "full":
            return {
                fn: getExtImport(scope, "named"),
                autoConnect: true,
            };
        default:
            assertUnreachable(scope);
    }
}
export function getDbConfig(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                seeds: [getExtImport(scope, "named"), getExtImport(scope, "default")],
                prismaSetupFn: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getPageConfigs() {
    return PAGE_CONFIG_TYPES.map(getPageConfig);
}
export function getPageConfig(pageType) {
    const name = `${pageType}-page`;
    switch (pageType) {
        case "minimal":
            return {
                name,
                config: {
                    component: getExtImport(pageType, "named"),
                },
            };
        case "email-verification":
            return {
                name,
                config: {
                    component: getExtImport("full", "named"),
                    authRequired: false,
                },
            };
        case "password-reset":
            return {
                name,
                config: {
                    component: getExtImport("full", "named"),
                    authRequired: false,
                },
            };
        case "full":
            return {
                name,
                config: {
                    component: getExtImport(pageType, "named"),
                    authRequired: true,
                },
            };
        default:
            assertUnreachable(pageType);
    }
}
export function getRouteConfigs() {
    return PAGE_CONFIG_TYPES.map(getRouteConfig);
}
export function getRouteConfig(routeType) {
    const name = `${routeType}-route`;
    switch (routeType) {
        case "minimal":
            return {
                name,
                config: {
                    path: "/foo/bar",
                    to: getPageConfig(routeType).name,
                },
            };
        case "full":
        case "email-verification":
        case "password-reset":
            return {
                name,
                config: {
                    path: "/foo/bar",
                    to: getPageConfig(routeType).name,
                    prerender: true,
                    lazy: false,
                },
            };
        default:
            assertUnreachable(routeType);
    }
}
export function getQueryConfigs() {
    return CONFIG_TYPES.map(getQueryConfig);
}
export function getQueryConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalQuery",
                config: {
                    fn: getExtImport(scope, "named"),
                },
            };
        case "full":
            return {
                name: "FullQuery",
                config: {
                    fn: getExtImport(scope, "named"),
                    entities: [getEntity("task")],
                    auth: true,
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getActionConfigs() {
    return CONFIG_TYPES.map(getActionConfig);
}
export function getActionConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalAction",
                config: {
                    fn: getExtImport(scope, "named"),
                },
            };
        case "full":
            return {
                name: "FullAction",
                config: {
                    fn: getExtImport(scope, "named"),
                    entities: [getEntity("task")],
                    auth: true,
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getCrudConfigs() {
    return CONFIG_TYPES.map(getCrudConfig);
}
export function getCrudConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalCrud",
                config: {
                    entity: getEntity("task"),
                    operations: getCrudOperations(scope),
                },
            };
        case "full":
            return {
                name: "FullCrud",
                config: {
                    entity: getEntity("task"),
                    operations: getCrudOperations(scope),
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getCrudOperations(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                get: getCrudOperationOptions(scope),
                getAll: getCrudOperationOptions(scope),
                create: getCrudOperationOptions(scope),
                update: getCrudOperationOptions(scope),
                delete: getCrudOperationOptions(scope),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getCrudOperationOptions(scope) {
    switch (scope) {
        case "minimal":
            return {};
        case "full":
            return {
                isPublic: true,
                overrideFn: getExtImport(scope, "named"),
            };
        default:
            assertUnreachable(scope);
    }
}
export function getSchedule(scope) {
    switch (scope) {
        case "minimal":
            return {
                cron: "0 0 * * *",
            };
        case "full":
            return {
                cron: "0 0 * * *",
                args: { foo: "bar" },
                executorOptions: {
                    pgBoss: { jobOptions: { attempts: 3 } },
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getPerform(scope) {
    switch (scope) {
        case "minimal":
            return {
                fn: getExtImport(scope, "named"),
            };
        case "full":
            return {
                fn: getExtImport(scope, "named"),
                executorOptions: {
                    pgBoss: { jobOptions: { attempts: 3 } },
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getApiNamespaceConfigs() {
    return CONFIG_TYPES.map(getApiNamespaceConfig);
}
export function getApiNamespaceConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalApiNamespace",
                config: {
                    middlewareConfigFn: getExtImport(scope, "named"),
                    path: "/foo",
                },
            };
        case "full":
            return {
                name: "FullApiNamespace",
                config: {
                    middlewareConfigFn: getExtImport(scope, "named"),
                    path: "/foo",
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getApiConfigs() {
    return CONFIG_TYPES.map(getApiConfig);
}
export function getApiConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalApi",
                config: {
                    fn: getExtImport(scope, "named"),
                    httpRoute: getHttpRoute(scope),
                },
            };
        case "full":
            return {
                name: "FullApi",
                config: {
                    fn: getExtImport(scope, "named"),
                    httpRoute: getHttpRoute(scope),
                    entities: [getEntity("task")],
                    auth: true,
                    middlewareConfigFn: getExtImport(scope, "named"),
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getHttpRoute(scope) {
    switch (scope) {
        case "minimal":
            return {
                method: "GET",
                route: "/foo/bar",
            };
        case "full":
            return {
                method: "GET",
                route: "/foo/bar",
            };
        default:
            assertUnreachable(scope);
    }
}
export function getJobConfigs() {
    return CONFIG_TYPES.map(getJobConfig);
}
export function getJobConfig(scope) {
    switch (scope) {
        case "minimal":
            return {
                name: "MinimalJob",
                config: {
                    executor: "PgBoss",
                    perform: getPerform(scope),
                },
            };
        case "full":
            return {
                name: "FullJob",
                config: {
                    executor: "PgBoss",
                    perform: getPerform(scope),
                    entities: [getEntity("task")],
                    schedule: getSchedule(scope),
                },
            };
        default:
            assertUnreachable(scope);
    }
}
export function getEmailFromField(scope) {
    switch (scope) {
        case "minimal":
            return {
                email: "test@domain.tld",
            };
        case "full":
            return {
                email: "test@domain.tld",
                name: "ToDo App",
            };
        default:
            assertUnreachable(scope);
    }
}
export function getExtImport(scope, importKind) {
    const importObject = importKind === "default"
        ? { importDefault: "defaultExport" }
        : { import: "namedExport" };
    switch (scope) {
        case "minimal":
            return {
                ...importObject,
                from: "@src/external",
            };
        case "full":
            return {
                ...importObject,
                from: "@src/external",
            };
        default:
            assertUnreachable(scope);
    }
}
export function getEntity(entity) {
    switch (entity) {
        case "task":
            return "Task";
        case "user":
            return "User";
        case "social-user":
            return "SocialUser";
        default:
            assertUnreachable(entity);
    }
}
export function getEntities(scope) {
    switch (scope) {
        case "minimal":
            return [];
        case "full":
            return ENTITY_CONFIG_TYPES.map(getEntity);
        default:
            assertUnreachable(scope);
    }
}
function assertUnreachable(value) {
    throw new Error(`Unhandled case: ${value}`);
}
const CONFIG_TYPES = ["minimal", "full"];
/**
 * By default we define only `ConfigType` variants for all of the configs
 * that can be used in the app. This is because we want to test both
 * edge cases of the configs.
 *
 * Pages are a special case, because even though they are a top-level config,
 * they are also used by `AuthConfig`. That is why we define those two cases separately.
 * Mostly to bring attention that we have additional edge cases for pages.
 */
const PAGE_CONFIG_TYPES = [
    ...CONFIG_TYPES,
    "email-verification",
    "password-reset",
];
const ENTITY_CONFIG_TYPES = ["task", "user", "social-user"];
