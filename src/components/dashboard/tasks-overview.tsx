'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export function TasksOverview() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const tasksQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'tasks'), where('owner_id', '==', user.uid), where('completed', '==', false));
  }, [firestore, user]);

  const { data: tasks, loading } = useCollection<Task>(tasksQuery);

  const handleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    if (!firestore) return;
    const taskRef = doc(firestore, 'tasks', taskId);
    try {
      await updateDoc(taskRef, { completed: !currentStatus, completed_at: Timestamp.now() });
      const task = tasks?.find(t => t.id === taskId);
      if (task && !currentStatus) {
          toast({
              title: "Task Completed!",
              description: `${task.lead_name} task marked as done.`,
          });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Could not update task.",
        variant: "destructive"
      })
    }
  };

  const dueToday = tasks?.filter(t => new Date(t.due_date.toDate()) <= new Date() && !t.is_overdue).length || 0;
  const overdue = tasks?.filter(t => t.is_overdue).length || 0;

  if (loading) {
    return (
        <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Execution</p>
                    <CardTitle className="mt-2 font-headline text-slate-900">My Tasks</CardTitle>
                    <CardDescription><Skeleton className="mt-2 h-4 w-24" /></CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm" className="rounded-full border-[#d9dfeb] bg-white/80">
                    <Link href="/tasks">View all</Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-5 w-5" />
                        <div className="flex-1 space-y-2">
                             <Skeleton className="h-4 w-3/4" />
                             <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Execution</p>
          <CardTitle className="mt-2 font-headline text-slate-900">My Tasks</CardTitle>
          <CardDescription className="mt-1 text-slate-500">{dueToday} due today, {overdue} overdue.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full border-[#d9dfeb] bg-white/80 text-slate-600 hover:bg-[#f6f8fc]">
          <Link href="/tasks">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-4 rounded-[22px] border border-[#e1e6f0] bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(37,55,88,0.04)]">
                  <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleTaskComplete(task.id, task.completed)} />
                  <div className="flex-1">
                      <p className={cn("text-sm font-medium text-slate-900", task.completed && "line-through text-slate-400")}>{task.lead_name}</p>
                      <p className={cn("text-sm capitalize text-slate-500", task.completed && "line-through")}>{task.type.replace('_', ' ')}</p>
                  </div>
                {task.is_overdue && !task.completed && <div className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Overdue</div>}
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d7deeb] bg-[#fbfcfe] px-6 py-10 text-center text-slate-400">
              No pending tasks. Great job!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
