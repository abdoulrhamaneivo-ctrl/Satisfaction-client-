import * as AppSpec from "../appSpec.js";
export declare function analyzeApp(waspTsSpecPath: string, entityNames: string[]): Promise<Result<AppSpec.Decl[], string>>;
/**
 * Result type is used instead of exceptions for the normal control flow because:
 * - The error users see with the Result type is nicer (no stack trace).
 * - Exceptions can slip through the type system.
 */
type Result<Value, Error> = {
    status: "ok";
    value: Value;
} | {
    status: "error";
    error: Error;
};
export {};
//# sourceMappingURL=appAnalyzer.d.ts.map