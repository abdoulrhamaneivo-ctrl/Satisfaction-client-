import { prisma } from 'wasp/server';
import { getStatsByAgent } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getStatsByAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Reponse: prisma.reponse,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getStatsByAgent.js.map