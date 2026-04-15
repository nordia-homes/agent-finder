import { recentActivities } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MessageSquare } from 'lucide-react';

export function ActivityTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="relative pl-8">
              <div className="absolute left-3 top-1.5 h-full border-l"></div>
              <div className="absolute left-0 top-1.5 transform">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  {activity.channel === 'email' ? <Mail className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                </span>
              </div>
              <div className="pl-4">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.user.name} &bull; {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
