import { prisma } from 'wasp/server';
import { changerLimitesEntreprise } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return changerLimitesEntreprise(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=changerLimitesEntreprise.js.map