import { prisma } from 'wasp/server';
import { verifier2fa } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return verifier2fa(args, {
        ...context,
        entities: {
            User: prisma.user,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=verifier2fa.js.map