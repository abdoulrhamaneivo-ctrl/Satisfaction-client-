import * as z from "zod";
// Variables AWS S3 OPTIONNELLES (2026-09-02) : le module d'upload est un
// héritage du template Open SaaS. Aucun écran métier Yéba n'uploade de
// fichier aujourd'hui (les logos de branding sont des URLs en base, pas des
// fichiers uploadés). Rendre ces variables optionnelles permet de déployer
// sans compte AWS ; les fonctionnalités d'upload seront restaurées le jour
// où une feature en aura besoin (ex. preuves de résolution de réclamation).
export const fileUploadEnvSchema = z.object({
    AWS_S3_REGION: z.string().optional(),
    AWS_S3_IAM_ACCESS_KEY: z.string().optional(),
    AWS_S3_IAM_SECRET_KEY: z.string().optional(),
    AWS_S3_FILES_BUCKET: z.string().optional(),
});
