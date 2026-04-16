'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";

export function TasksSection({ tasks }: { tasks: Task[] }) {
  const dueToday = tasks.filter(t => !t.is_overdue);
  const overdue = tasks.filter(t => t.is_overdue);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Tasks for this lead</CardTitle>
        <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground">No tasks for this lead.</p>
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Overdue</h4>
                    {overdue.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
                            <div>
                                <p className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">Due: {format(new Date(task.due_date), 'MMM d')}</p>
                            </div>
                            <Badge variant="destructive">Overdue</Badge>
                        </div>
                    ))}
                </div>
            )}
            {dueToday.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Upcoming</h4>
                    {dueToday.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div>
                                <p className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">Due: {format(new Date(task.due_date), 'MMM d')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
