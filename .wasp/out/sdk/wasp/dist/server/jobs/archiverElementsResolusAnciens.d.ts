import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type ArchiverElementsResolusAnciens<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const archiverElementsResolusAnciens: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=archiverElementsResolusAnciens.d.ts.map