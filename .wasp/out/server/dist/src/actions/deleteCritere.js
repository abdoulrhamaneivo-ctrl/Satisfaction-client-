import { prisma } from 'wasp/server';
import { deleteCritere } from '../../../../../src/server/actions';
export default async function (args, context) {
    return deleteCritere(args, {
        ...context,
        entities: {
            Critere: prisma.critere,
            Reponse: prisma.reponse,
            AgenceCritere: prisma.agenceCritere,
            CritereService: prisma.critereService,
            Objectif: prisma.objectif,
            User: prisma.user,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=deleteCritere.js.map