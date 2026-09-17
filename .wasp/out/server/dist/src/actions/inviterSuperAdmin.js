import { prisma } from 'wasp/server';
import { inviterSuperAdmin } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return inviterSuperAdmin(args, {
        ...context,
        entities: {
            User: prisma.user,
            Invitation: prisma.invitation,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=inviterSuperAdmin.js.map