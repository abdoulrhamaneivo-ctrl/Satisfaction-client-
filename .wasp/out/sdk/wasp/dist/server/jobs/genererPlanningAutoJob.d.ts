import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AffectationGuichet: import(".prisma/client").Prisma.AffectationGuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    ModeleHoraire: import(".prisma/client").Prisma.ModeleHoraireDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Entreprise: import(".prisma/client").Prisma.EntrepriseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type GenererPlanningAutoJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const genererPlanningAutoJob: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AffectationGuichet: import(".prisma/client").Prisma.AffectationGuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    ModeleHoraire: import(".prisma/client").Prisma.ModeleHoraireDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Entreprise: import(".prisma/client").Prisma.EntrepriseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=genererPlanningAutoJob.d.ts.map