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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-6">
            {activities.map((activity) => {
               const Icon = eventIcons[activity.event_type] || MessageSquare;
               return (
                <div key={activity.id} className="relative pl-8">
                  <div className="absolute left-3 top-1.5 h-full border-l"></div>
                  <div className="absolute left-0 top-1.5 transform">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </div>
                  <div className="pl-4">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      {activity.event_type === 'note_added' ? 'added a note' : 
                       activity.event_type === 'status_changed' ? `changed status` : 
                       activity.event_type === 'task_created' ? 'created a task' :
                       activity.event_type === 'email_sent' ? 'sent an email' :
                       'performed an action'}.
                    </p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
               );
            })}
          </div>
        ) : (
            <p className="text-muted-foreground text-sm">No activity recorded for this lead yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
