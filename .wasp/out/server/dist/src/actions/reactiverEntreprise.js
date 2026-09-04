import { prisma } from 'wasp/server';
import { reactiverEntreprise } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return reactiverEntreprise(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=reactiverEntreprise.js.map