import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  eyebrow?: string;
  title: string;
  value: string;
  meta?: string;
  metaType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  className?: string;
  description?: string;
  valueClassName?: string;
  inverted?: boolean;
};

export function KpiCard({
  eyebrow,
  title,
  value,
  meta,
  metaType = 'neutral',
  icon,
  className,
  description,
  valueClassName,
  inverted,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[28px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_rgba(37,55,88,0.12)]',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          {eyebrow ? (
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500', inverted && 'text-white/62')}>
              {eyebrow}
            </p>
          ) : null}
          <CardTitle className={cn('min-h-[3.5rem] text-sm font-medium leading-7 text-slate-500', inverted && 'text-white/76')}>
            {title}
          </CardTitle>
        </div>
        <div
          className={cn(
            'rounded-2xl border border-[#dce4f0] bg-[#eef3fb] p-2.5 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]',
            inverted && 'border-white/14 bg-white/12 text-white shadow-none'
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={cn(
            'min-h-[3.25rem] text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-900',
            inverted && 'text-white',
            valueClassName
          )}
        >
          {value}
        </div>
        <div className="min-h-[2rem]">
          <span
            className={cn(
              'inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-xs font-medium',
              metaType === 'positive' && 'bg-emerald-50 text-emerald-700',
              metaType === 'negative' && 'bg-rose-50 text-rose-700',
              metaType === 'neutral' && 'bg-[#eef3fb] text-slate-500',
              inverted && metaType === 'neutral' && 'bg-white/12 text-white/80'
            )}
          >
            {meta ?? '\u00A0'}
          </span>
        </div>
        <p className={cn('min-h-[3.5rem] text-sm leading-7 text-slate-400', inverted && 'text-white/70')}>
          {description ?? '\u00A0'}
        </p>
      </CardContent>
    </Card>
  );
}
