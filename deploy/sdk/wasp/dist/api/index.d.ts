export declare function setSessionId(sessionId: string): void;
export declare function getSessionId(): string | null;
export declare function clearSessionId(): void;
export declare function removeLocalUserData(): void;
/**
 * A ky instance configured for the Wasp API server.
 *
 * Automatically prepends the API base URL, adds authentication headers,
 * and handles session invalidation on 401 responses. Non-2xx responses
 * cause ky to throw an `HTTPError`; pass it through `handleApiError` to
 * get a `WaspHttpError` carrying the server's status code, message, and
 * response body.
 */
export declare const api: import("ky").KyInstance;
/**
 * Takes an error returned by the app's API (as thrown by ky), and transforms it into a more
 * standard format to be further used by the client. It is also assumed that given API
 * error has been formatted as implemented by HttpError on the server.
 */
export declare function handleApiError(error: unknown): unknown;
//# sourceMappingURL=index.d.ts.map