import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    Agence: prisma.agence,
    AffectationGuichet: prisma.affectationGuichet,
    ModeleHoraire: prisma.modeleHoraire,
    Guichet: prisma.guichet,
    User: prisma.user,
    Entreprise: prisma.entreprise,
};
const jobSchedule = {
    cron: "0 5 * * *",
    options: {},
};
// PUBLIC API
export const genererPlanningAutoJob = createJobDefinition({
    jobName: 'genererPlanningAutoJob',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=genererPlanningAutoJob.js.map