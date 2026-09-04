import { prisma } from 'wasp/server';
import { getRechercheGlobale } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getRechercheGlobale(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            Guichet: prisma.guichet,
            User: prisma.user,
            Reponse: prisma.reponse,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getRechercheGlobale.js.map