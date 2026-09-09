import { prisma } from 'wasp/server';
import { promouvoirAgent } from '../../../../../src/server/actions';
export default async function (args, context) {
    return promouvoirAgent(args, {
        ...context,
        entities: {
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=promouvoirAgent.js.map