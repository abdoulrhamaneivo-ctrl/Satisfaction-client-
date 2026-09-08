import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  Agence: prisma.agence,
  AffectationGuichet: prisma.affectationGuichet,
  ModeleHoraire: prisma.modeleHoraire,
  Guichet: prisma.guichet,
  User: prisma.user,
  Entreprise: prisma.entreprise,
}

// PUBLIC API
export type GenererPlanningAutoJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "0 5 * * *",
  options: {},
}

// PUBLIC API
export const genererPlanningAutoJob = createJobDefinition({
  jobName: 'genererPlanningAutoJob',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
