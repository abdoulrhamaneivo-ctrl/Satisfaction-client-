import { prisma } from 'wasp/server';
import { getAlertes } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getAlertes(args, {
        ...context,
        entities: {
            Alerte: prisma.alerte,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getAlertes.js.map