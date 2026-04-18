import { NextResponse } from 'next/server';

import { createAICallAssistant, listAICallDashboardData } from '@/lib/ai-call-server';

export async function GET() {
  try {
    const data = await listAICallDashboardData();
    return NextResponse.json(data.assistants ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list AI call assistants.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAICallAssistant(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create AI call assistant.' },
      { status: 400 }
    );
  }
}
