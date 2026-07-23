/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from "vitest";
import { GET_TS_APP_SPEC } from "../../src/legacy/_private.js";
import { makeRefParser, mapApi, mapApiNamespace, mapApp, mapCrud, mapJob, mapOperation, mapPage, mapRoute, mapTsAppSpecToAppSpecDecls, } from "../../src/legacy/mapTsAppSpecToAppSpecDecls.js";
import * as Fixtures from "./testFixtures.js";
describe("mapTsAppSpecToAppSpecDecls", () => {
    test("should map full app using mapping functions correctly", () => {
        const { appConfigName, app } = Fixtures.createApp("full");
        const tsAppSpec = app[GET_TS_APP_SPEC]();
        const entities = Fixtures.getEntities("full");
        const entityRefParser = makeRefParser("Entity", entities);
        const routeRefParser = makeRefParser("Route", Fixtures.getRouteConfigs().map((r) => r.name));
        const pageRefParser = makeRefParser("Page", Fixtures.getPageConfigs().map((p) => p.name));
        const appDeclType = "App";
        const result = mapTsAppSpecToAppSpecDecls(tsAppSpec, entities);
        const appDecl = getDecl(result, appDeclType, appConfigName);
        expect(appDecl).toStrictEqual({
            declType: appDeclType,
            declName: appConfigName,
            declValue: mapApp(tsAppSpec.app.config, entityRefParser, routeRefParser, tsAppSpec.auth, tsAppSpec.client, tsAppSpec.server, tsAppSpec.db, tsAppSpec.emailSender, tsAppSpec.websocket),
        });
        expectCorrectDeclMapping({
            declType: "Page",
            decls: tsAppSpec.pages,
            expectedMapping: {
                function: mapPage,
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Route",
            decls: tsAppSpec.routes,
            expectedMapping: {
                function: mapRoute,
                extraArgs: [pageRefParser],
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Query",
            decls: tsAppSpec.queries,
            expectedMapping: {
                function: mapOperation,
                extraArgs: [entityRefParser],
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Action",
            decls: tsAppSpec.actions,
            expectedMapping: {
                function: mapOperation,
                extraArgs: [entityRefParser],
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Crud",
            decls: tsAppSpec.cruds,
            expectedMapping: {
                function: mapCrud,
                extraArgs: [entityRefParser],
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "ApiNamespace",
            decls: tsAppSpec.apiNamespaces,
            expectedMapping: {
                function: mapApiNamespace,
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Api",
            decls: tsAppSpec.apis,
            expectedMapping: {
                function: mapApi,
                extraArgs: [entityRefParser],
            },
            actualMapping: result,
        });
        expectCorrectDeclMapping({
            declType: "Job",
            decls: tsAppSpec.jobs,
            expectedMapping: {
                function: mapJob,
                extraArgs: [entityRefParser],
            },
            actualMapping: result,
        });
    });
    test("should map minimal app using mapping functions correctly", () => {
        const { appConfigName, app } = Fixtures.createApp("minimal");
        const tsAppSpec = app[GET_TS_APP_SPEC]();
        const entities = Fixtures.getEntities("minimal");
        const entityRefParser = makeRefParser("Entity", entities);
        const routeRefParser = makeRefParser("Route", []);
        const appDeclType = "App";
        const result = mapTsAppSpecToAppSpecDecls(tsAppSpec, entities);
        const appDecl = getDecl(result, appDeclType, appConfigName);
        expect(appDecl).toStrictEqual({
            declType: appDeclType,
            declName: appConfigName,
            declValue: mapApp(tsAppSpec.app.config, entityRefParser, routeRefParser, tsAppSpec.auth, tsAppSpec.server, tsAppSpec.client, tsAppSpec.db, tsAppSpec.emailSender, tsAppSpec.websocket),
        });
    });
    function expectCorrectDeclMapping({ declType, decls, expectedMapping, actualMapping, }) {
        const { function: mappingFn, extraArgs = [] } = expectedMapping;
        decls.forEach((config, name) => {
            const resultDecl = getDecl(actualMapping, declType, name);
            expect(resultDecl).toStrictEqual({
                declType,
                declName: name,
                declValue: mappingFn(config, ...extraArgs),
            });
        });
    }
    /**
     * Retrieves a specific declaration from a list of declarations based on its type and name.
     */
    function getDecl(decls, declType, declName) {
        const decl = decls.find((decl) => decl.declType === declType && decl.declName === declName);
        return decl;
    }
});
