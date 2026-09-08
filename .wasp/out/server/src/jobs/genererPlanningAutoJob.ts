import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { genererPlanningAutoJob } from '../../../../../src/server/jobs/genererPlanning'
import { genererPlanningAutoJob as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: genererPlanningAutoJob,
})
