import { prisma } from 'wasp/server';
import { testerConnexionIA } from '../../../../../src/server/actions';
export default async function (args, context) {
    return testerConnexionIA(args, {
        ...context,
        entities: {
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=testerConnexionIA.js.map