import { prisma } from 'wasp/server';
import { creerEntreprise } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return creerEntreprise(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            User: prisma.user,
            Invitation: prisma.invitation,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=creerEntreprise.js.map