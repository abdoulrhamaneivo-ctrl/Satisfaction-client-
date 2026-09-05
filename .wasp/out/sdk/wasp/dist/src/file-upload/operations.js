import { HttpError } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { checkFileExistsInS3, deleteFileFromS3, getDownloadFileSignedURLFromS3, getUploadFileSignedURLFromS3, } from "./s3Utils";
import { ALLOWED_FILE_TYPES } from "./validation";
const createFileInputSchema = z.object({
    fileType: z.enum(ALLOWED_FILE_TYPES),
    fileName: z.string().nonempty(),
});
export const createFileUploadUrl = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401);
    }
    const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createFileInputSchema, rawArgs);
    return await getUploadFileSignedURLFromS3({
        fileType,
        fileName,
        userId: context.user.id,
    });
};
const addFileToDbInputSchema = z.object({
    s3Key: z.string(),
    fileType: z.enum(ALLOWED_FILE_TYPES),
    fileName: z.string(),
});
export const addFileToDb = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401);
    }
    const args = ensureArgsSchemaOrThrowHttpError(addFileToDbInputSchema, rawArgs);
    // FIX 05/09 (audit) : sans ce contrôle, un utilisateur pouvait associer à
    // son compte n'importe quelle clé S3 existante (ex. devinée ou fuitée)
    // puis la télécharger ou la faire supprimer. Les clés générées par Yeba
    // ont la forme `${userId}/${uuid}.${ext}` — on exige ce préfixe.
    // Conforme au helper isS3KeyOwnedByUser (src/server/security/policies.ts).
    const prefixeAttendu = `${context.user.id}/`;
    if (!args.s3Key.startsWith(prefixeAttendu) || args.s3Key.length <= prefixeAttendu.length) {
        throw new HttpError(403, "Clé de fichier non autorisée pour ce compte.");
    }
    const fileExists = await checkFileExistsInS3({ s3Key: args.s3Key });
    if (!fileExists) {
        throw new HttpError(404, "File not found in S3.");
    }
    return context.entities.File.create({
        data: {
            name: args.fileName,
            s3Key: args.s3Key,
            type: args.fileType,
            user: { connect: { id: context.user.id } },
        },
    });
};
export const getAllFilesByUser = async (_args, context) => {
    if (!context.user) {
        throw new HttpError(401);
    }
    return context.entities.File.findMany({
        where: {
            user: {
                id: context.user.id,
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};
const getDownloadFileSignedURLInputSchema = z.object({
    s3Key: z.string().nonempty(),
});
// SÉCURITÉ (audit P1) : l'ancienne version acceptait n'importe quel s3Key et
// renvoyait l'URL signée SANS vérifier que le fichier appartient à
// l'appelant — n'importe quel utilisateur connecté pouvait télécharger les
// fichiers des autres en devinant/obtenant la clé S3. On vérifie maintenant
// l'authentification ET la propriété du fichier AVANT de signer.
export const getDownloadFileSignedURL = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401);
    }
    const { s3Key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
    // Seul le PROPRIÉTAIRE du fichier (via la relation File.user) peut obtenir
    // une URL signée. Same-policy que deleteFile.
    const fichier = await context.entities.File.findFirst({
        where: {
            s3Key,
            user: {
                id: context.user.id,
            },
        },
        select: { id: true },
    });
    if (!fichier) {
        // 404 volontaire (pas 403) : ne pas confirmer l'existence d'un fichier
        // hors périmètre à un éventuel attaquant.
        throw new HttpError(404, "Fichier introuvable.");
    }
    return await getDownloadFileSignedURLFromS3({ s3Key });
};
const deleteFileInputSchema = z.object({
    id: z.string(),
});
export const deleteFile = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401);
    }
    const args = ensureArgsSchemaOrThrowHttpError(deleteFileInputSchema, rawArgs);
    const deletedFile = await context.entities.File.delete({
        where: {
            id: args.id,
            user: {
                id: context.user.id,
            },
        },
    });
    try {
        await deleteFileFromS3({ s3Key: deletedFile.s3Key });
    }
    catch (error) {
        console.error(`S3 deletion failed. Orphaned file s3Key: ${deletedFile.s3Key}`, error);
    }
    return deletedFile;
};
//# sourceMappingURL=operations.js.map