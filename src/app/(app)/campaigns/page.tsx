'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Play, Pause, FolderArchive, Mail, MessageSquare, Phone, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Campaign as CampaignType } from "@/lib/types";

// Mock data, this will come from firebase
const campaigns = [
    // AI Call Campaigns
    {
        id: '3',
        name: 'AI Cold Call - Q1 Leads',
        description: 'Initial AI-powered cold call campaign for new year leads.',
        status: 'draft' as const,
        leadsCount: 0,
        progress: 0,
        replyRate: 0,
        channel: 'ai_call' as const,
    },
    {
        id: '5',
        name: 'High-Scoring Lead Follow-up',
        description: 'AI-powered calls to high-potential leads (Score > 80).',
        status: 'active' as const,
        leadsCount: 120,
        progress: 45,
        replyRate: 18,
        channel: 'ai_call' as const,
    },
    {
        id: '6',
        name: 'Demo Confirmation Calls',
        description: 'Automated AI calls to confirm upcoming product demos.',
        status: 'paused' as const,
        leadsCount: 30,
        progress: 90,
        replyRate: 95, // Confirmation rates should be high
        channel: 'ai_call' as const,
    },
    // WhatsApp Campaigns
    {
        id: '2',
        name: 'New Listings Follow-up',
        description: 'Automated WhatsApp follow-up for agents with new listings.',
        status: 'paused' as const,
        leadsCount: 75,
        progress: 25,
        replyRate: 8,
        channel: 'whatsapp' as const,
    },
    {
        id: '7',
        name: 'Post-Demo Feedback',
        description: 'Gather feedback via WhatsApp 24 hours after a product demo.',
        status: 'active' as const,
        leadsCount: 40,
        progress: 70,
        replyRate: 35,
        channel: 'whatsapp' as const,
    },
    {
        id: '8',
        name: 'Inactive Lead Reactivation',
        description: 'A 3-message sequence to re-engage leads inactive for 90 days.',
        status: 'completed' as const,
        leadsCount: 200,
        progress: 100,
        replyRate: 5,
        channel: 'whatsapp' as const,
    },
    // Email Campaigns
    {
        id: '1',
        name: 'Q4 Independent Agent Push',
        description: 'Multi-step email sequence for high-scoring independent agents.',
        status: 'active' as const,
        leadsCount: 250,
        progress: 60,
        replyRate: 12,
        channel: 'email' as const,
    },
    {
        id: '9',
        name: 'Welcome Sequence for New Leads',
        description: 'A 5-part email series to nurture new leads entering the CRM.',
        status: 'draft' as const,
        leadsCount: 0,
        progress: 0,
        replyRate: 0,
        channel: 'email' as const,
    },
    {
        id: '10',
        name: 'Monthly Newsletter - Agency Tips',
        description: 'Ongoing monthly newsletter with valuable content for agents.',
        status: 'active' as const,
        leadsCount: 1500,
        progress: 5, // Represents progress in the current month's send
        replyRate: 2, // Newsletters have low reply rates
        channel: 'email' as const,
    },
    {
        id: '4',
        name: 'Q3 Email Outreach (Archive)',
        description: 'Completed email campaign from the previous quarter.',
        status: 'completed' as const,
        leadsCount: 180,
        progress: 100,
        replyRate: 15,
        channel: 'email' as const,
    },
];

type Campaign = (typeof campaigns)[0];

const statusStyles: Record<Campaign['status'], string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-amber-100 text-amber-800 border-amber-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200'
};

const channelIcons: Record<Campaign['channel'], React.ElementType> = {
    email: Mail,
    whatsapp: MessageSquare,
    ai_call: Phone,
};


const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
    const Icon = channelIcons[campaign.channel];
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        {campaign.name}
                    </CardTitle>
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

const CampaignsGrid = ({ campaigns, channel }: { campaigns: Campaign[], channel: CampaignType['channel'] }) => {
    const filteredCampaigns = campaigns.filter(c => c.channel === channel);
    
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
            {filteredCampaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
            <Card className="border-dashed flex items-center justify-center min-h-[350px]">
                <div className="text-center">
                    <h3 className="text-xl font-medium font-headline capitalize">New {channel.replace('_', ' ')} Campaign</h3>
                    <p className="text-sm text-muted-foreground mt-1">Start engaging with your leads.</p>
                    <Button variant="default" className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create
                    </Button>
                </div>
            </Card>
        </div>
    );
};


export default function CampaignsPage() {
  return (
    <div>
      <PageHeader title="Campaigns" description="Create, manage, and analyze your outreach campaigns.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="ai_call" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai_call"><Phone className="mr-2 h-4 w-4" /> AI Call Campaigns</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4" /> WhatsApp Campaigns</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" /> Email Campaigns</TabsTrigger>
        </TabsList>
        <TabsContent value="ai_call">
             <CampaignsGrid campaigns={campaigns} channel="ai_call" />
        </TabsContent>
        <TabsContent value="whatsapp">
            <CampaignsGrid campaigns={campaigns} channel="whatsapp" />
        </TabsContent>
        <TabsContent value="email">
            <CampaignsGrid campaigns={campaigns} channel="email" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
