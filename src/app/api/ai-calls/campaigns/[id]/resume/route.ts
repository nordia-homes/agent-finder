import { NextResponse } from 'next/server';

import { resumeAICallCampaign } from '@/lib/ai-call-server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resumeAICallCampaign(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume AI call campaign.' },
      { status: 400 }
    );
  }
}
