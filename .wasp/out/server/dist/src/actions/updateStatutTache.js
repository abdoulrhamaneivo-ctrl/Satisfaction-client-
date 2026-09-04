import { prisma } from 'wasp/server';
import { updateStatutTache } from '../../../../../src/server/actions';
export default async function (args, context) {
    return updateStatutTache(args, {
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
//# sourceMappingURL=updateStatutTache.js.map