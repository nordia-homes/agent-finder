import { NextResponse } from 'next/server';

import { processVapiWebhook } from '@/lib/ai-call-server';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await processVapiWebhook(rawBody, {
      signature: request.headers.get('x-vapi-signature') ?? '',
      authorization: request.headers.get('authorization') ?? '',
      secret: request.headers.get('x-vapi-secret') ?? '',
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process Vapi webhook.' },
      { status: 400 }
    );
  }
}
