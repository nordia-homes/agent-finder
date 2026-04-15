import { recentActivities } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Activity</CardTitle>
        <CardDescription>A feed of the latest actions in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  {activity.event_type === 'note_added' ? 'added a note to' : 
                   activity.event_type === 'status_changed' ? 'updated' : 
                   activity.event_type === 'task_created' ? 'created a task for' :
                   'interacted with'} <span className="font-medium">{activity.lead_name}</span>.
                </p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
