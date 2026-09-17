import { prisma } from 'wasp/server';
import { createAgence } from '../../../../../src/server/actions';
export default async function (args, context) {
    return createAgence(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=createAgence.js.map