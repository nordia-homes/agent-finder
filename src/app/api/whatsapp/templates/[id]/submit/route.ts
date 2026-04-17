import { NextResponse } from 'next/server';

import { submitTemplate } from '@/lib/whatsapp-server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await submitTemplate(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit template.' },
      { status: 400 }
    );
  }
}
