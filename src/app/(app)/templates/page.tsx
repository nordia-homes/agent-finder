import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TemplatesPage() {
  return (
    <div>
      <PageHeader title="Templates" description="Create and manage reusable outreach templates." />
      <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <CardTitle className="font-headline text-2xl">Template Editor Coming Soon</CardTitle>
          <CardDescription className="mt-2">This is where you'll manage your email, WhatsApp, and SMS templates.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
