import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  Alerte: prisma.alerte,
  TacheCorrective: prisma.tacheCorrective,
}

// PUBLIC API
export type ArchiverElementsResolusAnciens<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "0 3 * * *",
  options: {},
}

// PUBLIC API
export const archiverElementsResolusAnciens = createJobDefinition({
  jobName: 'archiverElementsResolusAnciens',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
