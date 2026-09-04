import { prisma } from 'wasp/server';
import { updateAffectationGuichet } from '../../../../../src/server/actions';
export default async function (args, context) {
    return updateAffectationGuichet(args, {
        ...context,
        entities: {
            User: prisma.user,
            AffectationGuichet: prisma.affectationGuichet,
            Guichet: prisma.guichet,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=updateAffectationGuichet.js.map