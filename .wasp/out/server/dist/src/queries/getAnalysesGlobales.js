import { prisma } from 'wasp/server';
import { getAnalysesGlobales } from '../../../../../src/server/globalExperience';
export default async function (args, context) {
    return getAnalysesGlobales(args, {
        ...context,
        entities: {
            GlobalExperienceAnalysis: prisma.globalExperienceAnalysis,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getAnalysesGlobales.js.map