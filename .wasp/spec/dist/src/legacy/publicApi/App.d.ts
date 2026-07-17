/** This module defines the user-facing API for defining a Wasp app.
 */
import { GET_TS_APP_SPEC } from "../_private.js";
import * as TsAppSpec from "./tsAppSpec.js";
export declare class App {
    #private;
    [GET_TS_APP_SPEC](): TsAppSpec.TsAppSpec;
    constructor(name: string, config: TsAppSpec.AppConfig);
    action(this: App, name: string, config: TsAppSpec.ActionConfig): void;
    apiNamespace(this: App, name: string, config: TsAppSpec.ApiNamespaceConfig): void;
    api(this: App, name: string, config: TsAppSpec.ApiConfig): void;
    auth(this: App, config: TsAppSpec.AuthConfig): void;
    client(this: App, config: TsAppSpec.ClientConfig): void;
    crud(this: App, name: string, config: TsAppSpec.CrudConfig): void;
    db(this: App, config: TsAppSpec.DbConfig): void;
    emailSender(this: App, config: TsAppSpec.EmailSenderConfig): void;
    job(this: App, name: string, config: TsAppSpec.JobConfig): void;
    page(this: App, name: string, config: TsAppSpec.PageConfig): TsAppSpec.PageName;
    query(this: App, name: string, config: TsAppSpec.QueryConfig): void;
    route(this: App, name: string, config: TsAppSpec.RouteConfig): void;
    server(this: App, config: TsAppSpec.ServerConfig): void;
    webSocket(this: App, config: TsAppSpec.WebsocketConfig): void;
}
//# sourceMappingURL=App.d.ts.map