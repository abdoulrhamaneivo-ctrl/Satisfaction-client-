import { registerJob } from 'wasp/server/jobs/core/pgBoss';
import { analyserGlobaleJob } from '../../../../../src/server/jobs/analyseGlobale';
import { analyserGlobaleJob as _waspJobDefinition } from 'wasp/server/jobs';
registerJob({
    job: _waspJobDefinition,
    jobFn: analyserGlobaleJob,
});
//# sourceMappingURL=analyserGlobaleJob.js.map