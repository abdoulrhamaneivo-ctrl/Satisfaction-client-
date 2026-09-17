import { prisma } from 'wasp/server';
import { desactiverComptePlatform } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return desactiverComptePlatform(args, {
        ...context,
        entities: {
            User: prisma.user,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=desactiverComptePlatform.js.map