import { prisma } from 'wasp/server';
import { getObjectifs } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getObjectifs(args, {
        ...context,
        entities: {
            Objectif: prisma.objectif,
            Critere: prisma.critere,
            Agence: prisma.agence,
            User: prisma.user,
            Reponse: prisma.reponse,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getObjectifs.js.map