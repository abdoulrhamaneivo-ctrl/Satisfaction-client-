import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  Alerte: prisma.alerte,
  Guichet: prisma.guichet,
  AffectationGuichet: prisma.affectationGuichet,
  Reponse: prisma.reponse,
  User: prisma.user,
}

// PUBLIC API
export type DetecterAlertesSilence<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "*/30 * * * *",
  options: {},
}

// PUBLIC API
export const detecterAlertesSilence = createJobDefinition({
  jobName: 'detecterAlertesSilence',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
