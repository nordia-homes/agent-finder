import { NextResponse } from 'next/server';

import { dispatchDueJobs } from '@/lib/whatsapp-server';

export async function POST() {
  try {
    const result = await dispatchDueJobs();
    return NextResponse.json({ jobs: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch due jobs.' },
      { status: 500 }
    );
  }
}
