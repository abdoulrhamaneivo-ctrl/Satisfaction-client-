// S3 client instancié LAZY (2026-09-02) : les variables AWS sont optionnelles
// (aucun écran métier n'uploade encore). L'ancienne instanciation au top-level
// plantait au démarrage du serveur dès qu'une clé manquait — même sans jamais
// utiliser l'upload. Maintenant le client n'est créé qu'au premier appel.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import * as path from "path";
import { HttpError, env } from "wasp/server";
import { MAX_FILE_SIZE_BYTES } from "./validation";

let _s3Client: S3Client | null = null;

function s3ClientInstance(): S3Client {
  if (!_s3Client) {
    // Les variables sont optionnelles pour le DÉMARRAGE du serveur, mais
    // dès qu'un upload est réellement demandé, elles doivent être présentes :
    // on échoue avec un message explicite plutôt qu'avec une erreur AWS
    // cryptique ("Missing credentials").
    const { AWS_S3_REGION, AWS_S3_IAM_ACCESS_KEY, AWS_S3_IAM_SECRET_KEY } = env;
    if (!AWS_S3_REGION || !AWS_S3_IAM_ACCESS_KEY || !AWS_S3_IAM_SECRET_KEY) {
      throw new HttpError(
        500,
        "L'upload de fichiers n'est pas configuré sur ce déploiement (variables AWS_S3_* manquantes)."
      );
    }
    _s3Client = new S3Client({
      region: AWS_S3_REGION,
      credentials: {
        accessKeyId: AWS_S3_IAM_ACCESS_KEY,
        secretAccessKey: AWS_S3_IAM_SECRET_KEY,
      },
    });
  }
  return _s3Client;
}

export const s3Client = new Proxy({} as S3Client, {
  get(_target, prop, receiver) {
    return Reflect.get(s3ClientInstance(), prop, receiver);
  },
});

type S3Upload = {
  fileType: string;
  fileName: string;
  userId: string;
};

export const getUploadFileSignedURLFromS3 = async ({
  fileName,
  fileType,
  userId,
}: S3Upload) => {
  const s3Key = getS3Key(fileName, userId);

  const { url: s3UploadUrl, fields: s3UploadFields } =
    await createPresignedPost(s3Client, {
      Bucket: env.AWS_S3_FILES_BUCKET!,
      Key: s3Key,
      Conditions: [["content-length-range", 0, MAX_FILE_SIZE_BYTES]],
      Fields: {
        "Content-Type": fileType,
      },
      Expires: 3600,
    });

  return { s3UploadUrl, s3Key, s3UploadFields };
};

export const getDownloadFileSignedURLFromS3 = async ({
  s3Key,
}: {
  s3Key: string;
}) => {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_FILES_BUCKET,
    Key: s3Key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const deleteFileFromS3 = async ({ s3Key }: { s3Key: string }) => {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_FILES_BUCKET,
    Key: s3Key,
  });
  await s3Client.send(command);
};

export const checkFileExistsInS3 = async ({ s3Key }: { s3Key: string }) => {
  const command = new HeadObjectCommand({
    Bucket: env.AWS_S3_FILES_BUCKET,
    Key: s3Key,
  });
  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

function getS3Key(fileName: string, userId: string) {
  const ext = path.extname(fileName).slice(1);
  return `${userId}/${randomUUID()}.${ext}`;
}
