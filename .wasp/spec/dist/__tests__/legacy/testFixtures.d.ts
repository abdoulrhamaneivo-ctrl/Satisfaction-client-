/**
 * This module contains sample data that can be used for testing purposes.
 * In our case the sample data represents TsAppSpec data.
 */
import * as AppSpec from "../../src/appSpec.js";
import { Branded } from "../../src/branded.js";
import { App } from "../../src/legacy/publicApi/App.js";
import * as TsAppSpec from "../../src/legacy/publicApi/tsAppSpec.js";
export declare function createApp(scope: ConfigType): {
    appConfigName: string;
    app: App;
};
export declare function getAppConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.AppConfig>;
export declare function getAppConfig(scope: "full"): FullNamedConfig<TsAppSpec.AppConfig>;
export declare function getAppConfig(scope: ConfigType): NamedConfig<TsAppSpec.AppConfig>;
export declare function getAuthConfig(scope: "minimal"): MinimalConfig<TsAppSpec.AuthConfig>;
export declare function getAuthConfig(scope: "full"): FullConfig<TsAppSpec.AuthConfig>;
export declare function getAuthConfig(scope: ConfigType): Config<TsAppSpec.AuthConfig>;
export declare function getAuthMethods(scope: "minimal"): MinimalConfig<TsAppSpec.AuthMethods>;
export declare function getAuthMethods(scope: "full"): FullConfig<TsAppSpec.AuthMethods>;
export declare function getAuthMethods(scope: ConfigType): Config<TsAppSpec.AuthMethods>;
export declare function getExternalAuthConfig(scope: "minimal"): MinimalConfig<TsAppSpec.ExternalAuthConfig>;
export declare function getExternalAuthConfig(scope: "full"): FullConfig<TsAppSpec.ExternalAuthConfig>;
export declare function getExternalAuthConfig(scope: ConfigType): Config<TsAppSpec.ExternalAuthConfig>;
export declare function getUsernameAndPasswordConfig(scope: "minimal"): MinimalConfig<TsAppSpec.UsernameAndPasswordConfig>;
export declare function getUsernameAndPasswordConfig(scope: "full"): FullConfig<TsAppSpec.UsernameAndPasswordConfig>;
export declare function getUsernameAndPasswordConfig(scope: ConfigType): Config<TsAppSpec.UsernameAndPasswordConfig>;
export declare function getEmailAuthConfig(scope: "minimal"): MinimalConfig<TsAppSpec.EmailAuthConfig>;
export declare function getEmailAuthConfig(scope: "full"): FullConfig<TsAppSpec.EmailAuthConfig>;
export declare function getEmailAuthConfig(scope: ConfigType): Config<TsAppSpec.EmailAuthConfig>;
export declare function getPasswordResetConfig(scope: "minimal"): MinimalConfig<TsAppSpec.PasswordResetConfig>;
export declare function getPasswordResetConfig(scope: "full"): FullConfig<TsAppSpec.PasswordResetConfig>;
export declare function getPasswordResetConfig(scope: ConfigType): Config<TsAppSpec.PasswordResetConfig>;
export declare function getEmailVerificationConfig(scope: "minimal"): MinimalConfig<TsAppSpec.EmailVerificationConfig>;
export declare function getEmailVerificationConfig(scope: "full"): FullConfig<TsAppSpec.EmailVerificationConfig>;
export declare function getEmailVerificationConfig(scope: ConfigType): Config<TsAppSpec.EmailVerificationConfig>;
export declare function getClientConfig(scope: "minimal"): MinimalConfig<TsAppSpec.ClientConfig>;
export declare function getClientConfig(scope: "full"): FullConfig<TsAppSpec.ClientConfig>;
export declare function getClientConfig(scope: ConfigType): Config<TsAppSpec.ClientConfig>;
export declare function getServerConfig(scope: "minimal"): MinimalConfig<TsAppSpec.ServerConfig>;
export declare function getServerConfig(scope: "full"): FullConfig<TsAppSpec.ServerConfig>;
export declare function getServerConfig(scope: ConfigType): Config<TsAppSpec.ServerConfig>;
export declare function getEmailSenderConfig(scope: "minimal"): MinimalConfig<TsAppSpec.EmailSenderConfig>;
export declare function getEmailSenderConfig(scope: "full"): FullConfig<TsAppSpec.EmailSenderConfig>;
export declare function getEmailSenderConfig(scope: ConfigType): Config<TsAppSpec.EmailSenderConfig>;
export declare function getWebSocketConfig(scope: "minimal"): MinimalConfig<TsAppSpec.WebsocketConfig>;
export declare function getWebSocketConfig(scope: "full"): FullConfig<TsAppSpec.WebsocketConfig>;
export declare function getWebSocketConfig(scope: ConfigType): Config<TsAppSpec.WebsocketConfig>;
export declare function getDbConfig(scope: "minimal"): MinimalConfig<TsAppSpec.DbConfig>;
export declare function getDbConfig(scope: "full"): FullConfig<TsAppSpec.DbConfig>;
export declare function getDbConfig(scope: ConfigType): Config<TsAppSpec.DbConfig>;
export declare function getPageConfigs(): NamedConfig<TsAppSpec.PageConfig>[];
export declare function getPageConfig(pageType: "minimal"): MinimalNamedConfig<TsAppSpec.PageConfig>;
export declare function getPageConfig(pageType: "full" | "email-verification" | "password-reset"): FullNamedConfig<TsAppSpec.PageConfig>;
export declare function getPageConfig(pageType: PageType): NamedConfig<TsAppSpec.PageConfig>;
export declare function getRouteConfigs(): NamedConfig<TsAppSpec.RouteConfig>[];
export declare function getRouteConfig(routeType: "minimal"): MinimalNamedConfig<TsAppSpec.RouteConfig>;
export declare function getRouteConfig(routeType: "full" | "email-verification" | "password-reset"): FullNamedConfig<TsAppSpec.RouteConfig>;
export declare function getRouteConfig(routeType: PageType): NamedConfig<TsAppSpec.RouteConfig>;
export declare function getQueryConfigs(): NamedConfig<TsAppSpec.QueryConfig>[];
export declare function getQueryConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.QueryConfig>;
export declare function getQueryConfig(scope: "full"): FullNamedConfig<TsAppSpec.QueryConfig>;
export declare function getQueryConfig(scope: ConfigType): NamedConfig<TsAppSpec.QueryConfig>;
export declare function getActionConfigs(): NamedConfig<TsAppSpec.ActionConfig>[];
export declare function getActionConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.ActionConfig>;
export declare function getActionConfig(scope: "full"): FullNamedConfig<TsAppSpec.ActionConfig>;
export declare function getActionConfig(scope: ConfigType): NamedConfig<TsAppSpec.ActionConfig>;
export declare function getCrudConfigs(): NamedConfig<TsAppSpec.CrudConfig>[];
export declare function getCrudConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.CrudConfig>;
export declare function getCrudConfig(scope: "full"): FullNamedConfig<TsAppSpec.CrudConfig>;
export declare function getCrudConfig(scope: ConfigType): NamedConfig<TsAppSpec.CrudConfig>;
export declare function getCrudOperations(scope: "minimal"): MinimalConfig<TsAppSpec.CrudOperations>;
export declare function getCrudOperations(scope: "full"): FullConfig<TsAppSpec.CrudOperations>;
export declare function getCrudOperations(scope: ConfigType): Config<TsAppSpec.CrudOperations>;
export declare function getCrudOperationOptions(scope: "minimal"): MinimalConfig<TsAppSpec.CrudOperationOptions>;
export declare function getCrudOperationOptions(scope: "full"): FullConfig<TsAppSpec.CrudOperationOptions>;
export declare function getCrudOperationOptions(scope: ConfigType): Config<TsAppSpec.CrudOperationOptions>;
export declare function getSchedule(scope: "minimal"): MinimalConfig<TsAppSpec.Schedule>;
export declare function getSchedule(scope: "full"): FullConfig<TsAppSpec.Schedule>;
export declare function getSchedule(scope: ConfigType): Config<TsAppSpec.Schedule>;
export declare function getPerform(scope: "minimal"): MinimalConfig<TsAppSpec.Perform>;
export declare function getPerform(scope: "full"): FullConfig<TsAppSpec.Perform>;
export declare function getPerform(scope: ConfigType): Config<TsAppSpec.Perform>;
export declare function getApiNamespaceConfigs(): NamedConfig<TsAppSpec.ApiNamespaceConfig>[];
export declare function getApiNamespaceConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.ApiNamespaceConfig>;
export declare function getApiNamespaceConfig(scope: "full"): FullNamedConfig<TsAppSpec.ApiNamespaceConfig>;
export declare function getApiNamespaceConfig(scope: ConfigType): NamedConfig<TsAppSpec.ApiNamespaceConfig>;
export declare function getApiConfigs(): NamedConfig<TsAppSpec.ApiConfig>[];
export declare function getApiConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.ApiConfig>;
export declare function getApiConfig(scope: "full"): FullNamedConfig<TsAppSpec.ApiConfig>;
export declare function getApiConfig(scope: ConfigType): NamedConfig<TsAppSpec.ApiConfig>;
export declare function getHttpRoute(scope: "minimal"): MinimalConfig<TsAppSpec.HttpRoute>;
export declare function getHttpRoute(scope: "full"): FullConfig<TsAppSpec.HttpRoute>;
export declare function getHttpRoute(scope: ConfigType): Config<TsAppSpec.HttpRoute>;
export declare function getJobConfigs(): NamedConfig<TsAppSpec.JobConfig>[];
export declare function getJobConfig(scope: "minimal"): MinimalNamedConfig<TsAppSpec.JobConfig>;
export declare function getJobConfig(scope: "full"): FullNamedConfig<TsAppSpec.JobConfig>;
export declare function getJobConfig(scope: ConfigType): NamedConfig<TsAppSpec.JobConfig>;
export declare function getEmailFromField(scope: "minimal"): MinimalConfig<TsAppSpec.EmailFromField>;
export declare function getEmailFromField(scope: "full"): FullConfig<TsAppSpec.EmailFromField>;
export declare function getEmailFromField(scope: ConfigType): Config<TsAppSpec.EmailFromField>;
export declare function getExtImport(scope: "minimal", importKind: AppSpec.ExtImportKind): MinimalConfig<TsAppSpec.ExtImport>;
export declare function getExtImport(scope: "full", importKind: AppSpec.ExtImportKind): FullConfig<TsAppSpec.ExtImport>;
export declare function getExtImport(scope: ConfigType, importKind: AppSpec.ExtImportKind): Config<TsAppSpec.ExtImport>;
export declare function getEntity(entity: EntityType): "Task" | "User" | "SocialUser";
export declare function getEntities(scope: ConfigType): string[];
declare const CONFIG_TYPES: readonly ["minimal", "full"];
type ConfigType = (typeof CONFIG_TYPES)[number];
/**
 * By default we define only `ConfigType` variants for all of the configs
 * that can be used in the app. This is because we want to test both
 * edge cases of the configs.
 *
 * Pages are a special case, because even though they are a top-level config,
 * they are also used by `AuthConfig`. That is why we define those two cases separately.
 * Mostly to bring attention that we have additional edge cases for pages.
 */
