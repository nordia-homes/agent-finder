import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
  className?: string;
};

export function KpiCard({ title, value, change, changeType, icon, className }: KpiCardProps) {
  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{value}</div>
        {change && (
          <p
            className={cn(
              'text-xs text-muted-foreground',
              changeType === 'positive' && 'text-green-600',
              changeType === 'negative' && 'text-red-600'
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
