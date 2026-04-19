import type { Task } from '@/lib/types';

export const taskTypes = ['call', 'follow_up', 'demo', 'review', 'reply_check'] as const satisfies readonly Task['type'][];

export const TASK_TYPE_META: Record<Task['type'], { label: string; badgeClassName: string }> = {
  call: {
    label: 'Call',
    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  follow_up: {
    label: 'Follow up',
    badgeClassName: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  demo: {
    label: 'Demo',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  review: {
    label: 'Review',
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  reply_check: {
    label: 'Reply check',
    badgeClassName: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};
