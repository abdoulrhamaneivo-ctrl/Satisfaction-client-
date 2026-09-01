import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  AnalyseAvisIA: prisma.analyseAvisIA,
  Reponse: prisma.reponse,
  Agence: prisma.agence,
  Guichet: prisma.guichet,
  Service: prisma.service,
  Critere: prisma.critere,
  User: prisma.user,
  Alerte: prisma.alerte,
}

// PUBLIC API
export type AnalyserAvisIAJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "* * * * *",
  options: {},
}

// PUBLIC API
export const analyserAvisIAJob = createJobDefinition({
  jobName: 'analyserAvisIAJob',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
