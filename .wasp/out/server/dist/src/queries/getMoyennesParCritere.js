import { prisma } from 'wasp/server';
import { getMoyennesParCritere } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getMoyennesParCritere(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            Critere: prisma.critere,
            OptionCritere: prisma.optionCritere,
            ReponseOption: prisma.reponseOption,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getMoyennesParCritere.js.map