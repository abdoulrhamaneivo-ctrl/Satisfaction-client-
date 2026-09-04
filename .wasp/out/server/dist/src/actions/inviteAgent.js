import { prisma } from 'wasp/server';
import { inviteAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return inviteAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=inviteAgent.js.map