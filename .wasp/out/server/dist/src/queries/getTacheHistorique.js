import { prisma } from 'wasp/server';
import { getTacheHistorique } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getTacheHistorique(args, {
        ...context,
        entities: {
            TacheCorrective: prisma.tacheCorrective,
            TacheCorrectiveHistorique: prisma.tacheCorrectiveHistorique,
            Alerte: prisma.alerte,
            Guichet: prisma.guichet,
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getTacheHistorique.js.map