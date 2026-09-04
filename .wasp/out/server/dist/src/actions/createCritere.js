import { prisma } from 'wasp/server';
import { createCritere } from '../../../../../src/server/actions';
export default async function (args, context) {
    return createCritere(args, {
        ...context,
        entities: {
            Critere: prisma.critere,
            AgenceCritere: prisma.agenceCritere,
            User: prisma.user,
            Agence: prisma.agence,
            Service: prisma.service,
        },
    });
}
//# sourceMappingURL=createCritere.js.map