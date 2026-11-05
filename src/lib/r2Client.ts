import { S3Client } from '@aws-sdk/client-s3';

// Supports Ruk-Com S3, Nipa S3, AWS S3, or Cloudflare R2
const endpoint =
  process.env.S3_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
const region = process.env.S3_REGION || 'auto';

export const isR2Configured = (): boolean => {
  return Boolean(endpoint && accessKeyId && secretAccessKey);
};

export const r2Client = new S3Client({
  region,
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

export const R2_BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'toolshop-images';
export const R2_PUBLIC_URL = (process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

