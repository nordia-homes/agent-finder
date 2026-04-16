'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Activity } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export function RecentActivity() {
  const firestore = useFirestore();
  const { user } = useUser();

  const activitiesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'activities'), orderBy('timestamp', 'desc'), limit(5));
  }, [firestore, user]);

  const { data: recentActivities, loading } = useCollection<Activity>(activitiesQuery);

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Recent Activity</CardTitle>
                <CardDescription>A feed of the latest actions in the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="grid gap-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Activity</CardTitle>
        <CardDescription>A feed of the latest actions in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activity.user_avatar || ''} alt={activity.user_name} />
                  <AvatarFallback>{activity.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_id === user?.uid ? 'You' : activity.user_name}</span>{' '}
                    {activity.event_type === 'note_added' ? 'added a note to' : 
                     activity.event_type === 'status_changed' ? 'updated' : 
                     activity.event_type === 'task_created' ? 'created a task for' :
                     'interacted with'} <span className="font-medium">{activity.lead_name}</span>.
                  </p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
             <p className="text-center text-muted-foreground py-8">No recent activity yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
