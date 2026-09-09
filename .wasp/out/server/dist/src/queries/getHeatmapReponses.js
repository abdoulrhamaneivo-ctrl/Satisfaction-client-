import { prisma } from 'wasp/server';
import { getHeatmapReponses } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getHeatmapReponses(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            User: prisma.user,
            Agence: prisma.agence,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getHeatmapReponses.js.map