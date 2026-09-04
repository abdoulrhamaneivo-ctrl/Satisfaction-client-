import { S3Client } from "@aws-sdk/client-s3";
export declare const s3Client: S3Client;
type S3Upload = {
    fileType: string;
    fileName: string;
    userId: string;
};
export declare const getUploadFileSignedURLFromS3: ({ fileName, fileType, userId, }: S3Upload) => Promise<{
    s3UploadUrl: string;
    s3Key: string;
    s3UploadFields: {
        [x: string]: string;
    };
}>;
export declare const getDownloadFileSignedURLFromS3: ({ s3Key, }: {
    s3Key: string;
}) => Promise<string>;
export declare const deleteFileFromS3: ({ s3Key }: {
    s3Key: string;
}) => Promise<void>;
export declare const checkFileExistsInS3: ({ s3Key }: {
    s3Key: string;
}) => Promise<boolean>;
export {};
//# sourceMappingURL=s3Utils.d.ts.map