'use client';
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
import { WhatsAppDashboard } from "@/components/whatsapp/whatsapp-dashboard";
import { AICallDashboard } from "@/components/ai-calls/ai-call-dashboard";

// Mock data, this will come from firebase
const campaigns = [
    // --- AI Call Campaigns ---
    {
        id: '1',
        name: 'Q3 Independent Agent - Initial Contact',
        description: 'AI-powered initial call to high-scoring independent agents (score > 75) to gauge interest.',
        status: 'active' as const,
        leadsCount: 150,
        progress: 30,
        replyRate: 25, // Connection rate
        channel: 'ai_call' as const,
    },
    {
        id: '2',
        name: 'Q3 No-Answer Retry Sequence',
        description: 'Automated AI call attempts for leads who did not answer the first time. Runs 3 days after initial attempt.',
        status: 'paused' as const,
        leadsCount: 105, // 150 * 70% didn't answer
        progress: 10,
        replyRate: 15,
        channel: 'ai_call' as const,
    },
    {
        id: '3',
        name: 'Q4 Planning - AI Call Strategy',
        description: 'Drafting the AI call strategy for the upcoming quarter, targeting agency-affiliated agents.',
        status: 'draft' as const,
        leadsCount: 0,
        progress: 0,
        replyRate: 0,
        channel: 'ai_call' as const,
    },
    
    // --- WhatsApp Campaigns ---
    {
        id: '4',
        name: 'Q3 Post-Call Follow-up',
        description: 'Immediate WhatsApp follow-up sent to agents successfully contacted via the AI call.',
        status: 'active' as const,
        leadsCount: 45, // 150 * 30% connected
        progress: 30,
        replyRate: 40,
        channel: 'whatsapp' as const,
    },
    {
        id: '5',
        name: 'Post-Demo Feedback Request',
        description: 'Automated message to gather feedback 24 hours after a product demo is completed.',
        status: 'draft' as const,
        leadsCount: 0,
        progress: 0,
        replyRate: 0,
        channel: 'whatsapp' as const,
    },
     {
        id: '6',
        name: 'Q2 Inactive Lead Reactivation (WhatsApp)',
        description: 'A 3-message sequence to re-engage leads inactive for 90 days. Completed last quarter.',
        status: 'completed' as const,
        leadsCount: 200,
        progress: 100,
        replyRate: 7,
        channel: 'whatsapp' as const,
    },

    // --- Email Campaigns ---
    {
        id: '7',
        name: 'Q3 Info Pack & Next Steps',
        description: 'Automated email with info pack, sent after a successful AI call connection.',
        status: 'active' as const,
        leadsCount: 45,
        progress: 30,
        replyRate: 18, // Open/Click rate represented here
        channel: 'email' as const,
    },
    {
        id: '8',
        name: 'Demo Confirmation & Prep',
        description: 'A 2-part email series to confirm demo times and provide prep materials.',
        status: 'active' as const,
        leadsCount: 12, // Leads that replied and booked a demo
        progress: 80,
        replyRate: 95, // High confirmation rate
        channel: 'email' as const,
    },
    {
        id: '9',
        name: 'Q3 Nurture - Possible Independents',
        description: 'A slow-drip content campaign for medium-scoring leads (score 50-75).',
        status: 'active' as const,
        leadsCount: 400,
        progress: 15,
        replyRate: 4,
        channel: 'email' as const,
    },
    {
        id: '10',
        name: 'Q2 Email Outreach (Archived)',
        description: 'Completed email campaign from the previous quarter for historical reference.',
        status: 'completed' as const,
        leadsCount: 320,
        progress: 100,
        replyRate: 11,
        channel: 'email' as const,
    },
];

type Campaign = (typeof campaigns)[0];
type TopBarDashboardPayload = {
  campaigns?: Array<Record<string, unknown>>;
  leads?: Array<Record<string, unknown>>;
  templates?: Array<Record<string, unknown>>;
  scheduledJobs?: Array<Record<string, unknown>>;
  health?: {
    activeCampaigns?: number;
  };
};

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
    <div className="-mt-2 overflow-x-clip md:-mt-3">
      <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(239,244,251,0.95),rgba(248,250,253,1)_45%,rgba(239,247,243,0.95))] shadow-sm">
        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600">
              Outreach Workspace
            </div>
            <h1 className="mt-3 font-headline text-3xl tracking-tight text-primary sm:text-4xl">Campaigns</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Manage AI call, WhatsApp, and email campaigns from one shared workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-slate-700">
              <Phone className="h-4 w-4" />
              <span>AI Call</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-slate-700">
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-slate-700">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="ai_call" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai_call"><Phone className="mr-2 h-4 w-4" /> AI Call Campaigns</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4" /> WhatsApp Campaigns</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" /> Email Campaigns</TabsTrigger>
        </TabsList>
        <TabsContent value="ai_call">
             <AICallDashboard />
        </TabsContent>
        <TabsContent value="whatsapp">
            <div className="mt-6">
              <WhatsAppDashboard />
            </div>
        </TabsContent>
        <TabsContent value="email">
            <CampaignsGrid campaigns={campaigns} channel="email" />
        </TabsContent>
      </Tabs>

    </div>
  );
}
