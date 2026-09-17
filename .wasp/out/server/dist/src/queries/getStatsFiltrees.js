import { prisma } from 'wasp/server';
import { getStatsFiltrees } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getStatsFiltrees(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getStatsFiltrees.js.map