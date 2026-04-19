'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";
import { AddTaskDialog } from "./add-task-dialog";

export function TasksSection({ tasks, leadId, leadName }: { tasks: Task[], leadId: string, leadName: string }) {
  const sortedTasks = [...tasks].sort((a, b) => a.due_date.toDate().getTime() - b.due_date.toDate().getTime());
  const overdueTasks = sortedTasks.filter(t => t.is_overdue && !t.completed);
  const upcomingTasks = sortedTasks.filter(t => !t.is_overdue && !t.completed);

  return (
    <Card className="overflow-hidden rounded-[28px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] shadow-[0_18px_36px_rgba(33,51,84,0.08)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#e5ebf4]">
        <CardTitle className="font-headline text-[#172033]">Tasks for this lead</CardTitle>
        <AddTaskDialog leadId={leadId} leadName={leadName}>
            <Button variant="outline" size="sm" className="rounded-[18px] border-[#d8deea] bg-white text-[#536591] hover:bg-[#eef3fb] hover:text-[#44537b]">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
            </Button>
        </AddTaskDialog>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-[#7c89a1]">No tasks for this lead.</p>
        ) : (
          <div className="space-y-4">
            {overdueTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Overdue</h4>
                    {overdueTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between rounded-[18px] border border-rose-200 bg-rose-50/80 p-3 shadow-sm">
                            <div>
                                <p className="text-sm font-medium capitalize text-[#172033]">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-[#7c89a1]">Due: {format(task.due_date.toDate(), 'MMM d')}</p>
                            </div>
                            <Badge variant="destructive">Overdue</Badge>
                        </div>
                    ))}
                </div>
            )}
            {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#172033]">Upcoming</h4>
                    {upcomingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between rounded-[18px] border border-[#d8deea] bg-white/80 p-3 shadow-sm">
                            <div>
                                <p className="text-sm font-medium capitalize text-[#172033]">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-[#7c89a1]">Due: {format(task.due_date.toDate(), 'MMM d')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {tasks.filter(t => t.completed).length > 0 && upcomingTasks.length === 0 && overdueTasks.length === 0 && (
                <p className="py-8 text-center text-[#7c89a1]">No pending tasks for this lead.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
