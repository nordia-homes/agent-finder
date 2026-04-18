import { NextResponse } from 'next/server';

import { retryAICallRecipient } from '@/lib/ai-call-server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const { id, recipientId } = await params;
    const result = await retryAICallRecipient(id, recipientId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry AI call recipient.' },
      { status: 400 }
    );
  }
}
