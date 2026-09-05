import { prisma } from 'wasp/server';
import { deleteAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return deleteAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=deleteAgent.js.map