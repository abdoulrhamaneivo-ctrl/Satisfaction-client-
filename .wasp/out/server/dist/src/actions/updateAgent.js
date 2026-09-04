import { prisma } from 'wasp/server';
import { updateAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return updateAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=updateAgent.js.map