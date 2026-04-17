import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { createAutomation } from '@/lib/whatsapp-server';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('whatsapp_automations').orderBy('updatedAt', 'desc').get();
    return NextResponse.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list automations.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAutomation(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create automation.' },
      { status: 400 }
    );
  }
}
