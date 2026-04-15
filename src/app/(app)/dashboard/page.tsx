import { PageHeader } from '@/components/shared/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarChart, CheckCircle, FilePlus, Hand, Users, Workflow } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TasksOverview } from '@/components/dashboard/tasks-overview';
import { ConversionRateChart } from '@/components/dashboard/conversion-rate-chart';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Welcome back, here's a summary of your activities." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-8">
        <KpiCard
          title="Total Approved Leads"
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
          description="Leads with score > 70"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Contacted Leads"
          value="512"
          change="32 in last 7 days"
          icon={<Hand className="h-5 w-5" />}
        />
        <KpiCard
          title="Booked Demos"
          value="42"
          change="+5 this week"
          changeType="positive"
          icon={<BarChart className="h-5 w-5" />}
          className="lg:col-start-4 xl:col-start-5"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <ConversionRateChart />
        </div>
        <div className="space-y-8">
          <TasksOverview />
        </div>
      </div>
       <div className="mt-8">
          <RecentActivity />
        </div>
    </>
  );
}
