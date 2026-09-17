import { prisma } from 'wasp/server';
import { getTempsTraitement } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getTempsTraitement(args, {
        ...context,
        entities: {
            Alerte: prisma.alerte,
            TacheCorrective: prisma.tacheCorrective,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getTempsTraitement.js.map