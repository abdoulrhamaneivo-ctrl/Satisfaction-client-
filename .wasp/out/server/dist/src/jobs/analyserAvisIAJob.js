import { registerJob } from 'wasp/server/jobs/core/pgBoss';
import { analyserAvisIAJob } from '../../../../../src/server/jobs/analyserAvisIA';
import { analyserAvisIAJob as _waspJobDefinition } from 'wasp/server/jobs';
registerJob({
    job: _waspJobDefinition,
    jobFn: analyserAvisIAJob,
});
//# sourceMappingURL=analyserAvisIAJob.js.map