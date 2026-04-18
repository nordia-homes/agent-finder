import { NextResponse } from 'next/server';

import { getLeadAICallData } from '@/lib/ai-call-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getLeadAICallData(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load AI call data for this lead.' },
      { status: 400 }
    );
  }
}