declare const PAGE_CONFIG_TYPES: readonly ["minimal", "full", "email-verification", "password-reset"];
type PageType = (typeof PAGE_CONFIG_TYPES)[number];
declare const ENTITY_CONFIG_TYPES: readonly ["task", "user", "social-user"];
type EntityType = (typeof ENTITY_CONFIG_TYPES)[number];
type NamedConfig<T> = MinimalNamedConfig<T> | FullNamedConfig<T>;
export type Config<T> = MinimalConfig<T> | FullConfig<T>;
type MinimalNamedConfig<T> = {
    name: string;
    config: MinimalConfig<T>;
};
type FullNamedConfig<T> = {
    name: string;
    config: FullConfig<T>;
};
/**
 * Creates a type containing only the required properties from T recursively.
 *
 * This utility:
 * - Filters out optional properties recurisvely
 * - Stops from unwrapping `Branded` types
 * - Returns `EmptyObject` when no required properties exist
 *
 * @template T - The type to extract required properties from
 *
 * @example
 * ```ts
 * // Given the following type:
 * type Result = MinimalConfig<{
 *   a: Branded<string, "A">;
 *   b: {
 *     c: boolean;
 *     d?: {
 *       e: boolean;
 *     };
 *   };
 *   f: {
 *     g: boolean;
 *     h?: string;
 *   }[];
 * };
 * // The result will be:
 * type Result = {
 *   a: Branded<string, "A">;
 *   b: {
 *     c: boolean;
 *   };
 *   f: {
 *     g: boolean;
 *     h: string;
 *   }[];
 * };
 */
