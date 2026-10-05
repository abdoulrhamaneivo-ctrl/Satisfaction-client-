import { prisma } from 'wasp/server';
import { getRepartitionOptions } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getRepartitionOptions(args, {
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
//# sourceMappingURL=getRepartitionOptions.js.map