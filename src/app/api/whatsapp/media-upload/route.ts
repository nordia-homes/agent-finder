import { NextResponse } from 'next/server';

import { adminStorage } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file upload.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const objectPath = `whatsapp-template-media/${Date.now()}-${safeFileName}`;
    const downloadToken = crypto.randomUUID();
    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(objectPath);

    await storageFile.save(buffer, {
      resumable: false,
      contentType: file.type || 'application/octet-stream',
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const encodedPath = encodeURIComponent(objectPath);
    const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url: mediaUrl, path: objectPath }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload media.' },
      { status: 500 }
    );
  }
}
