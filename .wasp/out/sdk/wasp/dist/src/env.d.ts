import * as z from "zod";
export declare const serverEnvValidationSchema: z.ZodObject<{
    JWT_SECRET: z.ZodString;
    JWT_SECRET_PREVIOUS: z.ZodOptional<z.ZodString>;
    TOTP_ENCRYPTION_KEY: z.ZodString;
    TOTP_ENCRYPTION_KEY_PREVIOUS: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    ANTI_REPLAY_SALT: z.ZodString;
    ANTI_REPLAY_SALT_PREVIOUS: z.ZodOptional<z.ZodString>;
    AWS_S3_REGION: z.ZodOptional<z.ZodString>;
    AWS_S3_IAM_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    AWS_S3_IAM_SECRET_KEY: z.ZodOptional<z.ZodString>;
    AWS_S3_FILES_BUCKET: z.ZodOptional<z.ZodString>;
    ADMIN_EMAILS: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<string[], string>>;
}, z.core.$strip>;
//# sourceMappingURL=env.d.ts.map