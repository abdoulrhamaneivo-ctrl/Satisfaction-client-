// Mock du module 'wasp/server' pour les tests unitaires (vitest ne connaît
// pas l'alias Wasp — voir vitest.config.ts). Miroir minimal : HttpError avec
// statusCode (comme le vrai) + prisma factice (les tests n'y touchent pas :
// ils passent leurs entities via le contexte).
export class HttpError extends Error {
    statusCode;
    data;
    constructor(statusCode, message, data) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
    }
}
export const prisma = {};
//# sourceMappingURL=waspServer.js.map