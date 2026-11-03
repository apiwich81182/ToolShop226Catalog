import { NextResponse } from 'next/server';
import { r2Client, isR2Configured, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'Cloudflare R2 credentials not configured' },
        { status: 501 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file || !fileName) {
      return NextResponse.json({ error: 'File and fileName are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    // Build public URL (custom domain e.g. https://img.toolshop226p.com or R2 dev URL)
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${fileName}`
      : `https://${R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    console.error('Cloudflare R2 upload error:', error);
    const msg = error instanceof Error ? error.message : 'Upload to Cloudflare R2 failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
