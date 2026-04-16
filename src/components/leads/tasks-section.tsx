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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Tasks for this lead</CardTitle>
        <AddTaskDialog leadId={leadId} leadName={leadName}>
            <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
            </Button>
        </AddTaskDialog>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tasks for this lead.</p>
        ) : (
          <div className="space-y-4">
            {overdueTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Overdue</h4>
                    {overdueTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
                            <div>
                                <p className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">Due: {format(task.due_date.toDate(), 'MMM d')}</p>
                            </div>
                            <Badge variant="destructive">Overdue</Badge>
                        </div>
                    ))}
                </div>
            )}
            {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Upcoming</h4>
                    {upcomingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div>
                                <p className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">Due: {format(task.due_date.toDate(), 'MMM d')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {tasks.filter(t => t.completed).length > 0 && upcomingTasks.length === 0 && overdueTasks.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No pending tasks for this lead.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
