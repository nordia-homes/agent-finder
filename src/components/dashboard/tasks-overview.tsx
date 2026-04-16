'use client';
import { tasks as initialTasks } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function TasksOverview() {
  const [tasks, setTasks] = useState(initialTasks.map(t => ({...t, completed: false})));
  const { toast } = useToast();

  const handleTaskComplete = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? {...t, completed: !t.completed} : t));
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
        toast({
            title: "Task Completed!",
            description: `${task.lead_name} task marked as done.`,
        });
    }
  };

  const dueToday = tasks.filter(t => !t.is_overdue && !t.completed).length;
  const overdue = tasks.filter(t => t.is_overdue && !t.completed).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">My Tasks</CardTitle>
          <CardDescription>{dueToday} due today, {overdue} overdue.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/tasks">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-4">
                <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleTaskComplete(task.id)} />
                <div className="flex-1">
                    <p className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>{task.lead_name}</p>
                    <p className={cn("text-sm text-muted-foreground capitalize", task.completed && "line-through")}>{task.type.replace('_', ' ')}</p>
                </div>
              {task.is_overdue && !task.completed && <div className="text-xs font-semibold text-destructive">Overdue</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
