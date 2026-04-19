'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MessageSquare, FileText, CheckSquare, History } from 'lucide-react';
import type { Activity } from '@/lib/types';

const eventIcons: Record<Activity['event_type'], React.ElementType> = {
    'email_sent': Mail,
    'note_added': FileText,
    'status_changed': History,
    'task_created': CheckSquare,
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] shadow-[0_18px_36px_rgba(33,51,84,0.08)]">
      <CardHeader className="border-b border-[#e5ebf4]">
        <CardTitle className="font-headline text-[#172033]">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-6">
            {activities.map((activity) => {
               const Icon = eventIcons[activity.event_type] || MessageSquare;
               return (
                <div key={activity.id} className="relative rounded-[22px] border border-[#d8deea] bg-white/80 p-4 pl-10 shadow-sm">
                  <div className="absolute left-5 top-5 h-[calc(100%-2rem)] border-l border-[#d8deea]"></div>
                  <div className="absolute left-0 top-1.5 transform">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d8deea] bg-[#eef3fb]">
                      <Icon className="h-4 w-4 text-[#61739a]" />
                    </span>
                  </div>
                  <div className="pl-4">
                    <p className="text-sm text-[#172033]">
                      <span className="font-medium">{activity.user_name}</span>{' '}
                      {activity.event_type === 'note_added' ? 'added a note' : 
                       activity.event_type === 'status_changed' ? `changed status` : 
                       activity.event_type === 'task_created' ? 'created a task' :
                       activity.event_type === 'email_sent' ? 'sent an email' :
                       'performed an action'}.
                    </p>
                    <p className="mt-1 text-sm text-[#54647f]">{activity.description}</p>
                    <p className="mt-2 text-xs text-[#7c89a1]">
                      {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
               );
            })}
          </div>
        ) : (
            <p className="py-8 text-center text-sm text-[#7c89a1]">No activity recorded for this lead yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
