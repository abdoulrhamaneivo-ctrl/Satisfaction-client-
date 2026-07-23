/**
 * This module maps the TsAppSpec-facing API to the internal representation of the app (AppSpec Decl).
 * All of the mapping functions are exported so that they can be individually tested.
 */
export function mapTsAppSpecToAppSpecDecls(tsAppSpec, entityNames) {
    const { app, actions, apis, apiNamespaces, auth, client, db, emailSender, jobs, pages, queries, routes, server, websocket, cruds, } = tsAppSpec;
    const pageNames = Array.from(pages.keys());
    const routeNames = Array.from(routes.keys());
    const entityRefParser = makeRefParser("Entity", entityNames);
    const pageRefParser = makeRefParser("Page", pageNames);
    const routeRefParser = makeRefParser("Route", routeNames);
    const pageDecls = mapToDecls(pages, "Page", mapPage);
    const routeDecls = mapToDecls(routes, "Route", (routeConfig) => mapRoute(routeConfig, pageRefParser));
    const actionDecls = mapToDecls(actions, "Action", (actionConfig) => mapOperation(actionConfig, entityRefParser));
    const queryDecls = mapToDecls(queries, "Query", (queryConfig) => mapOperation(queryConfig, entityRefParser));
    const apiDecls = mapToDecls(apis, "Api", (apiConfig) => mapApi(apiConfig, entityRefParser));
    const jobDecls = mapToDecls(jobs, "Job", (jobConfig) => mapJob(jobConfig, entityRefParser));
    const apiNamespaceDecls = mapToDecls(apiNamespaces, "ApiNamespace", mapApiNamespace);
    const crudDecls = mapToDecls(cruds, "Crud", (crudConfig) => mapCrud(crudConfig, entityRefParser));
    const appDecl = {
        declType: "App",
        declName: app.name,
        declValue: mapApp(app.config, entityRefParser, routeRefParser, auth, client, server, db, emailSender, websocket),
    };
    return makeDeclsArray({
        App: [appDecl],
        Page: pageDecls,
        Route: routeDecls,
        Action: actionDecls,
        Query: queryDecls,
        Api: apiDecls,
        Job: jobDecls,
        ApiNamespace: apiNamespaceDecls,
        Crud: crudDecls,
    });
}
function makeDeclsArray(decls) {
    return Object.values(decls).flatMap((decl) => [...decl]);
}
function mapToDecls(configs, type, configToDeclValue) {
    return [...configs].map(([name, config]) => ({
        declType: type,
        declName: name,
        declValue: configToDeclValue(config),
    }));
}
export function mapOperation(config, entityRefParser) {
    const { fn, entities, auth } = config;
    return {
        fn: mapExtImport(fn),
        entities: entities?.map(entityRefParser),
        auth,
    };
}
export function mapExtImport(extImport) {
    if ("import" in extImport) {
        return {
            kind: "named",
            name: extImport.import,
            path: extImport.from,
        };
    }
    else if ("importDefault" in extImport) {
        return {
            kind: "default",
            name: extImport.importDefault,
            path: extImport.from,
        };
    }
    else {
        throw new Error("Invalid ExtImport: neither `import` nor `importDefault` is defined");
    }
}
export function mapHttpRoute(httpRoute) {
    return [httpRoute.method, httpRoute.route];
}
export function mapApi(config, entityRefParser) {
    const { fn, middlewareConfigFn, entities, httpRoute, auth } = config;
    return {
        fn: mapExtImport(fn),
        middlewareConfigFn: middlewareConfigFn && mapExtImport(middlewareConfigFn),
        entities: entities && entities.map(entityRefParser),
        httpRoute: mapHttpRoute(httpRoute),
        auth,
    };
}
export function mapApiNamespace(config) {
    const { middlewareConfigFn, path } = config;
    return {
        middlewareConfigFn: mapExtImport(middlewareConfigFn),
        path,
    };
}
export function mapApp(app, 
// TODO: Make this better, optional props are problematic so I have to pass the parsers first
entityRefParser, routeRefParser, auth, client, server, db, emailSender, webSocket) {
    const { title, wasp, head } = app;
    return {
        wasp,
        title,
        head,
        auth: auth && mapAuth(auth, entityRefParser, routeRefParser),
        client: client && mapClient(client),
        server: server && mapServer(server),
        webSocket: webSocket && mapWebSocket(webSocket),
        db: db && mapDb(db),
        emailSender: emailSender && mapEmailSender(emailSender),
    };
}
export function mapAuth(auth, entityRefParser, routeRefParser) {
    const { userEntity, methods, onAuthFailedRedirectTo, onAuthSucceededRedirectTo, onBeforeSignup, onAfterSignup, onAfterEmailVerified, onBeforeOAuthRedirect, onBeforeLogin, onAfterLogin, } = auth;
    return {
        userEntity: entityRefParser(userEntity),
        methods: mapAuthMethods(methods, routeRefParser),
        onAuthFailedRedirectTo,
        onAuthSucceededRedirectTo,
        onBeforeSignup: onBeforeSignup && mapExtImport(onBeforeSignup),
        onAfterSignup: onAfterSignup && mapExtImport(onAfterSignup),
        onAfterEmailVerified: onAfterEmailVerified && mapExtImport(onAfterEmailVerified),
        onBeforeOAuthRedirect: onBeforeOAuthRedirect && mapExtImport(onBeforeOAuthRedirect),
        onBeforeLogin: onBeforeLogin && mapExtImport(onBeforeLogin),
        onAfterLogin: onAfterLogin && mapExtImport(onAfterLogin),
    };
}
export function mapAuthMethods(methods, routeRefParser) {
    // TODO: check keyof danger, effective ts
    const { usernameAndPassword, slack, discord, google, gitHub, keycloak, microsoft, email, } = methods;
    return {
        usernameAndPassword: usernameAndPassword && mapUsernameAndPassword(usernameAndPassword),
        slack: slack && mapExternalAuth(slack),
        discord: discord && mapExternalAuth(discord),
        google: google && mapExternalAuth(google),
        gitHub: gitHub && mapExternalAuth(gitHub),
        keycloak: keycloak && mapExternalAuth(keycloak),
        microsoft: microsoft && mapExternalAuth(microsoft),
        email: email && mapEmailAuth(email, routeRefParser),
    };
}
export function mapUsernameAndPassword(usernameAndPassword) {
    const { userSignupFields } = usernameAndPassword;
    return {
        userSignupFields: userSignupFields && mapExtImport(userSignupFields),
    };
}
export function mapExternalAuth(externalAuth) {
    const { configFn, userSignupFields } = externalAuth;
    return {
        configFn: configFn && mapExtImport(configFn),
        userSignupFields: userSignupFields && mapExtImport(userSignupFields),
    };
}
export function mapEmailAuth(emailConfig, routeRefParser) {
    const { userSignupFields, fromField, emailVerification, passwordReset } = emailConfig;
    return {
        userSignupFields: userSignupFields && mapExtImport(userSignupFields),
        fromField: mapEmailFromField(fromField),
        emailVerification: mapEmailVerification(emailVerification, routeRefParser),
        passwordReset: mapPasswordReset(passwordReset, routeRefParser),
    };
}
export function mapEmailVerification(emailVerification, routeRefParser) {
    const { getEmailContentFn, clientRoute } = emailVerification;
    return {
        getEmailContentFn: getEmailContentFn && mapExtImport(getEmailContentFn),
        clientRoute: routeRefParser(clientRoute),
    };
}
export function mapPasswordReset(passwordReset, routeRefParser) {
    const { getEmailContentFn, clientRoute } = passwordReset;
    return {
        getEmailContentFn: getEmailContentFn && mapExtImport(getEmailContentFn),
        clientRoute: routeRefParser(clientRoute),
    };
}
export function mapDb(db) {
    const { seeds, prismaSetupFn } = db;
    return {
        seeds: seeds?.map(mapExtImport),
        prismaSetupFn: prismaSetupFn && mapExtImport(prismaSetupFn),
    };
}
export function mapEmailSender(emailSender) {
    const { provider, defaultFrom } = emailSender;
    return {
        provider,
        defaultFrom: defaultFrom && mapEmailFromField(defaultFrom),
    };
}
export function mapEmailFromField(defaultFrom) {
    return (defaultFrom && {
        name: defaultFrom.name,
        email: defaultFrom.email,
    });
}
export function mapServer(server) {
    const { setupFn, middlewareConfigFn, envValidationSchema } = server;
    return {
        setupFn: setupFn && mapExtImport(setupFn),
        middlewareConfigFn: middlewareConfigFn && mapExtImport(middlewareConfigFn),
        envValidationSchema: envValidationSchema && mapExtImport(envValidationSchema),
    };
}
export function mapClient(client) {
    const { setupFn, rootComponent, baseDir, envValidationSchema } = client;
    return {
        setupFn: setupFn && mapExtImport(setupFn),
        rootComponent: rootComponent && mapExtImport(rootComponent),
        baseDir,
        envValidationSchema: envValidationSchema && mapExtImport(envValidationSchema),
    };
}
export function mapWebSocket(websocket) {
    const { fn, autoConnect } = websocket;
    return {
        fn: mapExtImport(fn),
        autoConnect,
    };
}
export function mapJob(job, entityRefParser) {
    const { executor, perform, schedule, entities } = job;
    return {
        executor,
        perform: mapPerform(perform),
        schedule: schedule && mapSchedule(schedule),
        entities: entities && entities.map(entityRefParser),
    };
}
export function mapSchedule(schedule) {
    const { cron, args, executorOptions } = schedule;
    return {
        cron,
        args,
        executorOptions,
    };
}
export function mapPerform(perform) {
    const { fn, executorOptions } = perform;
    return {
        fn: mapExtImport(fn),
        executorOptions,
    };
}
export function mapRoute(route, pageRefParser) {
    const { path, to, prerender, lazy } = route;
    return {
        path,
        to: pageRefParser(to),
        prerender,
        lazy,
    };
}
export function mapCrud(crudConfig, entityRefParser) {
    const { entity, operations } = crudConfig;
    return {
        entity: entityRefParser(entity),
        operations: mapCrudOperations(operations),
    };
}
export function mapCrudOperations(operations) {
    const { get, getAll, create, update, delete: del } = operations;
    // TODO: Do this for all keys
    return {
        get: get && mapCrudOperationOptions(get),
        getAll: getAll && mapCrudOperationOptions(getAll),
        create: create && mapCrudOperationOptions(create),
        update: update && mapCrudOperationOptions(update),
        delete: del && mapCrudOperationOptions(del),
    };
}
export function mapCrudOperationOptions(options) {
    const { isPublic, overrideFn } = options;
    return {
        isPublic,
        overrideFn: overrideFn && mapExtImport(overrideFn),
    };
}
export function mapPage(pageConfig) {
    const { component, authRequired } = pageConfig;
    return {
        component: mapExtImport(component),
        authRequired,
    };
}
export function makeRefParser(declType, declNames) {
    return function parseRef(potentialRef) {
        if (!declNames.includes(potentialRef)) {
            throw new Error(`Invalid ${declType} reference: ${potentialRef}`);
        }
        return {
            name: potentialRef,
            declType,
        };
    };
}
