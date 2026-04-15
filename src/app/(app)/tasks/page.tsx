import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TasksPage() {
  return (
    <div>
      <PageHeader title="Tasks" description="Manage your daily tasks and follow-ups." />
      <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <CardTitle className="font-headline text-2xl">Tasks Management Coming Soon</CardTitle>
          <CardDescription className="mt-2">This page will show tasks due today, overdue tasks, and more.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
