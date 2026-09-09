import { prisma } from 'wasp/server';
import { getPlatformAudit } from '../../../../../src/server/queriesPlatform';
export default async function (args, context) {
    return getPlatformAudit(args, {
        ...context,
        entities: {
            AuditLog: prisma.auditLog,
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=getPlatformAudit.js.map