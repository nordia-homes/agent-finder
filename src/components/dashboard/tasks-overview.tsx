import { tasks } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function TasksOverview() {
  const dueToday = tasks.filter(t => !t.is_overdue).slice(0, 3);
  const overdue = tasks.filter(t => t.is_overdue);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Tasks</CardTitle>
          <CardDescription>{dueToday.length} due today, {overdue.length} overdue.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/tasks">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dueToday.map((task) => (
            <div key={task.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{task.lead_name}</p>
                <p className="text-sm text-muted-foreground capitalize">{task.type.replace('_', ' ')}</p>
              </div>
              {task.is_overdue && <Badge variant="destructive">Overdue</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
