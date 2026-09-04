import { prisma } from 'wasp/server';
import { getThemesStats } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getThemesStats(args, {
        ...context,
        entities: {
            AnalyseAvisIA: prisma.analyseAvisIA,
            Agence: prisma.agence,
            Reponse: prisma.reponse,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getThemesStats.js.map