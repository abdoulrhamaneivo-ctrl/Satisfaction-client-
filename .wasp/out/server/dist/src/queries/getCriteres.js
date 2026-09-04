import { prisma } from 'wasp/server';
import { getCriteres } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getCriteres(args, {
        ...context,
        entities: {
            Critere: prisma.critere,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getCriteres.js.map