import { prisma } from 'wasp/server';
import { getTachesCorrectives } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getTachesCorrectives(args, {
        ...context,
        entities: {
            TacheCorrective: prisma.tacheCorrective,
            Alerte: prisma.alerte,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getTachesCorrectives.js.map