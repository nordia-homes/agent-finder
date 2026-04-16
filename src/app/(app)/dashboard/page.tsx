import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarChart, CheckCircle, FilePlus, Hand, Users, Phone, MessageSquare } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TasksOverview } from '@/components/dashboard/tasks-overview';
import { SalesFunnelChart } from '@/components/dashboard/sales-funnel-chart';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          title="Total Leads"
          value="1,254"
          change="+20.1% from last month"
          changeType="positive"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="New Leads Today"
          value="12"
          change="+5 since yesterday"
          changeType="positive"
          icon={<FilePlus className="h-5 w-5" />}
        />
        <KpiCard
          title="Likely Independent"
          value="789"
          change="63% of total"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Contacted"
          value="512"
          change="41% of total"
          icon={<Hand className="h-5 w-5" />}
        />
        <KpiCard
          title="Demos Booked"
          value="42"
          change="+5 this week"
          changeType="positive"
          icon={<BarChart className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesFunnelChart />
        </div>
        <div className="lg:col-span-2 space-y-8">
           <div className="space-y-4">
            <KpiCard
              title="AI Calls Today"
              value="7"
              icon={<Phone className="h-5 w-5" />}
            />
            <KpiCard
              title="WhatsApp Today"
              value="23"
              icon={<MessageSquare className="h-5 w-5" />}
            />
          </div>
          <TasksOverview />
        </div>
      </div>

      <RecentActivity />
    </div>
  );
}
