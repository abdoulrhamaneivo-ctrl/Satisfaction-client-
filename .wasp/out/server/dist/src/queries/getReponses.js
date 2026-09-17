import { prisma } from 'wasp/server';
import { getReponses } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getReponses(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            Critere: prisma.critere,
            Guichet: prisma.guichet,
            Service: prisma.service,
            Agence: prisma.agence,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getReponses.js.map