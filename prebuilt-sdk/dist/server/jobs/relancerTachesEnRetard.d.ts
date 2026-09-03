import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type RelancerTachesEnRetard<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const relancerTachesEnRetard: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=relancerTachesEnRetard.d.ts.map