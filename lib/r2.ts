import { randomUUID } from "node:crypto";
import { CopyObjectCommand, DeleteObjectCommand, S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
};

type SignedUploadInput = {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
};

type UploadObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

let cachedClient: S3Client | null = null;

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getR2Config(): R2Config {
  const accountId = readEnv("R2_ACCOUNT_ID");
  const bucketName = readEnv("R2_BUCKET_NAME");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 configuration. Expected R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: readEnv("R2_PUBLIC_BASE_URL")
  };
}

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return cachedClient;
}

function sanitizePathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "");
}

function splitFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extensionIndex = trimmed.lastIndexOf(".");

  if (extensionIndex <= 0 || extensionIndex === trimmed.length - 1) {
    return {
      name: trimmed || "file",
      extension: ""
    };
  }

  return {
    name: trimmed.slice(0, extensionIndex),
    extension: trimmed.slice(extensionIndex)
  };
}

export function buildR2ObjectKey(fileName: string, folder?: string | null) {
  const { name, extension } = splitFileName(fileName);
  const safeName = sanitizePathPart(name) || "file";
  const safeFolder = folder ? sanitizePathPart(folder).replace(/^\/+|\/+$/g, "") : "";
  const uniqueSuffix = randomUUID();
  const key = `${safeName}-${uniqueSuffix}${extension.toLowerCase()}`;

  return safeFolder ? `${safeFolder}/${key}` : key;
}

export async function createSignedR2Upload({ key, contentType, expiresInSeconds = 300 }: SignedUploadInput) {
  const config = getR2Config();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: expiresInSeconds
  });

  return {
    key,
    bucket: config.bucketName,
    uploadUrl,
    expiresInSeconds,
    publicUrl: getR2PublicUrl(key)
  };
}

export async function uploadToR2({ key, body, contentType }: UploadObjectInput) {
  const config = getR2Config();
  const result = await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );

  return {
    key,
    bucket: config.bucketName,
    etag: result.ETag ?? null,
    publicUrl: getR2PublicUrl(key)
  };
}

export async function deleteFromR2(key: string) {
  const config = getR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key
    })
  );

  return {
    key,
    bucket: config.bucketName
  };
}

export async function renameR2Object(sourceKey: string, destinationKey: string) {
  const config = getR2Config();
  await getR2Client().send(
    new CopyObjectCommand({
      Bucket: config.bucketName,
      CopySource: `${config.bucketName}/${sourceKey}`,
      Key: destinationKey
    })
  );
  await deleteFromR2(sourceKey);

  return {
    fromKey: sourceKey,
    key: destinationKey,
    bucket: config.bucketName,
    publicUrl: getR2PublicUrl(destinationKey)
  };
}

export function getR2PublicUrl(key: string) {
  const { publicBaseUrl } = getR2Config();
  if (!publicBaseUrl) {
    return null;
  }

  const normalizedBase = publicBaseUrl.replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedKey}`;
}
