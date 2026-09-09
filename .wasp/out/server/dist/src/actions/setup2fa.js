import { prisma } from 'wasp/server';
import { setup2fa } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return setup2fa(args, {
        ...context,
        entities: {
            User: prisma.user,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=setup2fa.js.map