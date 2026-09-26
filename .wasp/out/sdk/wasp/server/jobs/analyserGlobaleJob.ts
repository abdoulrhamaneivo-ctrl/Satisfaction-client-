import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  GlobalExperienceAnalysis: prisma.globalExperienceAnalysis,
  Entreprise: prisma.entreprise,
  Reponse: prisma.reponse,
  AnalyseAvisIA: prisma.analyseAvisIA,
  Agence: prisma.agence,
  Guichet: prisma.guichet,
  Service: prisma.service,
  Critere: prisma.critere,
}

// PUBLIC API
export type AnalyserGlobaleJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = {
  cron: "0 6 * * *",
  options: {},
}

// PUBLIC API
export const analyserGlobaleJob = createJobDefinition({
  jobName: 'analyserGlobaleJob',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
