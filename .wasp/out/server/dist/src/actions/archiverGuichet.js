import { prisma } from 'wasp/server';
import { archiverGuichet } from '../../../../../src/server/actions';
export default async function (args, context) {
    return archiverGuichet(args, {
        ...context,
        entities: {
            Guichet: prisma.guichet,
            User: prisma.user,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=archiverGuichet.js.map