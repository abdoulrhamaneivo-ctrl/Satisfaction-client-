import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  Agence: prisma.agence,
  Reponse: prisma.reponse,
  Alerte: prisma.alerte,
  TacheCorrective: prisma.tacheCorrective,
  User: prisma.user,
}

// PUBLIC API
export type EnvoyerRapportsMensuels<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "0 7 1 * *",
  options: {},
}

// PUBLIC API
export const envoyerRapportsMensuels = createJobDefinition({
  jobName: 'envoyerRapportsMensuels',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
