import { NextResponse } from 'next/server';

import { createAICallCampaign, listAICallCampaigns } from '@/lib/ai-call-server';

export async function GET() {
  try {
    const campaigns = await listAICallCampaigns();
    return NextResponse.json(campaigns);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list AI call campaigns.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAICallCampaign(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create AI call campaign.' },
      { status: 400 }
    );
  }
}
