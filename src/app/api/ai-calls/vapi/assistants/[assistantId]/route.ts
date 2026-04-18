import { NextResponse } from 'next/server';

import { getManagedAssistant } from '@/lib/ai-call-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assistantId: string }> }
) {
  try {
    const { assistantId } = await params;
    const result = await getManagedAssistant(assistantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Vapi assistant.' },
      { status: 400 }
    );
  }
}
