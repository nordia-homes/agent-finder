'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { useUser } from '@/firebase';
import { useAICallDashboard } from '@/hooks/use-ai-call-dashboard';
import { useWhatsAppDashboard } from '@/hooks/use-whatsapp-dashboard';

type TopBarDashboardPayload = {
  campaigns?: Array<{ channel?: string }>;
  templates?: Array<unknown>;
  scheduledJobs?: Array<unknown>;
  leads?: Array<unknown>;
  health?: {
    activeCampaigns?: number;
  };
};

const emailCampaigns = 4;

export function CampaignsTopBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { data: whatsappData } = useWhatsAppDashboard<TopBarDashboardPayload>();
  const { data: aiCallData } = useAICallDashboard<TopBarDashboardPayload>();

  const isCampaignsPage = pathname === '/campaigns';

  const tickerMessage = useMemo(() => {
    const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
    const aiCampaigns = aiCallData?.campaigns?.length ?? 0;
    const aiActiveCampaigns = aiCallData?.health?.activeCampaigns ?? 0;
    const whatsappCampaigns = whatsappData?.campaigns?.length ?? 0;
    const whatsappTemplates = whatsappData?.templates?.length ?? 0;
    const whatsappScheduledJobs = whatsappData?.scheduledJobs?.length ?? 0;
    const leadCount = Math.max(aiCallData?.leads?.length ?? 0, whatsappData?.leads?.length ?? 0);

    return `Hello ${userName}, you currently have ${leadCount} leads in your outreach workspace, ${aiCampaigns} AI call campaigns with ${aiActiveCampaigns} active right now, ${whatsappCampaigns} WhatsApp campaigns ready to manage, ${emailCampaigns} email campaigns in motion, ${whatsappTemplates} WhatsApp templates in the library, and ${whatsappScheduledJobs} scheduled jobs queued for follow-up.`;
  }, [aiCallData, user, whatsappData]);

  if (!isCampaignsPage) {
    return null;
  }

  return (
    <>
      <div className="sticky top-16 z-20 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 shadow-[0_14px_34px_rgba(15,23,42,0.22)]">
        <div className="relative h-14 w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-max min-w-full items-center whitespace-nowrap italic text-slate-100 animate-[campaignTicker_36s_linear_infinite] will-change-transform">
            <span className="shrink-0 pr-12 text-sm md:text-[15px]">{tickerMessage}</span>
            <span aria-hidden="true" className="shrink-0 pr-12 text-sm md:text-[15px]">{tickerMessage}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes campaignTicker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </>
  );
}
