import { NextResponse } from 'next/server';

import { updateTemplate } from '@/lib/whatsapp-server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateTemplate(id, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template.' },
      { status: 400 }
    );
  }
}
