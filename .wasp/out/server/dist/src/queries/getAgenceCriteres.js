import { prisma } from 'wasp/server';
import { getAgenceCriteres } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getAgenceCriteres(args, {
        ...context,
        entities: {
            AgenceCritere: prisma.agenceCritere,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getAgenceCriteres.js.map