/**
 * This module maps the Wasp Spec to the internal representation of
 * the app ({@link AppSpec.Decl}).
 * All of the mapping functions are exported so that they can be individually
 * tested.
 */
import { getRefObjectDeclarationName, mapRefObject } from "./refObject.js";
import { SpecUserError } from "./specUserError.js";
export function mapApp(app, { projectRootDir, entityNames, }) {
    const { name, wasp, title, head, auth, server, client, db, emailSender, webSocket, spec, } = app;
    const flatSpec = flattenSpec(spec);
    const entityRefParser = makeRefParser("Entity", entityNames);
    const routeSpecElements = extractSpecElements("route", flatSpec);
    const routeRefParser = makeRefParser("Route", routeSpecElements.map((r) => r.name));
    const ctx = {
        entityRefParser,
        routeRefParser,
        mapRefObject: (refObject) => mapRefObject(refObject, {
            projectRootDir,
        }),
    };
    // TODO: When you add all declarations, see if you can generalize better
    // (e.g., maybe named parameters, maybe putting extractSpecElements inside
    // mapToDecls)
    const pageSpecElements = extractSpecElements("page", flatSpec);
    const pageDecls = mapToDecls(pageSpecElements, "Page", (page) => getRefObjectDeclarationName(page.component), (page) => mapPage(page, ctx));
    const routeDecls = mapToDecls(routeSpecElements, "Route", (route) => route.name, (route) => mapRoute(route));
    const routePageDecls = mapToDecls(routeSpecElements, "Page", (route) => getRefObjectDeclarationName(route.page.component), (route) => mapPage(route.page, ctx));
    const querySpecElements = extractSpecElements("query", flatSpec);
    const queryDecls = mapToDecls(querySpecElements, "Query", (query) => getRefObjectDeclarationName(query.fn), (query) => mapQuery(query, ctx));
    const actionSpecElements = extractSpecElements("action", flatSpec);
    const actionDecls = mapToDecls(actionSpecElements, "Action", (action) => getRefObjectDeclarationName(action.fn), (action) => mapAction(action, ctx));
    const apiSpecElements = extractSpecElements("api", flatSpec);
    const apiDecls = mapToDecls(apiSpecElements, "Api", (api) => getRefObjectDeclarationName(api.fn), (api) => mapApi(api, ctx));
    const apiNamespaceSpecElements = extractSpecElements("apiNamespace", flatSpec);
    const apiNamespaceDecls = mapToDecls(apiNamespaceSpecElements, "ApiNamespace", (ns) => getRefObjectDeclarationName(ns.middlewareConfigFn), (ns) => mapApiNamespace(ns, ctx));
    const jobSpecElements = extractSpecElements("job", flatSpec);
    const jobDecls = mapToDecls(jobSpecElements, "Job", (job) => getRefObjectDeclarationName(job.fn), (job) => mapJob(job, ctx));
    const crudSpecElements = extractSpecElements("crud", flatSpec);
    const crudDecls = mapToDecls(crudSpecElements, "Crud", (crud) => crud.name, (crud) => mapCrud(crud, ctx));
    const appDecl = {
        declType: "App",
        declName: name,
        declValue: {
            wasp,
            title,
            head,
            auth: auth && mapAuth(auth, ctx),
            server: server && mapServer(server, ctx),
            client: client && mapClient(client, ctx),
            db: db && mapDb(db, ctx),
            emailSender: emailSender && mapEmailSender(emailSender),
            webSocket: webSocket && mapWebSocket(webSocket, ctx),
        },
    };
    return ensureAllDecls({
        App: [appDecl],
        Page: dedupePageDecls([...pageDecls, ...routePageDecls]),
        Route: routeDecls,
        Query: queryDecls,
        Action: actionDecls,
        Api: apiDecls,
        ApiNamespace: apiNamespaceDecls,
        Job: jobDecls,
        Crud: crudDecls,
    });
}
export function mapPage(page, ctx) {
    const { component, authRequired } = page;
    return {
        component: ctx.mapRefObject(component),
        authRequired,
    };
}
export function mapRoute(route) {
    const { path, prerender, lazy } = route;
    return {
        path,
        to: {
            name: getRefObjectDeclarationName(route.page.component),
            declType: "Page",
        },
        prerender,
        lazy,
    };
}
/**
 * {@link WaspSpec.Route} through it's constructor can either:
 * - Create a new {@link WaspSpec.Page}.
 * - Reference an existing {@link WaspSpec.Page}.
 *
 * In case when it references an existing page, we don't want to
 * count the reference as a separate {@link AppSpec.Page} specification.
 */
