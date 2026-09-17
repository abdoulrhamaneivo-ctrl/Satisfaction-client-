import { prisma } from 'wasp/server';
import { getArchives } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getArchives(args, {
        ...context,
        entities: {
            Guichet: prisma.guichet,
            Agence: prisma.agence,
            Alerte: prisma.alerte,
            TacheCorrective: prisma.tacheCorrective,
            Reponse: prisma.reponse,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getArchives.js.map