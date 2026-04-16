'use client';

import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { value: 1254, name: 'Total Leads', fill: 'hsl(var(--chart-1))' },
  { value: 512, name: 'Contacted', fill: 'hsl(var(--chart-2))' },
  { value: 180, name: 'Replied', fill: 'hsl(var(--chart-3))' },
  { value: 42, name: 'Demo Booked', fill: 'hsl(var(--chart-4))' },
  { value: 15, name: 'Won', fill: 'hsl(var(--chart-5))' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    // This is a bit of a hack to get the previous data point from the processed data
    const prevDataValue = data.payload.prevValue;
    let conversionRate = null;
    if (prevDataValue) {
      conversionRate = ((data.value / prevDataValue) * 100).toFixed(1);
    }

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.name}
            </span>
            <span className="font-bold text-foreground">
              {data.value}
            </span>
          </div>
          {conversionRate && (
            <div className="flex flex-col text-right">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Conversion
              </span>
              <span className="font-bold text-accent-foreground" style={{color: 'hsl(var(--primary))'}}>
                {conversionRate}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};


export function SalesFunnelChart() {
    // Add previous data point to each item for conversion calculation in the tooltip
    const processedData = data.map((item, index) => ({
        ...item,
        prevValue: index > 0 ? data[index - 1].value : null,
    }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Sales Funnel</CardTitle>
        <CardDescription>From initial lead to closed deal.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip content={<CustomTooltip />} />
            <Funnel dataKey="value" data={processedData} isAnimationActive>
              <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
