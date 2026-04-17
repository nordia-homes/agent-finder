import { NextResponse } from 'next/server';

import { sendFreeFormMessage } from '@/lib/whatsapp-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await sendFreeFormMessage(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send WhatsApp message.' },
      { status: 400 }
    );
  }
}
