import { NextResponse } from 'next/server';

import { dispatchDueAICallJobs } from '@/lib/ai-call-server';

export async function POST() {
  try {
    const result = await dispatchDueAICallJobs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch due AI call jobs.' },
      { status: 500 }
    );
  }
}
