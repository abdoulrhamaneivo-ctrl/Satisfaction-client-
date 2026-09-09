import { prisma } from 'wasp/server';
import { deleteObjectif } from '../../../../../src/server/actions';
export default async function (args, context) {
    return deleteObjectif(args, {
        ...context,
        entities: {
            Objectif: prisma.objectif,
            Agence: prisma.agence,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=deleteObjectif.js.map