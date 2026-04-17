import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { createCampaign } from '@/lib/whatsapp-server';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('whatsapp_campaigns').orderBy('updatedAt', 'desc').get();
    return NextResponse.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list campaigns.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createCampaign(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign.' },
      { status: 400 }
    );
  }
}
