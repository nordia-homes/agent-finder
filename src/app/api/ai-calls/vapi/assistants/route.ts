import { NextResponse } from 'next/server';

import { listAICallDashboardData, updateManagedAssistant } from '@/lib/ai-call-server';

export async function GET() {
  try {
    const data = await listAICallDashboardData();
    return NextResponse.json(data.workspace?.assistants ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list Vapi assistants.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const result = await updateManagedAssistant(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Vapi assistant.' },
      { status: 400 }
    );
  }
}
