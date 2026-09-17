import * as z from "zod";
export declare const fileUploadEnvSchema: z.ZodObject<{
    AWS_S3_REGION: z.ZodOptional<z.ZodString>;
    AWS_S3_IAM_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    AWS_S3_IAM_SECRET_KEY: z.ZodOptional<z.ZodString>;
    AWS_S3_FILES_BUCKET: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
