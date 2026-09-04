import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    Alerte: prisma.alerte,
    TacheCorrective: prisma.tacheCorrective,
};
const jobSchedule = {
    cron: "0 3 * * *",
    options: {},
};
// PUBLIC API
export const archiverElementsResolusAnciens = createJobDefinition({
    jobName: 'archiverElementsResolusAnciens',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=archiverElementsResolusAnciens.js.map