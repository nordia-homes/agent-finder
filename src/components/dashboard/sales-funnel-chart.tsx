'use client';

import { useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import type { Lead } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1">
          <span className="text-[0.85rem] font-semibold text-foreground">
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            Count: <span className="font-bold">{payload[0].value}</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

interface SalesFunnelChartProps {
    leads: Lead[];
    isLoading: boolean;
}

export function SalesFunnelChart({ leads, isLoading }: SalesFunnelChartProps) {
  const data = useMemo(() => {
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

    return [
      { name: 'Total Leads', value: statusCounts.total, fill: 'hsl(var(--chart-1))' },
      { name: 'Contacted', value: statusCounts.contacted, fill: 'hsl(var(--chart-2))' },
      { name: 'Demo Sent', value: statusCounts.demo_sent, fill: 'hsl(var(--chart-3))' },
      { name: 'Trial Started', value: statusCounts.trial_started, fill: 'hsl(var(--chart-4))' },
      { name: 'Won', value: statusCounts.won, fill: 'hsl(var(--chart-5))' },
    ];
  }, [leads]);
  
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-headline">Sales Pipeline</CardTitle>
          <CardDescription>From initial lead to closed deal.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
            <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Sales Pipeline</CardTitle>
        <CardDescription>From initial lead to closed deal.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    <LabelList 
                        dataKey="name" 
                        position="insideLeft" 
                        offset={8}
                        className="fill-background font-medium"
                        />
                    <LabelList 
                        dataKey="value" 
                        position="right" 
                        offset={8}
                        className="fill-foreground font-semibold"
                        />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
