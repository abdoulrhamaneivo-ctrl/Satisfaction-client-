import { prisma } from 'wasp/server';
import { declencherAnalyseGlobale } from '../../../../../src/server/globalExperience';
export default async function (args, context) {
    return declencherAnalyseGlobale(args, {
        ...context,
        entities: {
            GlobalExperienceAnalysis: prisma.globalExperienceAnalysis,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=declencherAnalyseGlobale.js.map