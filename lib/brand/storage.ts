import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
  isPublic: boolean = false
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(isPublic && { ACL: 'public-read' }),
  }));

  if (isPublic) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
  });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

export async function uploadBufferAndGetSignedUrl(
  key: string,
  body: Buffer,
  contentType: string,
  expiresInSeconds = 86400
): Promise<string> {
  await uploadToR2(key, body, contentType, false);
  return getSignedDownloadUrl(key, expiresInSeconds);
}

/** Download a private R2 object directly via the SDK (bypasses signed URL issues). */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const obj = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
  const bytes = await obj.Body?.transformToByteArray();
  if (!bytes) throw new Error(`R2 object empty: ${key}`);
  return Buffer.from(bytes);
}
