'use client';

import { useMemo, useState } from 'react';
import { format, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { collection } from 'firebase/firestore';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CalendarRange,
  CheckCheck,
  Clock3,
  MessageSquare,
  Phone,
  Target,
  Users,
} from 'lucide-react';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { useAICallDashboard } from '@/hooks/use-ai-call-dashboard';
import { useWhatsAppDashboard } from '@/hooks/use-whatsapp-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Activity as CRMActivity, Lead, Task } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';

const PIE_COLORS = ['#445b84', '#6984ad', '#8fa7c8', '#bfd0e6', '#e1e9f5'];
const PERIOD_OPTIONS = [
  { value: '7d', label: '7d', days: 7 },
  { value: '30d', label: '30d', days: 30 },
  { value: '90d', label: '90d', days: 90 },
] as const;

type PeriodFilter = (typeof PERIOD_OPTIONS)[number]['value'];
type WhatsAppDashboardPayload = {
  campaigns?: Array<{
    replyCount?: number;
    deliveredCount?: number;
  }>;
};

type AICallDashboardPayload = {
  campaigns?: Array<{
    interestedCount?: number;
    answeredCount?: number;
  }>;
};

function getSafeDate(value: { toDate: () => Date } | null | undefined) {
  if (!value || typeof value.toDate !== 'function') return null;

  try {
    return value.toDate();
  } catch {
    return null;
  }
}

const PremiumTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[20px] border border-[#dbe2ee] bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(37,55,88,0.12)] backdrop-blur-sm">
      {label ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p> : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">{entry.name}</span>
            <span className="font-semibold text-slate-900">{entry.value?.toLocaleString?.() ?? entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const tasksQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'tasks');
  }, [firestore, user]);

  const activitiesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'activities');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: tasks, loading: tasksLoading } = useCollection<Task>(tasksQuery);
  const { data: activities, loading: activitiesLoading } = useCollection<CRMActivity>(activitiesQuery);
  const { data: whatsappDashboard, loading: whatsappLoading } = useWhatsAppDashboard<WhatsAppDashboardPayload>();
  const { data: aiCallDashboard, loading: aiCallLoading } = useAICallDashboard<AICallDashboardPayload>();

  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const selectedPeriod = PERIOD_OPTIONS.find((option) => option.value === period) ?? PERIOD_OPTIONS[1];
    const periodStart = startOfDay(subDays(now, selectedPeriod.days - 1));
    const activeLeads = (leads || []).filter((lead) => !lead.archived_at && normalizeLeadStatus(lead.lead_status) !== 'merged');
    const ownedTasks = (tasks || []).filter((task) => !user || task.owner_id === user.uid);
    const relevantActivities = (activities || []).filter((activity) => !user || activity.user_id === user.uid);
    const ownedWhatsAppCampaigns = whatsappDashboard?.campaigns || [];
    const ownedAiCallCampaigns = aiCallDashboard?.campaigns || [];

    const pipelineCounts = {
      new: 0,
      contacted: 0,
      demo_sent: 0,
      trial_started: 0,
      won: 0,
    };

    const sourceCounts = new Map<string, number>();
    const timelineSeries = Array.from({ length: selectedPeriod.days }).map((_, index) => {
      const date = startOfDay(subDays(now, selectedPeriod.days - 1 - index));
      return {
        label: selectedPeriod.days <= 7 ? format(date, 'EEE') : format(date, 'MMM d'),
        date,
        leads: 0,
        tasksCompleted: 0,
        activities: 0,
      };
    });

    activeLeads.forEach((lead) => {
      const status = normalizeLeadStatus(lead.lead_status);

      if (status === 'new') pipelineCounts.new++;
      if (['contacted', 'demo_sent', 'trial_waiting', 'trial_started', 'won'].includes(status)) pipelineCounts.contacted++;
      if (['demo_sent', 'trial_waiting', 'trial_started', 'won'].includes(status)) pipelineCounts.demo_sent++;
      if (['trial_started', 'won'].includes(status)) pipelineCounts.trial_started++;
      if (status === 'won') pipelineCounts.won++;

      const sourceKey = (lead.source || 'unknown').trim() || 'unknown';
      sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) || 0) + 1);

      const createdAt = getSafeDate(lead.created_at);
      if (createdAt && isWithinInterval(createdAt, { start: periodStart, end: now })) {
        timelineSeries.forEach((point) => {
          if (format(createdAt, 'yyyy-MM-dd') === format(point.date, 'yyyy-MM-dd')) {
            point.leads++;
          }
        });
      }
    });

    ownedTasks.forEach((task) => {
      const completedAt = getSafeDate(task.completed_at);
      if (task.completed && completedAt && isWithinInterval(completedAt, { start: periodStart, end: now })) {
        timelineSeries.forEach((point) => {
          if (format(completedAt, 'yyyy-MM-dd') === format(point.date, 'yyyy-MM-dd')) {
            point.tasksCompleted++;
          }
        });
      }
    });

    relevantActivities.forEach((activity) => {
      const timestamp = getSafeDate(activity.timestamp);
      if (timestamp && isWithinInterval(timestamp, { start: periodStart, end: now })) {
        timelineSeries.forEach((point) => {
          if (format(timestamp, 'yyyy-MM-dd') === format(point.date, 'yyyy-MM-dd')) {
            point.activities++;
          }
        });
      }
    });

    const sourceMix = Array.from(sourceCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const taskHealth = {
      open: ownedTasks.filter((task) => !task.completed).length,
      completed: ownedTasks.filter((task) => task.completed).length,
      overdue: ownedTasks.filter((task) => !task.completed && getSafeDate(task.due_date) && startOfDay(getSafeDate(task.due_date) as Date) < today).length,
      dueToday: ownedTasks.filter((task) => {
        const dueDate = getSafeDate(task.due_date);
        return !task.completed && dueDate && format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      }).length,
    };

    const taskTypeMix = [
      { name: 'Call', value: ownedTasks.filter((task) => task.type === 'call').length },
      { name: 'Follow up', value: ownedTasks.filter((task) => task.type === 'follow_up').length },
      { name: 'Demo', value: ownedTasks.filter((task) => task.type === 'demo').length },
      { name: 'Review', value: ownedTasks.filter((task) => task.type === 'review').length },
      { name: 'Reply check', value: ownedTasks.filter((task) => task.type === 'reply_check').length },
    ];

    const recentPeriodLeadCount = activeLeads.filter((lead) => {
      const createdAt = getSafeDate(lead.created_at);
      return createdAt && isWithinInterval(createdAt, { start: periodStart, end: now });
    }).length;

    const recentPeriodWonCount = activeLeads.filter((lead) => {
      const createdAt = getSafeDate(lead.created_at);
      return createdAt && isWithinInterval(createdAt, { start: periodStart, end: now }) && normalizeLeadStatus(lead.lead_status) === 'won';
    }).length;

    const recentPeriodDemoSentCount = activeLeads.filter((lead) => {
      const demoSentAt = getSafeDate(lead.demo_sent_at);
      return demoSentAt && isWithinInterval(demoSentAt, { start: periodStart, end: now });
    }).length;

    const recentPeriodCompletionRate = recentPeriodLeadCount > 0 ? Math.round((recentPeriodWonCount / recentPeriodLeadCount) * 100) : 0;
    const averageLeadScore =
      activeLeads.length > 0
        ? Math.round(activeLeads.reduce((sum, lead) => sum + (lead.independent_score || 0), 0) / activeLeads.length)
        : 0;

    const outreachSnapshot = [
      {
        label: 'WhatsApp campaigns',
        total: ownedWhatsAppCampaigns.length,
        success: ownedWhatsAppCampaigns.reduce((sum, campaign) => sum + (campaign.replyCount || 0), 0),
        secondary: ownedWhatsAppCampaigns.reduce((sum, campaign) => sum + (campaign.deliveredCount || 0), 0),
        icon: MessageSquare,
      },
      {
        label: 'AI call campaigns',
        total: ownedAiCallCampaigns.length,
        success: ownedAiCallCampaigns.reduce((sum, campaign) => sum + (campaign.interestedCount || 0), 0),
        secondary: ownedAiCallCampaigns.reduce((sum, campaign) => sum + (campaign.answeredCount || 0), 0),
        icon: Phone,
      },
    ];

    return {
      totalLeads: activeLeads.length,
      wonLeads: pipelineCounts.won,
      averageLeadScore,
      recentPeriodDemoSentCount,
      recentPeriodCompletionRate,
      pipelineData: [
        { stage: 'New', value: pipelineCounts.new },
        { stage: 'Contacted', value: pipelineCounts.contacted },
        { stage: 'Demo sent', value: pipelineCounts.demo_sent },
        { stage: 'Trial started', value: pipelineCounts.trial_started },
        { stage: 'Won', value: pipelineCounts.won },
      ],
      sourceMix,
      timelineSeries,
      taskHealth,
      taskTypeMix,
      outreachSnapshot,
      periodLabel: selectedPeriod.label,
      campaignVolume: {
        whatsapp: ownedWhatsAppCampaigns.length,
        aiCalls: ownedAiCallCampaigns.length,
      },
    };
  }, [activities, aiCallDashboard, leads, period, tasks, user, whatsappDashboard]);

  const isLoading = userLoading || leadsLoading || tasksLoading || activitiesLoading || whatsappLoading || aiCallLoading;

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(242,247,253,0.98)_58%,_rgba(248,251,255,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
              <BarChart3 className="h-3.5 w-3.5" />
              Revenue intelligence
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Analytics</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                Read the health of the pipeline, execution rhythm, and outreach performance from one premium command surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  className={
                    option.value === period
                      ? 'rounded-full border-[#152033] bg-[#152033] px-4 text-white hover:bg-[#152033] hover:text-white'
                      : 'rounded-full border-[#d6e0ed] bg-white/90 px-4 text-[#526684]'
                  }
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              eyebrow="Coverage"
              title="Active leads"
              value={isLoading ? '...' : String(analytics.totalLeads)}
              icon={<Users className="h-5 w-5" />}
              meta={!isLoading ? `${analytics.totalLeads} in pipeline` : ' '}
              description="All active lead records currently tracked in the commercial funnel."
            />
            <KpiCard
              eyebrow="Conversion"
              title="Won leads"
              value={isLoading ? '...' : String(analytics.wonLeads)}
              icon={<BadgeCheck className="h-5 w-5" />}
              meta={!isLoading ? `${analytics.recentPeriodCompletionRate}% recent win rate` : ' '}
              metaType="positive"
              description="Leads that fully converted into won accounts."
            />
            <KpiCard
              eyebrow="Quality"
              title="Average score"
              value={isLoading ? '...' : String(analytics.averageLeadScore)}
              icon={<Target className="h-5 w-5" />}
              meta={!isLoading ? `Across ${analytics.totalLeads} active leads` : ' '}
              description="Average independent lead score across the live pipeline."
            />
            <KpiCard
              eyebrow={`Last ${analytics.periodLabel}`}
              title="Demo sent"
              value={isLoading ? '...' : String(analytics.recentPeriodDemoSentCount)}
              icon={<CalendarRange className="h-5 w-5" />}
              meta={!isLoading ? `${analytics.campaignVolume.whatsapp + analytics.campaignVolume.aiCalls} campaign records` : ' '}
              description={`Leads that had a demo sent in the last ${analytics.periodLabel}.`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pipeline flow</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-900">Stage progression</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              How the current lead base compresses through each major commercial stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] rounded-[24px] border border-[#e2e8f1] bg-[radial-gradient(circle_at_top,_rgba(137,161,194,0.16),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.7),_rgba(248,251,255,0.9))] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.pipelineData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 5" stroke="rgba(133,149,177,0.20)" vertical={false} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: '#71809c', fontSize: 12, fontWeight: 500 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#97a4bc', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(83,106,145,0.06)' }} />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]} fill="#4d6692" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Lead mix</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-900">Source distribution</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              Where the strongest intake volume is currently coming from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] rounded-[24px] border border-[#e2e8f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(247,250,255,0.92))] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.sourceMix.length > 0 ? analytics.sourceMix : [{ name: 'No data', value: 1 }]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                    {(analytics.sourceMix.length > 0 ? analytics.sourceMix : [{ name: 'No data', value: 1 }]).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PremiumTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-3">
              {analytics.sourceMix.length > 0 ? (
                analytics.sourceMix.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[18px] border border-[#dce3ef] bg-white/90 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#d8deea] bg-white/70 px-4 py-3 text-sm text-[#7c89a1]">
                  No lead source data yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Execution tempo</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-900">Last {analytics.periodLabel}</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              Daily movement across lead creation, task completion, and CRM activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] rounded-[24px] border border-[#e2e8f1] bg-[radial-gradient(circle_at_top,_rgba(137,161,194,0.16),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.7),_rgba(248,251,255,0.9))] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timelineSeries} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5c79a4" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#5c79a4" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#89a6c8" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#89a6c8" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="rgba(133,149,177,0.20)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={period === '90d' ? 24 : 12}
                    tick={{ fill: '#71809c', fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#97a4bc', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<PremiumTooltip />} />
                  <Area type="monotone" dataKey="leads" name="New leads" stroke="#4d6692" fill="url(#leadsFill)" strokeWidth={3} />
                  <Area type="monotone" dataKey="tasksCompleted" name="Tasks completed" stroke="#79a989" fill="transparent" strokeWidth={3} />
                  <Area type="monotone" dataKey="activities" name="Activities" stroke="#8ea9ca" fill="url(#activityFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Task operations</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-900">Task health</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              See if execution is flowing or if the queue is starting to clog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Open tasks', value: analytics.taskHealth.open, icon: Clock3, color: '#4d6692' },
              { label: 'Completed', value: analytics.taskHealth.completed, icon: CheckCheck, color: '#79a989' },
              { label: 'Overdue', value: analytics.taskHealth.overdue, icon: Activity, color: '#d67a7a' },
              { label: 'Due today', value: analytics.taskHealth.dueToday, icon: CalendarRange, color: '#d5a24f' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[22px] border border-[#dce3ef] bg-white/90 px-4 py-4 shadow-[0_10px_24px_rgba(37,55,88,0.05)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl p-2.5 text-white" style={{ backgroundColor: item.color }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{item.label}</p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{item.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Task mix</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-slate-900">Workload by task type</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              Understand which execution motions dominate the current operating rhythm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] rounded-[24px] border border-[#e2e8f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(247,250,255,0.92))] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.taskTypeMix} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 5" stroke="rgba(133,149,177,0.20)" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#97a4bc', fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: '#71809c', fontSize: 12, fontWeight: 500 }} width={92} />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(83,106,145,0.06)' }} />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#6984ad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(67,87,129,0.98),_rgba(28,40,68,0.98))] text-white shadow-[0_24px_60px_rgba(33,51,84,0.16)]">
          <CardHeader className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Outreach channels</p>
            <CardTitle className="text-2xl tracking-[-0.03em] text-white">Campaign snapshot</CardTitle>
            <CardDescription className="text-sm leading-6 text-white/70">
              A fast read on current WhatsApp and AI call deployment volume.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.outreachSnapshot.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.label} className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/82">{channel.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{channel.total}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-2.5 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-white/72">
                    <div className="flex items-center justify-between">
                      <span>Primary success</span>
                      <span className="font-semibold text-white">{channel.success}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Secondary volume</span>
                      <span className="font-semibold text-white">{channel.secondary}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
