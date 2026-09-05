import { prisma } from 'wasp/server';
import { renvoyerInvitationAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return renvoyerInvitationAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
            Invitation: prisma.invitation,
            AuditLog: prisma.auditLog,
        },
    });
}
//# sourceMappingURL=renvoyerInvitationAgent.js.map