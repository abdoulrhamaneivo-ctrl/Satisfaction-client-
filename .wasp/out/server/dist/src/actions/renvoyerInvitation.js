import { prisma } from 'wasp/server';
import { renvoyerInvitation } from '../../../../../src/server/actionsPlatform';
export default async function (args, context) {
    return renvoyerInvitation(args, {
        ...context,
        entities: {
            Entreprise: prisma.entreprise,
            User: prisma.user,
            Invitation: prisma.invitation,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=renvoyerInvitation.js.map