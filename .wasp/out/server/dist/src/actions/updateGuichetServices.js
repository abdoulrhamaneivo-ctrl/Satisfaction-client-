import { prisma } from 'wasp/server';
import { updateGuichetServices } from '../../../../../src/server/actions';
export default async function (args, context) {
    return updateGuichetServices(args, {
        ...context,
        entities: {
            Guichet: prisma.guichet,
            Service: prisma.service,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=updateGuichetServices.js.map