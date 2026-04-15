import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader title="Campaigns" description="Manage your multi-channel outreach campaigns." />
       <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <CardTitle className="font-headline text-2xl">Campaigns Module Coming Soon</CardTitle>
          <CardDescription className="mt-2">This section will allow you to create and manage outreach sequences.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
