import { NextResponse } from 'next/server';

import { getLeadWhatsAppData } from '@/lib/whatsapp-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getLeadWhatsAppData(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load lead WhatsApp data.' },
      { status: 400 }
    );
  }
}
