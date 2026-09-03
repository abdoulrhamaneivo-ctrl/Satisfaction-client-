export declare const env: {
    ADMIN_EMAILS: string[];
    AWS_S3_REGION?: string | undefined;
    AWS_S3_IAM_ACCESS_KEY?: string | undefined;
    AWS_S3_IAM_SECRET_KEY?: string | undefined;
    AWS_S3_FILES_BUCKET?: string | undefined;
} & ({
    NODE_ENV: "development";
    WASP_SERVER_URL: string;
    WASP_WEB_CLIENT_URL: string;
    JWT_SECRET: string;
    PORT: number;
    DATABASE_URL: string;
    SENDGRID_API_KEY: string;
    SKIP_EMAIL_VERIFICATION_IN_DEV: boolean;
    PG_BOSS_NEW_OPTIONS?: string | undefined;
} | {
    NODE_ENV: "production";
    WASP_SERVER_URL: string;
    WASP_WEB_CLIENT_URL: string;
    JWT_SECRET: string;
    PORT: number;
    DATABASE_URL: string;
    SENDGRID_API_KEY: string;
    SKIP_EMAIL_VERIFICATION_IN_DEV: boolean;
    PG_BOSS_NEW_OPTIONS?: string | undefined;
});
//# sourceMappingURL=env.d.ts.map