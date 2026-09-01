import * as z from "zod";
export declare const fileUploadEnvSchema: z.ZodObject<{
    AWS_S3_REGION: z.ZodString;
    AWS_S3_IAM_ACCESS_KEY: z.ZodString;
    AWS_S3_IAM_SECRET_KEY: z.ZodString;
    AWS_S3_FILES_BUCKET: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=env.d.ts.map