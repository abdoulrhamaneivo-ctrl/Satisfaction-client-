import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    Agence: prisma.agence,
    Reponse: prisma.reponse,
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
    User: prisma.user,
};
const jobSchedule = {
    cron: "0 7 1 * *",
    options: {},
};
// PUBLIC API
export const envoyerRapportsMensuels = createJobDefinition({
    jobName: 'envoyerRapportsMensuels',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=envoyerRapportsMensuels.js.map