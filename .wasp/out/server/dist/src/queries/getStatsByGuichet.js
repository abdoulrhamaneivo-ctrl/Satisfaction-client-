import { prisma } from 'wasp/server';
import { getStatsByGuichet } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getStatsByGuichet(args, {
        ...context,
        entities: {
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getStatsByGuichet.js.map