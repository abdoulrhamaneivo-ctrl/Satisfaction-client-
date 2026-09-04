import { prisma } from 'wasp/server';
import { marquerAlerteTraitee } from '../../../../../src/server/actions';
export default async function (args, context) {
    return marquerAlerteTraitee(args, {
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
//# sourceMappingURL=marquerAlerteTraitee.js.map