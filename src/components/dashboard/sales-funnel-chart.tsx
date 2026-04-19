'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import type { Lead } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';
import { BadgeCheck, Rocket, Send, Users } from 'lucide-react';

interface SalesFunnelChartProps {
    leads: Lead[];
    isLoading: boolean;
}

const PremiumTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;

  return (
    <div className="rounded-[20px] border border-[#dbe2ee] bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(37,55,88,0.12)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{payload[0].value}</p>
      <p className="mt-1 text-xs text-slate-400">{point?.totalRate ?? 0}% of total pipeline</p>
    </div>
  );
};

export function SalesFunnelChart({ leads, isLoading }: SalesFunnelChartProps) {
  const { conversionRate, stageHighlights, stages } = useMemo(() => {
    const statusCounts = {
      total: leads.length,
      contacted: 0,
      demo_sent: 0,
      trial_started: 0,
      won: 0,
    };

    leads.forEach(lead => {
        const status = normalizeLeadStatus(lead.lead_status);
        if (['contacted', 'demo_sent', 'trial_waiting', 'trial_started', 'won'].includes(status)) {
            statusCounts.contacted++;
        }
        if (['demo_sent', 'trial_waiting', 'trial_started', 'won'].includes(status)) {
            statusCounts.demo_sent++;
        }
        if (['trial_started', 'won'].includes(status)) {
            statusCounts.trial_started++;
        }
        if (status === 'won') {
            statusCounts.won++;
        }
    });

    const stageHighlights = [
      { label: 'Lead volume', value: statusCounts.total, icon: Users },
      { label: 'Contacted', value: statusCounts.contacted, icon: Rocket },
      { label: 'Demo sent', value: statusCounts.demo_sent, icon: Send },
      { label: 'Won', value: statusCounts.won, icon: BadgeCheck },
    ];

    const stageSequence = [
      { name: 'Total Leads', value: statusCounts.total },
      { name: 'Contacted', value: statusCounts.contacted },
      { name: 'Demo Sent', value: statusCounts.demo_sent },
      { name: 'Trial Started', value: statusCounts.trial_started },
      { name: 'Won', value: statusCounts.won },
    ];

    const stages = stageSequence.map((stage, index) => {
      const previousValue = index === 0 ? stage.value : stageSequence[index - 1].value;
      const relativeRate = previousValue > 0 ? Math.round((stage.value / previousValue) * 100) : 0;
      const totalRate = statusCounts.total > 0 ? Math.round((stage.value / statusCounts.total) * 100) : 0;

      return {
        ...stage,
        relativeRate: index === 0 ? 100 : relativeRate,
        totalRate,
      };
    });

    return {
      conversionRate: statusCounts.total > 0 ? Math.round((statusCounts.won / statusCounts.total) * 100) : 0,
      stageHighlights,
      stages,
    };
  }, [leads]);
  
  if (isLoading) {
    return (
      <Card className="h-full rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
        <CardHeader className="space-y-3">
          <CardTitle className="font-headline text-slate-900">Pipeline Performance</CardTitle>
          <CardDescription className="text-slate-500">From new lead to signed client.</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] pt-2">
            <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
      <CardHeader className="space-y-5 pb-2">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Sales intelligence</p>
            <CardTitle className="font-headline text-2xl tracking-[-0.03em] text-slate-900">Pipeline Performance</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-slate-500">
              A premium overview of conversion flow from fresh lead to won account, with the strongest movement stages surfaced up front.
            </CardDescription>
          </div>
          <div className="rounded-[24px] border border-[#dde4ef] bg-[#f5f8fc] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Lead to win</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-[-0.05em] text-slate-900">{conversionRate}%</span>
              <span className="pb-1 text-sm text-slate-400">conversion</span>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stageHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-[22px] border border-[#dce3ef] bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(37,55,88,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-[#eef3fb] p-2.5 text-[#60739a]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="rounded-[28px] border border-[#dfe5f0] bg-[linear-gradient(180deg,_rgba(251,253,255,0.96),_rgba(242,247,252,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="rounded-full border border-[#dde4ef] bg-white/90 px-3 py-2 text-xs shadow-[0_8px_20px_rgba(37,55,88,0.04)]"
              >
                <span className="font-semibold text-slate-900">{stage.value}</span>
                <span className="ml-2 text-slate-500">{stage.name}</span>
              </div>
            ))}
          </div>
          <div className="h-[360px] rounded-[24px] border border-[#e2e8f1] bg-[radial-gradient(circle_at_top,_rgba(137,161,194,0.16),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.7),_rgba(248,251,255,0.9))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stages} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="pipelineArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4d6692" stopOpacity={0.34} />
                    <stop offset="55%" stopColor="#91a9c9" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#dbe5f2" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="pipelineStroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#364e78" />
                    <stop offset="100%" stopColor="#8ea9ca" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="rgba(133,149,177,0.20)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71809c', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#97a4bc', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip content={<PremiumTooltip />} cursor={{ stroke: 'rgba(83,106,145,0.18)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="url(#pipelineStroke)"
                  strokeWidth={4}
                  fill="url(#pipelineArea)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 4, fill: '#4b638e' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#pipelineStroke)"
                  strokeWidth={2}
                  dot={{ r: 5, stroke: '#ffffff', strokeWidth: 3, fill: '#6984ad' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
