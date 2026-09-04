import { prisma } from 'wasp/server';
import { archiverAlerte } from '../../../../../src/server/actions';
export default async function (args, context) {
    return archiverAlerte(args, {
        ...context,
        entities: {
            Alerte: prisma.alerte,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=archiverAlerte.js.map