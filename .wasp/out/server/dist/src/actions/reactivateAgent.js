import { prisma } from 'wasp/server';
import { reactivateAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return reactivateAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=reactivateAgent.js.map