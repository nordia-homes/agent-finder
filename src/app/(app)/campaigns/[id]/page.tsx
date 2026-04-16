'use client'

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function CampaignDetailPage() {
    const params = useParams();
    const id = params.id as string;

    return (
         <div>
            <PageHeader title={`Campaign: ${id}`} description="Details and analytics for this campaign." />
             <Card className="min-h-[500px] flex items-center justify-center">
                <CardContent className="text-center">
                <CardTitle className="font-headline text-2xl">Campaign Details Coming Soon</CardTitle>
                <CardDescription className="mt-2">This section will show leads, sequence steps, and performance analytics.</CardDescription>
                </CardContent>
            </Card>
        </div>
    )
}
