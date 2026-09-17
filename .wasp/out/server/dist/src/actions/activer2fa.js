import { prisma } from 'wasp/server';
import { activer2fa } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return activer2fa(args, {
        ...context,
        entities: {
            User: prisma.user,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=activer2fa.js.map