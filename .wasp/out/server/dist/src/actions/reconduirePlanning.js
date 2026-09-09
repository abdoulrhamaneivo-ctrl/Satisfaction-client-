import { prisma } from 'wasp/server';
import { reconduirePlanning } from '../../../../../src/server/planning';
export default async function (args, context) {
    return reconduirePlanning(args, {
        ...context,
        entities: {
            AffectationGuichet: prisma.affectationGuichet,
            Guichet: prisma.guichet,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=reconduirePlanning.js.map