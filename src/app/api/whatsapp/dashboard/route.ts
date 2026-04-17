import { NextResponse } from 'next/server';

import { listWhatsAppDashboardData } from '@/lib/whatsapp-server';

export async function GET() {
  try {
    const data = await listWhatsAppDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load WhatsApp dashboard.' },
      { status: 500 }
    );
  }
}
