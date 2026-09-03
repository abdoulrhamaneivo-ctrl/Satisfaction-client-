import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type EnvoyerRapportsMensuels<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const envoyerRapportsMensuels: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Alerte: import(".prisma/client").Prisma.AlerteDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    TacheCorrective: import(".prisma/client").Prisma.TacheCorrectiveDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=envoyerRapportsMensuels.d.ts.map