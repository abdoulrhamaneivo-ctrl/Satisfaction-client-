import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    TacheCorrective: prisma.tacheCorrective,
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    User: prisma.user,
};
const jobSchedule = {
    cron: "0 8 * * *",
    options: {},
};
// PUBLIC API
export const relancerTachesEnRetard = createJobDefinition({
    jobName: 'relancerTachesEnRetard',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=relancerTachesEnRetard.js.map