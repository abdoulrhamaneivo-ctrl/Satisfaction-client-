import { ALLOWED_FILE_TYPES } from "./validation";
type AllowedFileTypes = (typeof ALLOWED_FILE_TYPES)[number];
export type FileWithValidType = File & {
    type: AllowedFileTypes;
};
export declare function uploadFileWithProgress({ file, s3UploadUrl, s3UploadFields, setUploadProgressPercent, }: {
    file: FileWithValidType;
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
    setUploadProgressPercent: (percentage: number) => void;
}): Promise<import("ky").KyResponse<unknown>>;
export declare function validateFile(file: File): FileWithValidType;
export {};
//# sourceMappingURL=fileUploading.d.ts.map