import { prisma } from 'wasp/server';
import { changerPlatformRole } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return changerPlatformRole(args, {
        ...context,
        entities: {
            User: prisma.user,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=changerPlatformRole.js.map