'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";
import { AddTaskDialog } from "./add-task-dialog";

export function TasksSection({ tasks: initialTasks, leadName }: { tasks: Task[], leadName: string }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleAddTask = (newTask: Omit<Task, 'id' | 'is_overdue'>) => {
    const taskToAdd: Task = {
      id: `task-${Date.now()}`,
      ...newTask,
      is_overdue: new Date(newTask.due_date) < new Date(),
    };
    setTasks(prevTasks => [...prevTasks, taskToAdd].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
  };
  
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const overdueTasks = sortedTasks.filter(t => new Date(t.due_date) < new Date());
  const upcomingTasks = sortedTasks.filter(t => new Date(t.due_date) >= new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline">Tasks for this lead</CardTitle>
        <AddTaskDialog leadName={leadName} onAddTask={handleAddTask}>
            <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
            </Button>
        </AddTaskDialog>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground">No tasks for this lead.</p>
        ) : (
          <div className="space-y-4">
            {overdueTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Overdue</h4>
                    {overdueTasks.map(task => (
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
            {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Upcoming</h4>
                    {upcomingTasks.map(task => (
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
