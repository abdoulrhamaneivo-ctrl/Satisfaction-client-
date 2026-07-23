/**
 * This module maps the TsAppSpec-facing API to the internal representation of the app (AppSpec Decl).
 * All of the mapping functions are exported so that they can be individually tested.
 */
import * as AppSpec from "../appSpec.js";
import * as TsAppSpec from "./publicApi/tsAppSpec.js";
export declare function mapTsAppSpecToAppSpecDecls(tsAppSpec: TsAppSpec.TsAppSpec, entityNames: string[]): AppSpec.Decl[];
export declare function mapOperation(config: TsAppSpec.QueryConfig, entityRefParser: RefParser<"Entity">): AppSpec.Query;
export declare function mapOperation(config: TsAppSpec.ActionConfig, entityRefParser: RefParser<"Entity">): AppSpec.Action;
export declare function mapExtImport(extImport: TsAppSpec.ExtImport): AppSpec.ExtImport;
export declare function mapHttpRoute(httpRoute: TsAppSpec.HttpRoute): AppSpec.HttpRoute;
export declare function mapApi(config: TsAppSpec.ApiConfig, entityRefParser: RefParser<"Entity">): AppSpec.Api;
export declare function mapApiNamespace(config: TsAppSpec.ApiNamespaceConfig): AppSpec.ApiNamespace;
export declare function mapApp(app: TsAppSpec.AppConfig, entityRefParser: RefParser<"Entity">, routeRefParser: RefParser<"Route">, auth?: TsAppSpec.AuthConfig, client?: TsAppSpec.ClientConfig, server?: TsAppSpec.ServerConfig, db?: TsAppSpec.DbConfig, emailSender?: TsAppSpec.EmailSenderConfig, webSocket?: TsAppSpec.WebsocketConfig): AppSpec.App;
export declare function mapAuth(auth: TsAppSpec.AuthConfig, entityRefParser: RefParser<"Entity">, routeRefParser: RefParser<"Route">): AppSpec.Auth;
export declare function mapAuthMethods(methods: TsAppSpec.AuthMethods, routeRefParser: RefParser<"Route">): AppSpec.AuthMethods;
export declare function mapUsernameAndPassword(usernameAndPassword: TsAppSpec.UsernameAndPasswordConfig): AppSpec.UsernameAndPasswordConfig;
export declare function mapExternalAuth(externalAuth: TsAppSpec.ExternalAuthConfig): AppSpec.ExternalAuthConfig;
export declare function mapEmailAuth(emailConfig: TsAppSpec.EmailAuthConfig, routeRefParser: RefParser<"Route">): AppSpec.EmailAuthConfig;
export declare function mapEmailVerification(emailVerification: TsAppSpec.EmailVerificationConfig, routeRefParser: RefParser<"Route">): AppSpec.EmailVerificationConfig;
export declare function mapPasswordReset(passwordReset: TsAppSpec.PasswordResetConfig, routeRefParser: RefParser<"Route">): AppSpec.PasswordResetConfig;
export declare function mapDb(db: TsAppSpec.DbConfig): AppSpec.Db;
export declare function mapEmailSender(emailSender: TsAppSpec.EmailSenderConfig): AppSpec.EmailSender;
export declare function mapEmailFromField(defaultFrom: TsAppSpec.EmailFromField): AppSpec.EmailFromField;
export declare function mapServer(server: TsAppSpec.ServerConfig): AppSpec.Server;
export declare function mapClient(client: TsAppSpec.ClientConfig): AppSpec.Client;
export declare function mapWebSocket(websocket: TsAppSpec.WebsocketConfig): AppSpec.WebSocket;
export declare function mapJob(job: TsAppSpec.JobConfig, entityRefParser: RefParser<"Entity">): AppSpec.Job;
export declare function mapSchedule(schedule: TsAppSpec.Schedule): AppSpec.Schedule;
export declare function mapPerform(perform: TsAppSpec.Perform): AppSpec.Perform;
export declare function mapRoute(route: TsAppSpec.RouteConfig, pageRefParser: RefParser<"Page">): AppSpec.Route;
export declare function mapCrud(crudConfig: TsAppSpec.CrudConfig, entityRefParser: RefParser<"Entity">): AppSpec.Crud;
export declare function mapCrudOperations(operations: TsAppSpec.CrudOperations): AppSpec.CrudOperations;
export declare function mapCrudOperationOptions(options: TsAppSpec.CrudOperationOptions): AppSpec.CrudOperationOptions;
export declare function mapPage(pageConfig: TsAppSpec.PageConfig): AppSpec.Page;
export type RefParser<T extends AppSpec.DeclType> = (potentialReferences: string) => AppSpec.Ref<T>;
export declare function makeRefParser<T extends AppSpec.DeclType>(declType: T, declNames: string[]): RefParser<T>;
//# sourceMappingURL=mapTsAppSpecToAppSpecDecls.d.ts.map