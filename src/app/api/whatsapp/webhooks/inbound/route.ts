import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env.server';
import { processInboundWebhook } from '@/lib/whatsapp-server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (serverEnv.INFOBIP_WEBHOOK_SECRET && authHeader !== `Bearer ${serverEnv.INFOBIP_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
    }

    const body = await request.json();
    const result = await processInboundWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process inbound webhook.' },
      { status: 400 }
    );
  }
}
