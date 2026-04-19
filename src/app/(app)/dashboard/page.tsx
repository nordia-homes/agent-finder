'use client';

import { useMemo } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ArrowUpRight, BadgeCheck, BarChart3, CheckCircle, FilePlus, Hand, MessageSquare, Phone, Rocket, Users } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SalesFunnelChart } from '@/components/dashboard/sales-funnel-chart';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Lead } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const { todayTimestamp, tomorrowTimestamp } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      todayTimestamp: Timestamp.fromDate(today),
      tomorrowTimestamp: Timestamp.fromDate(tomorrow),
    };
  }, []);

  const newLeadsTodayQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'leads'),
      where('created_at', '>=', todayTimestamp),
      where('created_at', '<', tomorrowTimestamp)
    );
  }, [firestore, user, todayTimestamp, tomorrowTimestamp]);

  const { data: newLeadsToday, loading: newLeadsLoading } = useCollection(newLeadsTodayQuery);
  
  const totalLeads = useMemo(() => leads?.length || 0, [leads]);
  const likelyIndependent = useMemo(() => leads?.filter(l => l.classification === 'likely_independent').length || 0, [leads]);
  const contacted = useMemo(() => leads?.filter((l) => normalizeLeadStatus(l.lead_status) === 'contacted').length || 0, [leads]);
  const demosBooked = useMemo(() => leads?.filter((l) => normalizeLeadStatus(l.lead_status) === 'demo_sent').length || 0, [leads]);
  const trialStarted = useMemo(() => leads?.filter((l) => normalizeLeadStatus(l.lead_status) === 'trial_started').length || 0, [leads]);
  const won = useMemo(() => leads?.filter((l) => normalizeLeadStatus(l.lead_status) === 'won').length || 0, [leads]);
  const contactRate = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;
  const demoRate = totalLeads > 0 ? Math.round((demosBooked / totalLeads) * 100) : 0;
  const winRate = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0;

  const isLoading = userLoading || leadsLoading || newLeadsLoading;

  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          eyebrow="Coverage"
          title="Total Leads"
          value={isLoading ? '...' : totalLeads.toString()}
          icon={<Users className="h-5 w-5" />}
          meta={!isLoading ? `${totalLeads} records tracked` : ' '}
          description="Total records in your commercial pipeline."
          className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,248,253,0.98))]"
        />
        <KpiCard
          eyebrow="Daily inflow"
          title="New Leads Today"
          value={isLoading ? '...' : (newLeadsToday?.length || 0).toString()}
          icon={<FilePlus className="h-5 w-5" />}
          meta={!isLoading ? `${newLeadsToday?.length || 0} added today` : ' '}
          description="Fresh records added into the pipeline today."
          className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,250,255,0.98))]"
        />
        <KpiCard
          eyebrow="Quality"
          title="Likely Independent"
          value={isLoading ? '...' : likelyIndependent.toString()}
          meta={!isLoading ? `${Math.round((likelyIndependent / Math.max(totalLeads, 1)) * 100)}% of total` : ' '}
          description="Leads most likely to be independent agents."
          icon={<CheckCircle className="h-5 w-5" />}
          className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,251,248,0.98))]"
        />
        <KpiCard
          eyebrow="Movement"
          title="Contacted"
          value={isLoading ? '...' : contacted.toString()}
          meta={!isLoading ? `${contactRate}% of total` : ' '}
          metaType="positive"
          description="Leads that already moved beyond raw intake."
          icon={<Hand className="h-5 w-5" />}
          className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,251,247,0.98))]"
        />
        <KpiCard
          eyebrow="Commercial"
          title="Demo Sent"
          value={isLoading ? '...' : demosBooked.toString()}
          meta={!isLoading ? `${demoRate}% demo rate` : ' '}
          metaType="neutral"
          description="Leads that accepted demo delivery."
          icon={<BarChart3 className="h-5 w-5" />}
          className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,247,252,0.98))]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            eyebrow="Activation"
            title="Trial Started"
            value={isLoading ? '...' : trialStarted.toString()}
            meta={!isLoading ? `${trialStarted} active trials` : ' '}
            description="Accounts that moved into product evaluation."
            icon={<Rocket className="h-5 w-5" />}
            className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(243,247,253,0.98))]"
          />
          <KpiCard
            eyebrow="Revenue"
            title="Won"
            value={isLoading ? '...' : won.toString()}
            meta={!isLoading ? `${winRate}% win rate` : ' '}
            metaType="positive"
            description="Closed opportunities in the pipeline."
            icon={<BadgeCheck className="h-5 w-5" />}
            className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,251,248,0.98))]"
          />
          <KpiCard
            eyebrow="Outreach"
            title="AI Calls + WhatsApp"
            value="0"
            meta="0 actions today"
            description="Daily outbound automation volume."
            icon={<ArrowUpRight className="h-5 w-5" />}
            className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,247,252,0.98))]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,248,253,0.98))] p-6 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Outreach</p>
                <p className="min-h-[3.5rem] text-sm font-medium leading-7 text-slate-500">AI calling</p>
              </div>
              <div className="rounded-2xl bg-[#eef3fb] p-3 text-[#5e7199]">
                <Phone className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <p className="min-h-[3.25rem] text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-900">0</p>
              <div className="min-h-[2rem]">
                <span className="inline-flex min-h-8 items-center rounded-full bg-[#eef3fb] px-2.5 py-1 text-xs font-medium text-slate-500">
                  0 actions today
                </span>
              </div>
              <p className="min-h-[3.5rem] text-sm leading-7 text-slate-400">Calls dispatched by AI today.</p>
            </div>
          </div>
          <div className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,249,245,0.98))] p-6 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Outreach</p>
                <p className="min-h-[3.5rem] text-sm font-medium leading-7 text-slate-500">WhatsApp</p>
              </div>
              <div className="rounded-2xl bg-[#eef3fb] p-3 text-[#5e7199]">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <p className="min-h-[3.25rem] text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-900">0</p>
              <div className="min-h-[2rem]">
                <span className="inline-flex min-h-8 items-center rounded-full bg-[#eef3fb] px-2.5 py-1 text-xs font-medium text-slate-500">
                  0 actions today
                </span>
              </div>
              <p className="min-h-[3.5rem] text-sm leading-7 text-slate-400">Messages sent on WhatsApp today.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-8 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <div>
          <SalesFunnelChart leads={leads || []} isLoading={isLoading} />
        </div>
        <div className="h-full">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
