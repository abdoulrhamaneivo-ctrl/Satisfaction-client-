import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { envoyerRapportsMensuels } from '../../../../../src/server/jobs/rapportMensuel'
import { envoyerRapportsMensuels as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: envoyerRapportsMensuels,
})
