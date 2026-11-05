import { NextResponse } from 'next/server';
import { r2Client, isR2Configured, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdminToken, getAdminTokenFromRequest } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/avif',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    // 1. Verify Admin Authentication
    const token = getAdminTokenFromRequest(req);
    const isAuthenticated = verifyAdminToken(token);

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: เฉพาะผู้ดูแลระบบที่เข้าสู่ระบบแล้วเท่านั้นที่สามารถอัปโหลดรูปภาพได้' },
        { status: 401 }
      );
    }

    // 2. Check S3 / R2 Configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'Cloudflare R2 / S3 storage credentials not configured' },
        { status: 501 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawFileName = formData.get('fileName') as string | null;

    if (!file || !rawFileName) {
      return NextResponse.json({ error: 'File and fileName are required' }, { status: 400 });
    }

    // 3. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 10MB)' },
        { status: 413 }
      );
    }

    // 4. Validate MIME Type
    const mimeType = (file.type || 'image/webp').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'ชนิดไฟล์ไม่ถูกต้อง อนุญาตเฉพาะไฟล์รูปภาพ (WebP, JPEG, PNG, GIF, AVIF) เท่านั้น' },
        { status: 415 }
      );
    }

    // 5. Sanitize fileName to prevent directory traversal
    const sanitizedFileName = rawFileName
      .replace(/\\/g, '/')
      .split('/')
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!sanitizedFileName || sanitizedFileName.length < 3) {
      return NextResponse.json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sanitizedFileName,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    // Build public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${sanitizedFileName}`
      : `https://${R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${sanitizedFileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    console.error('Storage upload error:', error);
    const msg = error instanceof Error ? error.message : 'Upload to storage failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
