import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntakePage() {
  return (
    <div>
      <PageHeader title="Intake Queue" description="Review, clean, and approve new leads." />
      <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <CardTitle className="font-headline text-2xl">Intake Queue Coming Soon</CardTitle>
          <CardDescription className="mt-2">This is where newly scraped records will be displayed for triage.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
