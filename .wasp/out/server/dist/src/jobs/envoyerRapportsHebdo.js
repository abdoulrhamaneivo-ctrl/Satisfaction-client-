import { registerJob } from 'wasp/server/jobs/core/pgBoss';
import { envoyerRapportsHebdo } from '../../../../../src/server/jobs/rapportMensuel';
import { envoyerRapportsHebdo as _waspJobDefinition } from 'wasp/server/jobs';
registerJob({
    job: _waspJobDefinition,
    jobFn: envoyerRapportsHebdo,
});
//# sourceMappingURL=envoyerRapportsHebdo.js.map