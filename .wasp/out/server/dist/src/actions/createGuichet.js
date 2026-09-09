import { prisma } from 'wasp/server';
import { createGuichet } from '../../../../../src/server/actions';
export default async function (args, context) {
    return createGuichet(args, {
        ...context,
        entities: {
            Guichet: prisma.guichet,
            User: prisma.user,
            Service: prisma.service,
            AffectationGuichet: prisma.affectationGuichet,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=createGuichet.js.map