export function dedupePageDecls(decls) {
    const pagesByDeclName = Map.groupBy(decls, (decls) => decls.declName);
    return Array.from(pagesByDeclName.values()).map((pages) => pages.reduce((firstPage, currentPage) => {
        if (!arePageDeclsEqual(currentPage, firstPage)) {
            throw new SpecUserError(`Conflicting configurations for the page \`${firstPage.declName}\`:\n` +
                `- Definition A: ${JSON.stringify(firstPage.declValue)}\n` +
                `- Definition B: ${JSON.stringify(currentPage.declValue)}\n\n` +
                "All page instances with the same import name must produce the same configuration.\n" +
                "If the duplication was intentional, please use an alias to differentiate the pages.");
        }
        return firstPage;
    }));
}
function arePageDeclsEqual(page1, page2) {
    const isSameCanonicalPage = page1.declName === page2.declName;
    return (isSameCanonicalPage &&
        JSON.stringify(page1.declValue) === JSON.stringify(page2.declValue));
}
export function mapQuery(query, ctx) {
    const { fn, entities, auth } = query;
    return {
        fn: ctx.mapRefObject(fn),
        entities: entities?.map(ctx.entityRefParser),
        auth,
    };
}
export function mapAction(action, ctx) {
    const { fn, entities, auth } = action;
    return {
        fn: ctx.mapRefObject(fn),
        entities: entities?.map(ctx.entityRefParser),
        auth,
    };
}
export function mapAuth(auth, ctx) {
    const { userEntity, methods, onAuthFailedRedirectTo, onAuthSucceededRedirectTo, onBeforeSignup, onAfterSignup, onAfterEmailVerified, onBeforeOAuthRedirect, onBeforeLogin, onAfterLogin, } = auth;
    return {
        userEntity: ctx.entityRefParser(userEntity),
        methods: mapAuthMethods(methods, ctx),
        onAuthFailedRedirectTo,
        onAuthSucceededRedirectTo,
        onBeforeSignup: onBeforeSignup && ctx.mapRefObject(onBeforeSignup),
        onAfterSignup: onAfterSignup && ctx.mapRefObject(onAfterSignup),
        onAfterEmailVerified: onAfterEmailVerified && ctx.mapRefObject(onAfterEmailVerified),
        onBeforeOAuthRedirect: onBeforeOAuthRedirect && ctx.mapRefObject(onBeforeOAuthRedirect),
        onBeforeLogin: onBeforeLogin && ctx.mapRefObject(onBeforeLogin),
        onAfterLogin: onAfterLogin && ctx.mapRefObject(onAfterLogin),
    };
}
export function mapAuthMethods(methods, ctx) {
    const { usernameAndPassword, slack, discord, google, gitHub, keycloak, microsoft, email, } = methods;
    return {
        usernameAndPassword: usernameAndPassword && mapUsernameAndPassword(usernameAndPassword, ctx),
        slack: slack && mapSocialAuth(slack, ctx),
        discord: discord && mapSocialAuth(discord, ctx),
        google: google && mapSocialAuth(google, ctx),
        gitHub: gitHub && mapSocialAuth(gitHub, ctx),
        keycloak: keycloak && mapSocialAuth(keycloak, ctx),
        microsoft: microsoft && mapSocialAuth(microsoft, ctx),
        email: email && mapEmailAuth(email, ctx),
    };
}
export function mapUsernameAndPassword(usernameAndPassword, ctx) {
    const { userSignupFields } = usernameAndPassword;
    return {
        userSignupFields: userSignupFields && ctx.mapRefObject(userSignupFields),
    };
}
export function mapSocialAuth(socialAuth, ctx) {
    const { configFn, userSignupFields } = socialAuth;
    return {
        configFn: configFn && ctx.mapRefObject(configFn),
        userSignupFields: userSignupFields && ctx.mapRefObject(userSignupFields),
    };
}
export function mapEmailAuth(emailAuth, ctx) {
    const { userSignupFields, fromField, emailVerification, passwordReset } = emailAuth;
    return {
        userSignupFields: userSignupFields && ctx.mapRefObject(userSignupFields),
        fromField: mapEmailFromField(fromField),
        emailVerification: mapEmailFlow(emailVerification, ctx),
        passwordReset: mapEmailFlow(passwordReset, ctx),
    };
}
export function mapEmailFlow(emailFlow, ctx) {
    const { getEmailContentFn, clientRoute } = emailFlow;
    return {
        getEmailContentFn: getEmailContentFn && ctx.mapRefObject(getEmailContentFn),
        clientRoute: ctx.routeRefParser(clientRoute),
    };
}
export function mapApi(api, ctx) {
    const { method, path, fn, middlewareConfigFn, entities, auth } = api;
    return {
        fn: ctx.mapRefObject(fn),
        middlewareConfigFn: middlewareConfigFn && ctx.mapRefObject(middlewareConfigFn),
        entities: entities?.map(ctx.entityRefParser),
        httpRoute: [method, path],
        auth,
    };
}
export function mapApiNamespace(apiNamespace, ctx) {
    const { middlewareConfigFn, path } = apiNamespace;
    return {
        middlewareConfigFn: ctx.mapRefObject(middlewareConfigFn),
        path,
    };
}
export function mapServer(server, ctx) {
    const { setupFn, middlewareConfigFn, envValidationSchema } = server;
    return {
        setupFn: setupFn && ctx.mapRefObject(setupFn),
        middlewareConfigFn: middlewareConfigFn && ctx.mapRefObject(middlewareConfigFn),
        envValidationSchema: envValidationSchema && ctx.mapRefObject(envValidationSchema),
    };
}
export function mapClient(client, ctx) {
    const { rootComponent, setupFn, baseDir, envValidationSchema } = client;
    return {
        rootComponent: rootComponent && ctx.mapRefObject(rootComponent),
        setupFn: setupFn && ctx.mapRefObject(setupFn),
        baseDir,
        envValidationSchema: envValidationSchema && ctx.mapRefObject(envValidationSchema),
    };
}
export function mapDb(db, ctx) {
    const { seeds, prismaSetupFn } = db;
    return {
        seeds: seeds?.map(ctx.mapRefObject),
        prismaSetupFn: prismaSetupFn && ctx.mapRefObject(prismaSetupFn),
    };
}
export function mapEmailSender(emailSender) {
    const { provider, defaultFrom } = emailSender;
    return {
        provider,
        defaultFrom: defaultFrom && mapEmailFromField(defaultFrom),
    };
}
export function mapEmailFromField(emailFromField) {
    return {
        name: emailFromField.name,
        email: emailFromField.email,
    };
}
export function mapWebSocket(webSocket, ctx) {
    const { fn, autoConnect } = webSocket;
    return {
        fn: ctx.mapRefObject(fn),
        autoConnect,
    };
}
export function mapJob(job, ctx) {
    const { fn, executor, schedule, entities, performExecutorOptions } = job;
    return {
        executor,
        perform: {
            fn: ctx.mapRefObject(fn),
            executorOptions: performExecutorOptions,
        },
        schedule: schedule && mapSchedule(schedule),
        entities: entities?.map(ctx.entityRefParser),
    };
}
export function mapCrud(crud, ctx) {
    const { entity, operations } = crud;
    return {
        entity: ctx.entityRefParser(entity),
        operations: mapCrudOperations(operations, ctx),
    };
}
export function mapCrudOperations(operations, ctx) {
    const { get, getAll, create, update, delete: del } = operations;
    return {
        get: get && mapCrudOperationOptions(get, ctx),
        getAll: getAll && mapCrudOperationOptions(getAll, ctx),
        create: create && mapCrudOperationOptions(create, ctx),
        update: update && mapCrudOperationOptions(update, ctx),
        delete: del && mapCrudOperationOptions(del, ctx),
    };
}
export function mapCrudOperationOptions(options, ctx) {
    const { isPublic, overrideFn } = options;
    return {
        isPublic,
        overrideFn: overrideFn && ctx.mapRefObject(overrideFn),
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
export function makeRefParser(declType, declNames) {
    return function parseRef(potentialRef) {
        if (!declNames.includes(potentialRef)) {
            throw new SpecUserError(`Invalid \`${declType}\` reference: \`${potentialRef}\`\n` +
                `Please make sure that \`${potentialRef}\` is actually defined.`);
        }
        return {
            name: potentialRef,
            declType,
        };
    };
}
function extractSpecElements(id, spec) {
    return spec.filter((p) => p.kind === id);
}
function mapToDecls(items, declType, deriveName, mapValue) {
    return items.map((item) => ({
        declType,
        declName: deriveName(item),
        declValue: mapValue(item),
    }));
}
function flattenSpec(spec) {
    // We assert the `[spec]` as a `SpecElement[]` to avoid
    // inifnite recursion of the `WaspSpec.Spec` type.
    return [spec].flat(Infinity);
}
/**
 * The point of this function is to enforce exhaustivness over all AppSpec
 * declaration types, ensuring we don't forget to include anything.
 * Check the original comment for details: https://github.com/wasp-lang/wasp/pull/2393#discussion_r1866620833
 *
 * TODO: The new spec bundles all specifications (queries, actions...) together in
 * the `spec` array, so there's no need to go through them one by one.
 *
 * We'd likely be better off by:
 *   1. Mapping the entire array with a dispatcher that calls the correct
 *   mapper depending on the declaration's kind
 *   2. Passing this mapped array into the app spec (which expects them all on
 *   the same level anyway).
 * We'll likely lose some mapping type safety in the process though. Explore
 * when we're done with the port from legacy to the new spec.
 */
function ensureAllDecls(decls) {
    return Object.values(decls).flat();
}
