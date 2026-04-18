import { NextResponse } from 'next/server';

import { listAICallDashboardData } from '@/lib/ai-call-server';

export async function GET() {
  try {
    const data = await listAICallDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load AI call dashboard.' },
      { status: 500 }
    );
  }
}
