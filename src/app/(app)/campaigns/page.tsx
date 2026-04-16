'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Play, Pause, FolderArchive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

// Mock data, this will come from firebase
const campaigns = [
    {
        id: '1',
        name: 'Q4 Independent Agent Push',
        description: 'Multi-step email and WhatsApp sequence for high-scoring independent agents.',
        status: 'active' as const,
        leadsCount: 250,
        progress: 60,
        replyRate: 12,
    },
    {
        id: '2',
        name: 'New Listings Follow-up',
        description: 'Automated follow-up for agents with new listings in target areas.',
        status: 'paused' as const,
        leadsCount: 75,
        progress: 25,
        replyRate: 8,
    },
    {
        id: '3',
        name: 'Agency Reactivation',
        description: 'A campaign to re-engage with previously contacted agency leads.',
        status: 'draft' as const,
        leadsCount: 0,
        progress: 0,
        replyRate: 0,
    },
    {
        id: '4',
        name: 'Q3 Outreach',
        description: 'Completed campaign from the previous quarter.',
        status: 'completed' as const,
        leadsCount: 180,
        progress: 100,
        replyRate: 15,
    }
]

const statusStyles: Record<(typeof campaigns)[0]['status'], string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-amber-100 text-amber-800 border-amber-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200'
}

const CampaignCard = ({ campaign }: { campaign: (typeof campaigns)[0] }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg">{campaign.name}</CardTitle>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardDescription>{campaign.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <Badge variant="outline" className={statusStyles[campaign.status]}>{campaign.status}</Badge>
                        <span className="text-muted-foreground">{campaign.leadsCount} leads</span>
                    </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Progress</span>
                            <span className="text-xs font-medium text-muted-foreground">{campaign.progress}%</span>
                        </div>
                        <Progress value={campaign.progress} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Reply Rate: <span className="font-bold text-foreground">{campaign.replyRate}%</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 border-t">
                <div className="w-full flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Updated 2 days ago</span>
                     <div className="flex items-center gap-2">
                        {campaign.status === 'active' && <Button variant="outline" size="sm"><Pause className="mr-2 h-4 w-4" /> Pause</Button>}
                        {(campaign.status === 'paused' || campaign.status === 'draft') && <Button variant="outline" size="sm"><Play className="mr-2 h-4 w-4" /> Start</Button>}
                        {campaign.status === 'completed' && <Button variant="outline" size="sm" disabled><FolderArchive className="mr-2 h-4 w-4" /> Archived</Button>}
                         <Button asChild size="sm">
                           <Link href={`/campaigns/${campaign.id}`}>View</Link>
                        </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}


export default function CampaignsPage() {
  return (
    <div>
      <PageHeader title="Campaigns" description="Create, manage, and analyze your outreach campaigns.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
         <Card className="border-dashed flex items-center justify-center min-h-[350px]">
            <div className="text-center">
                <h3 className="text-xl font-medium font-headline">New Campaign</h3>
                <p className="text-sm text-muted-foreground mt-1">Start engaging with your leads.</p>
                 <Button variant="default" className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create
                </Button>
            </div>
        </Card>
      </div>
    </div>
  );
}
