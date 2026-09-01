import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { relancerTachesEnRetard } from '../../../../../src/server/jobs/relanceTache'
import { relancerTachesEnRetard as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: relancerTachesEnRetard,
})
