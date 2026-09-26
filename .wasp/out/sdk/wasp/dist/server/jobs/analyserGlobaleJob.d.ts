import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    GlobalExperienceAnalysis: import(".prisma/client").Prisma.GlobalExperienceAnalysisDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Entreprise: import(".prisma/client").Prisma.EntrepriseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AnalyseAvisIA: import(".prisma/client").Prisma.AnalyseAvisIADelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Service: import(".prisma/client").Prisma.ServiceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Critere: import(".prisma/client").Prisma.CritereDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type AnalyserGlobaleJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const analyserGlobaleJob: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    GlobalExperienceAnalysis: import(".prisma/client").Prisma.GlobalExperienceAnalysisDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Entreprise: import(".prisma/client").Prisma.EntrepriseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Reponse: import(".prisma/client").Prisma.ReponseDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    AnalyseAvisIA: import(".prisma/client").Prisma.AnalyseAvisIADelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Agence: import(".prisma/client").Prisma.AgenceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Guichet: import(".prisma/client").Prisma.GuichetDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Service: import(".prisma/client").Prisma.ServiceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    Critere: import(".prisma/client").Prisma.CritereDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=analyserGlobaleJob.d.ts.map