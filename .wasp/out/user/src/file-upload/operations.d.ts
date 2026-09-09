import { type File } from "wasp/entities";
import { type AddFileToDb, type CreateFileUploadUrl, type DeleteFile, type GetAllFilesByUser, type GetDownloadFileSignedURL } from "wasp/server/operations";
import * as z from "zod";
declare const createFileInputSchema: z.ZodObject<{
    fileType: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/webp": "image/webp";
        "application/pdf": "application/pdf";
        "text/plain": "text/plain";
        "text/csv": "text/csv";
        "video/quicktime": "video/quicktime";
        "video/mp4": "video/mp4";
    }>;
    fileName: z.ZodString;
}, z.core.$strip>;
type CreateFileInput = z.infer<typeof createFileInputSchema>;
export declare const createFileUploadUrl: CreateFileUploadUrl<CreateFileInput, {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
    s3Key: string;
}>;
declare const addFileToDbInputSchema: z.ZodObject<{
    s3Key: z.ZodString;
    fileType: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/webp": "image/webp";
        "application/pdf": "application/pdf";
        "text/plain": "text/plain";
        "text/csv": "text/csv";
        "video/quicktime": "video/quicktime";
        "video/mp4": "video/mp4";
    }>;
    fileName: z.ZodString;
}, z.core.$strip>;
type AddFileToDbInput = z.infer<typeof addFileToDbInputSchema>;
export declare const addFileToDb: AddFileToDb<AddFileToDbInput, File>;
export declare const getAllFilesByUser: GetAllFilesByUser<void, File[]>;
declare const getDownloadFileSignedURLInputSchema: z.ZodObject<{
    s3Key: z.ZodString;
}, z.core.$strip>;
type GetDownloadFileSignedURLInput = z.infer<typeof getDownloadFileSignedURLInputSchema>;
export declare const getDownloadFileSignedURL: GetDownloadFileSignedURL<GetDownloadFileSignedURLInput, string>;
declare const deleteFileInputSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
type DeleteFileInput = z.infer<typeof deleteFileInputSchema>;
export declare const deleteFile: DeleteFile<DeleteFileInput, File>;
export {};