export type MinimalConfig<T> = T extends Branded<unknown, unknown> ? T : T extends Array<infer ArrayItem> ? Array<MinimalConfig<ArrayItem>> : T extends object ? keyof T extends never ? EmptyObject : MinimalConfigObject<T> : T;
type MinimalConfigObject<T> = {
    [K in keyof T as EmptyObject extends Pick<T, K> ? never : K]: MinimalConfig<T[K]>;
} extends infer Object ? Object extends EmptyObject ? EmptyObject : Object : never;
/**
 * Represents an empty object type in TypeScript.
 * @see https://www.totaltypescript.com/the-empty-object-type-in-typescript
 */
type EmptyObject = Record<string, never>;
/**
 * Creates a type with all properties of T required recursively.
 *
 * This utility:
 * - Makes all properties required recursively
 * - Stops from unwrapping branded types
 *
 * @template T - The type to make fully required
 *
 * @example
 * ```ts
 * // Given the following type:
 * type Result = FullConfig<{
 *   a: Branded<string, "A">;
 *   b: {
 *     c: boolean;
 *     d?: {
 *       e: boolean;
 *     };
 *   };
 *   f: {
 *     g: boolean;
 *     h?: string;
 *   }[];
 * };
 * // The result will be:
 * type Result = FullConfig<{
 *   a: Branded<string, "A">;
 *   b: {
 *     c: boolean;
 *     d: {
 *       e: boolean;
 *     };
 *   };
 *   f: {
 *     g: boolean;
 *     h: string;
 *   }[];
 * };
 */
export type FullConfig<T> = T extends Branded<unknown, unknown> ? T : T extends Array<infer ArrayItem> ? Array<FullConfig<ArrayItem>> : T extends object ? FullConfigObject<T> : T;
type FullConfigObject<T> = {
    [K in keyof T]-?: FullConfig<T[K]>;
};
export {};
//# sourceMappingURL=testFixtures.d.ts.map