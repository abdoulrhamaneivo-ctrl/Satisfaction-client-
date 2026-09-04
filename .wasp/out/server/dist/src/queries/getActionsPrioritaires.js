import { prisma } from 'wasp/server';
import { getActionsPrioritaires } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getActionsPrioritaires(args, {
        ...context,
        entities: {
            Alerte: prisma.alerte,
            TacheCorrective: prisma.tacheCorrective,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            Critere: prisma.critere,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getActionsPrioritaires.js.map