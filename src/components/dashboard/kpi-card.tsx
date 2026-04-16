import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
  className?: string;
  description?: string;
};

export function KpiCard({ title, value, change, changeType, icon, className, description }: KpiCardProps) {
  return (
    <Card className={cn(
      "border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-primary/10 hover:shadow-lg", 
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-headline">{value}</div>
        {change && (
          <p
            className={cn(
              'text-xs text-muted-foreground',
              changeType === 'positive' && 'text-green-500',
              changeType === 'negative' && 'text-red-500'
            )}
          >
            {change}
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
