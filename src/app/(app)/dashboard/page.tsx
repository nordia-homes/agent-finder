'use client';

import { useMemo } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarChart, CheckCircle, FilePlus, Hand, Users, Phone, MessageSquare } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TasksOverview } from '@/components/dashboard/tasks-overview';
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

  const isLoading = userLoading || leadsLoading || newLeadsLoading;

  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          title="Total Leads"
          value={isLoading ? '...' : totalLeads.toString()}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="New Leads Today"
          value={isLoading ? '...' : (newLeadsToday?.length || 0).toString()}
          icon={<FilePlus className="h-5 w-5" />}
        />
        <KpiCard
          title="Likely Independent"
          value={isLoading ? '...' : likelyIndependent.toString()}
          description={totalLeads > 0 ? `${Math.round((likelyIndependent / totalLeads) * 100)}% of total` : ''}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Contacted"
          value={isLoading ? '...' : contacted.toString()}
           description={totalLeads > 0 ? `${Math.round((contacted / totalLeads) * 100)}% of total` : ''}
          icon={<Hand className="h-5 w-5" />}
        />
        <KpiCard
          title="Demo Sent"
          value={isLoading ? '...' : demosBooked.toString()}
          icon={<BarChart className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesFunnelChart leads={leads || []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-2 gap-4">
            <KpiCard
              title="AI Calls Today"
              value="0"
              icon={<Phone className="h-5 w-5" />}
              className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0 [&_.text-muted-foreground]:text-primary-foreground/80 shadow-lg"
            />
            <KpiCard
              title="WhatsApp Today"
              value="0"
              icon={<MessageSquare className="h-5 w-5" />}
              className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0 [&_.text-muted-foreground]:text-primary-foreground/80 shadow-lg"
            />
          </div>
          <TasksOverview />
        </div>
      </div>

      <RecentActivity />
    </div>
  );
}
