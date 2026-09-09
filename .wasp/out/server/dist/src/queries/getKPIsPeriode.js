import { prisma } from 'wasp/server';
import { getKPIsPeriode } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getKPIsPeriode(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getKPIsPeriode.js.map