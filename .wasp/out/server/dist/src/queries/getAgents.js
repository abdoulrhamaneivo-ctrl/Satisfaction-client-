import { prisma } from 'wasp/server';
import { getAgents } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getAgents(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getAgents.js.map