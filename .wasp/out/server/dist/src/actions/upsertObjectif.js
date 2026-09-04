import { prisma } from 'wasp/server';
import { upsertObjectif } from '../../../../../src/server/actions';
export default async function (args, context) {
    return upsertObjectif(args, {
        ...context,
        entities: {
            Objectif: prisma.objectif,
            Agence: prisma.agence,
            Critere: prisma.critere,
            User: prisma.user,
        },
    });
}
//# sourceMappingURL=upsertObjectif.js.map