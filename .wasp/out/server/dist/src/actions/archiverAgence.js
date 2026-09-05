import { prisma } from 'wasp/server';
import { archiverAgence } from '../../../../../src/server/actions';
export default async function (args, context) {
    return archiverAgence(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            Guichet: prisma.guichet,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=archiverAgence.js.map