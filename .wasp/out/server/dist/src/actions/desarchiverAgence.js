import { prisma } from 'wasp/server';
import { desarchiverAgence } from '../../../../../src/server/actions';
export default async function (args, context) {
    return desarchiverAgence(args, {
        ...context,
        entities: {
            Agence: prisma.agence,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=desarchiverAgence.js.map