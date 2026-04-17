import { NextResponse } from 'next/server';

import { dispatchCampaign } from '@/lib/whatsapp-server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await dispatchCampaign(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch campaign.' },
      { status: 400 }
    );
  }
}
