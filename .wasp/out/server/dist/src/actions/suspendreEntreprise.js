import { prisma } from 'wasp/server';
import { suspendreEntreprise } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return suspendreEntreprise(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=suspendreEntreprise.js.map