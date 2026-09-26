import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    GlobalExperienceAnalysis: prisma.globalExperienceAnalysis,
    Entreprise: prisma.entreprise,
    Reponse: prisma.reponse,
    AnalyseAvisIA: prisma.analyseAvisIA,
    Agence: prisma.agence,
    Guichet: prisma.guichet,
    Service: prisma.service,
    Critere: prisma.critere,
};
const jobSchedule = {
    cron: "0 6 * * *",
    options: {},
};
// PUBLIC API
export const analyserGlobaleJob = createJobDefinition({
    jobName: 'analyserGlobaleJob',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=analyserGlobaleJob.js.map