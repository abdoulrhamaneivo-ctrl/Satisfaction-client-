import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    Alerte: prisma.alerte,
    Guichet: prisma.guichet,
    AffectationGuichet: prisma.affectationGuichet,
    Reponse: prisma.reponse,
    User: prisma.user,
};
const jobSchedule = {
    cron: "*/30 * * * *",
    options: {},
};
// PUBLIC API
export const detecterAlertesSilence = createJobDefinition({
    jobName: 'detecterAlertesSilence',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=detecterAlertesSilence.js.map