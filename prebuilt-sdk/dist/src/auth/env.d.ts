import * as z from "zod";
export declare const authEnvSchema: z.ZodObject<{
    ADMIN_EMAILS: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<string[], string>>;
}, z.core.$strip>;
//# sourceMappingURL=env.d.ts.map