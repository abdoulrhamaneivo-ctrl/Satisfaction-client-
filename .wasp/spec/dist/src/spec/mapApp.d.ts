/**
 * This module maps the Wasp Spec to the internal representation of
 * the app ({@link AppSpec.Decl}).
 * All of the mapping functions are exported so that they can be individually
 * tested.
 */
import * as AppSpec from "../appSpec.js";
import * as WaspSpec from "./publicApi/waspSpec.js";
export declare function mapApp(app: WaspSpec.App, { projectRootDir, entityNames, }: {
    projectRootDir: string;
    entityNames: string[];
}): AppSpec.Decl[];
export type AppMapperContext = {
    entityRefParser: RefParser<"Entity">;
    routeRefParser: RefParser<"Route">;
    mapRefObject: RefObjectMapper;
};
type RefObjectMapper = (refObject: unknown) => AppSpec.ExtImport;
export declare function mapPage(page: WaspSpec.Page, ctx: AppMapperContext): AppSpec.Page;
export declare function mapRoute(route: WaspSpec.Route): AppSpec.Route;
/**
 * {@link WaspSpec.Route} through it's constructor can either:
 * - Create a new {@link WaspSpec.Page}.
 * - Reference an existing {@link WaspSpec.Page}.
 *
 * In case when it references an existing page, we don't want to
 * count the reference as a separate {@link AppSpec.Page} specification.
 */
export declare function dedupePageDecls(decls: AppSpec.GetDeclForType<"Page">[]): AppSpec.GetDeclForType<"Page">[];
export declare function mapQuery(query: WaspSpec.Query, ctx: AppMapperContext): AppSpec.Query;
export declare function mapAction(action: WaspSpec.Action, ctx: AppMapperContext): AppSpec.Action;
export declare function mapAuth(auth: WaspSpec.Auth, ctx: AppMapperContext): AppSpec.Auth;
export declare function mapAuthMethods(methods: WaspSpec.AuthMethods, ctx: AppMapperContext): AppSpec.AuthMethods;
export declare function mapUsernameAndPassword(usernameAndPassword: WaspSpec.UsernameAndPasswordConfig, ctx: AppMapperContext): AppSpec.UsernameAndPasswordConfig;
export declare function mapSocialAuth(socialAuth: WaspSpec.SocialAuthConfig, ctx: AppMapperContext): AppSpec.ExternalAuthConfig;
export declare function mapEmailAuth(emailAuth: WaspSpec.EmailAuthConfig, ctx: AppMapperContext): AppSpec.EmailAuthConfig;
export declare function mapEmailFlow(emailFlow: WaspSpec.EmailFlowConfig, ctx: AppMapperContext): AppSpec.EmailVerificationConfig;
export declare function mapApi(api: WaspSpec.Api, ctx: AppMapperContext): AppSpec.Api;
export declare function mapApiNamespace(apiNamespace: WaspSpec.ApiNamespace, ctx: AppMapperContext): AppSpec.ApiNamespace;
export declare function mapServer(server: WaspSpec.Server, ctx: AppMapperContext): AppSpec.Server;
export declare function mapClient(client: WaspSpec.Client, ctx: AppMapperContext): AppSpec.Client;
export declare function mapDb(db: WaspSpec.Db, ctx: AppMapperContext): AppSpec.Db;
export declare function mapEmailSender(emailSender: WaspSpec.EmailSender): AppSpec.EmailSender;
export declare function mapEmailFromField(emailFromField: WaspSpec.EmailFromField): AppSpec.EmailFromField;
export declare function mapWebSocket(webSocket: WaspSpec.WebSocket, ctx: AppMapperContext): AppSpec.WebSocket;
export declare function mapJob(job: WaspSpec.Job, ctx: AppMapperContext): AppSpec.Job;
export declare function mapCrud(crud: WaspSpec.Crud, ctx: AppMapperContext): AppSpec.Crud;
export declare function mapCrudOperations(operations: WaspSpec.CrudOperations, ctx: AppMapperContext): AppSpec.CrudOperations;
export declare function mapCrudOperationOptions(options: WaspSpec.CrudOperationOptions, ctx: AppMapperContext): AppSpec.CrudOperationOptions;
export declare function mapSchedule(schedule: WaspSpec.Schedule): AppSpec.Schedule;
export type RefParser<T extends AppSpec.DeclType> = (name: string) => AppSpec.Ref<T>;
export declare function makeRefParser<T extends AppSpec.DeclType>(declType: T, declNames: string[]): RefParser<T>;
export {};
//# sourceMappingURL=mapApp.d.ts.map