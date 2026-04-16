'use client';

import { useMemo } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarChart, CheckCircle, FilePlus, Hand, Users, Phone, MessageSquare } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TasksOverview } from '@/components/dashboard/tasks-overview';
import { SalesFunnelChart } from '@/components/dashboard/sales-funnel-chart';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Lead } from '@/lib/types';

export default function DashboardPage() {
  const firestore = useFirestore();

  const leadsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'leads');
  }, [firestore]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTimestamp = Timestamp.fromDate(today);
  const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

  const newLeadsTodayQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'leads'),
      where('created_at', '>=', todayTimestamp),
      where('created_at', '<', tomorrowTimestamp)
    );
  }, [firestore, todayTimestamp, tomorrowTimestamp]);

  const { data: newLeadsToday } = useCollection(newLeadsTodayQuery);
  
  const totalLeads = useMemo(() => leads?.length || 0, [leads]);
  const likelyIndependent = useMemo(() => leads?.filter(l => l.classification === 'likely_independent').length || 0, [leads]);
  const contacted = useMemo(() => leads?.filter(l => l.lead_status === 'contacted').length || 0, [leads]);
  const demosBooked = useMemo(() => leads?.filter(l => l.lead_status === 'demo_booked').length || 0, [leads]);

  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          title="Total Leads"
          value={leadsLoading ? '...' : totalLeads.toString()}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="New Leads Today"
          value={leadsLoading ? '...' : (newLeadsToday?.length || 0).toString()}
          icon={<FilePlus className="h-5 w-5" />}
        />
        <KpiCard
          title="Likely Independent"
          value={leadsLoading ? '...' : likelyIndependent.toString()}
          description={totalLeads > 0 ? `${Math.round((likelyIndependent / totalLeads) * 100)}% of total` : ''}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Contacted"
          value={leadsLoading ? '...' : contacted.toString()}
           description={totalLeads > 0 ? `${Math.round((contacted / totalLeads) * 100)}% of total` : ''}
          icon={<Hand className="h-5 w-5" />}
        />
        <KpiCard
          title="Demos Booked"
          value={leadsLoading ? '...' : demosBooked.toString()}
          icon={<BarChart className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesFunnelChart leads={leads || []} isLoading={leadsLoading} />
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
