import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { detecterAlertesSilence } from '../../../../../src/server/jobs/alerteSilence'
import { detecterAlertesSilence as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: detecterAlertesSilence,
})
