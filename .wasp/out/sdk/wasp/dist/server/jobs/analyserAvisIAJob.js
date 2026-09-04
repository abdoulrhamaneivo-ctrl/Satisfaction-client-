import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    AnalyseAvisIA: prisma.analyseAvisIA,
    Reponse: prisma.reponse,
    Agence: prisma.agence,
    Guichet: prisma.guichet,
    Service: prisma.service,
    Critere: prisma.critere,
    User: prisma.user,
    Alerte: prisma.alerte,
};
const jobSchedule = {
    cron: "* * * * *",
    options: {},
};
// PUBLIC API
export const analyserAvisIAJob = createJobDefinition({
    jobName: 'analyserAvisIAJob',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=analyserAvisIAJob.js.map