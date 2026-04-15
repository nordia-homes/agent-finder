'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const data = [
  { name: 'Contacted to Replied', value: 18.7 },
  { name: 'Replied to Demo', value: 35.2 },
];

const chartConfig = {
  value: {
    label: 'Rate',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function ConversionRateChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Conversion Rates</CardTitle>
        <CardDescription>Key funnel conversion metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[200px]">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={130}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="var(--color-value)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
