/** This module defines the user-facing API for defining a Wasp app.
 */
import { GET_TS_APP_SPEC } from "../_private.js";
export class App {
    #tsAppSpec;
    // NOTE: Using a non-public symbol gives us a package-private property.
    // It's not that important to hide it from the users, but we still don't want
    // user's IDE to suggest it during autocompletion.
    [GET_TS_APP_SPEC]() {
        return this.#tsAppSpec;
    }
    constructor(name, config) {
        this.#tsAppSpec = {
            app: { name, config },
            actions: new Map(),
            apiNamespaces: new Map(),
            apis: new Map(),
            auth: undefined,
            client: undefined,
            cruds: new Map(),
            db: undefined,
            emailSender: undefined,
            jobs: new Map(),
            pages: new Map(),
            queries: new Map(),
            routes: new Map(),
            server: undefined,
            websocket: undefined,
        };
    }
    // TODO: Enforce that all methods are covered in compile time
    action(name, config) {
        this.#tsAppSpec.actions.set(name, config);
    }
    apiNamespace(name, config) {
        this.#tsAppSpec.apiNamespaces.set(name, config);
    }
    api(name, config) {
        this.#tsAppSpec.apis.set(name, config);
    }
    auth(config) {
        this.#tsAppSpec.auth = config;
    }
    client(config) {
        this.#tsAppSpec.client = config;
    }
    crud(name, config) {
        this.#tsAppSpec.cruds.set(name, config);
    }
    db(config) {
        this.#tsAppSpec.db = config;
    }
    emailSender(config) {
        this.#tsAppSpec.emailSender = config;
    }
    job(name, config) {
        this.#tsAppSpec.jobs.set(name, config);
    }
    page(name, config) {
        this.#tsAppSpec.pages.set(name, config);
        return name;
    }
    query(name, config) {
        this.#tsAppSpec.queries.set(name, config);
    }
    route(name, config) {
        this.#tsAppSpec.routes.set(name, config);
    }
    server(config) {
        this.#tsAppSpec.server = config;
    }
    webSocket(config) {
        this.#tsAppSpec.websocket = config;
    }
}
