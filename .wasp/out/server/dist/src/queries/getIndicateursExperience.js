import { prisma } from 'wasp/server';
import { getIndicateursExperience } from '../../../../../src/server/queries';
export default async function (args, context) {
    return getIndicateursExperience(args, {
        ...context,
        entities: {
            Reponse: prisma.reponse,
            AnalyseAvisIA: prisma.analyseAvisIA,
            Agence: prisma.agence,
            Guichet: prisma.guichet,
            Service: prisma.service,
            Critere: prisma.critere,
            GlobalExperienceAnalysis: prisma.globalExperienceAnalysis,
            Entreprise: prisma.entreprise,
        },
    });
}
//# sourceMappingURL=getIndicateursExperience.js.map