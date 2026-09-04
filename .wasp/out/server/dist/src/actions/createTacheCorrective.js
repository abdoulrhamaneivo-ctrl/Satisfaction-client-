import { prisma } from 'wasp/server';
import { createTacheCorrective } from '../../../../../src/server/actions';
export default async function (args, context) {
    return createTacheCorrective(args, {
        ...context,
        entities: {
            TacheCorrective: prisma.tacheCorrective,
            TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
            Alerte: prisma.alerte,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
        },
    });
}
//# sourceMappingURL=createTacheCorrective.js.map