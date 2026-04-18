import { NextResponse } from 'next/server';

import { pauseAICallCampaign } from '@/lib/ai-call-server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pauseAICallCampaign(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause AI call campaign.' },
      { status: 400 }
    );
  }
}
