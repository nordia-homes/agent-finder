'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { name: 'Total Leads', value: 1254, fill: 'hsl(var(--chart-1))' },
  { name: 'Contacted', value: 512, fill: 'hsl(var(--chart-2))' },
  { name: 'Replied', value: 180, fill: 'hsl(var(--chart-3))' },
  { name: 'Demo Booked', value: 42, fill: 'hsl(var(--chart-4))' },
  { name: 'Won', value: 15, fill: 'hsl(var(--chart-5))' },
];

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


export function SalesFunnelChart() {
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
