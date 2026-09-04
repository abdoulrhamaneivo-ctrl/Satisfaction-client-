import { prisma } from 'wasp/server';
import { desarchiverAlerte } from '../../../../../src/server/actions';
export default async function (args, context) {
    return desarchiverAlerte(args, {
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
//# sourceMappingURL=desarchiverAlerte.js.map