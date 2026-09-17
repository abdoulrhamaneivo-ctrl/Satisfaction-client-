import { prisma } from 'wasp/server';
import { deleteAffectationGuichet } from '../../../../../src/server/actions';
export default async function (args, context) {
    return deleteAffectationGuichet(args, {
        ...context,
        entities: {
            AffectationGuichet: prisma.affectationGuichet,
            Guichet: prisma.guichet,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=deleteAffectationGuichet.js.map