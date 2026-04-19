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
        <Card className="flex h-full min-h-[620px] flex-col rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Live feed</p>
                <CardTitle className="font-headline text-slate-900">Recent Activity</CardTitle>
                <CardDescription className="text-slate-500">A feed of the latest actions in the system.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 overflow-hidden">
                <div className="h-full space-y-6 overflow-y-auto pr-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="grid gap-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-[620px] flex-col rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
      <CardHeader>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Live feed</p>
        <CardTitle className="font-headline text-slate-900">Recent Activity</CardTitle>
        <CardDescription className="text-slate-500">A feed of the latest actions in the system.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full space-y-6 overflow-y-auto pr-2">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 rounded-[24px] border border-[#e1e6f0] bg-white/90 px-4 py-4 shadow-[0_10px_24px_rgba(37,55,88,0.04)]">
                <Avatar className="h-10 w-10 border border-[#dbe2ee]">
                  <AvatarImage src={activity.user_avatar || ''} alt={activity.user_name} />
                  <AvatarFallback className="bg-[#eef3fb] text-slate-500">{activity.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1.5">
                  <p className="text-sm leading-6 text-slate-900">
                    <span className="font-medium">{activity.user_id === user?.uid ? 'You' : activity.user_name}</span>{' '}
                    {activity.event_type === 'note_added' ? 'added a note to' : 
                     activity.event_type === 'status_changed' ? 'updated' : 
                     activity.event_type === 'task_created' ? 'created a task for' :
                     'interacted with'} <span className="font-medium">{activity.lead_name}</span>.
                  </p>
                  <p className="text-sm text-slate-500">{activity.description}</p>
                  <p className="text-xs font-medium text-slate-400">
                    {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
             <div className="rounded-[24px] border border-dashed border-[#d7deeb] bg-[#fbfcfe] px-6 py-10 text-center text-slate-400">
               No recent activity yet.
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
