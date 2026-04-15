import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Analyze your outreach performance and lead data." />
      <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <CardTitle className="font-headline text-2xl">Analytics Dashboard Coming Soon</CardTitle>
          <CardDescription className="mt-2">This section will feature charts and reports on your sales performance.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
