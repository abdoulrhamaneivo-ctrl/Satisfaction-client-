import { prisma } from 'wasp/server';
import { getComparaisonAgences } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getComparaisonAgences(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            Reponse: prisma.reponse,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getComparaisonAgences.js.map