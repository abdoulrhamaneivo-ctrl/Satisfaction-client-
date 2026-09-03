import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AffectationGuichet: import(".prisma/client").Prisma.AffectationGuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type DetecterAlertesSilence<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const detecterAlertesSilence: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AffectationGuichet: import(".prisma/client").Prisma.AffectationGuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=detecterAlertesSilence.d.ts.map