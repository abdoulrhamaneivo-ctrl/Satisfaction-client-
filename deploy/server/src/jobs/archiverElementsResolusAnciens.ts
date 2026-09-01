import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { archiverElementsResolusAnciens } from '../../../../../src/server/jobs/archivageAutomatique'
import { archiverElementsResolusAnciens as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: archiverElementsResolusAnciens,
})
