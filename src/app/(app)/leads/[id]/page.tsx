import { leads } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckSquare, FileText, History, Edit, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScoringExplanation } from '@/components/leads/scoring-explanation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadLifecycleTracker } from '@/components/leads/lead-lifecycle-tracker';
import { LeadInfoCard } from '@/components/leads/lead-info-card';
import { NotesSection } from '@/components/leads/notes';
import { ActivityTimeline } from '@/components/leads/activity-timeline';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';


const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'bg-green-100 text-green-800 border-green-200',
  possible_independent: 'bg-amber-100 text-amber-800 border-amber-200',
  agency: 'bg-red-100 text-red-800 border-red-200',
};

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = leads.find((l) => l.id === params.id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <LeadLifecycleTracker lead={lead} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} />
          
          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4"/>WhatsApp</TabsTrigger>
              <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4"/>Email</TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp" className="mt-6">
              <Card>
                <CardHeader>
                    <CardTitle>WhatsApp Communication</CardTitle>
                    <CardDescription>Select a template and view conversation history.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">WhatsApp integration coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="email" className="mt-6">
              <Card>
                <CardHeader>
                    <CardTitle>Email Outreach</CardTitle>
                    <CardDescription>Use email templates and track engagement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Email automation and templates coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="notes"><FileText className="mr-2 h-4 w-4"/>Notes</TabsTrigger>
              <TabsTrigger value="activity"><History className="mr-2 h-4 w-4"/>Activity</TabsTrigger>
              <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-6">
              <NotesSection />
            </TabsContent>
            <TabsContent value="activity" className="mt-6">
              <ActivityTimeline />
            </TabsContent>
            <TabsContent value="tasks" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Task management for this lead will be available here.</p>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-white font-headline">Independent Score</CardTitle>
                        <CardDescription className="text-white/80">Overall lead quality rating</CardDescription>
                    </div>
                    <Badge variant="outline" className={cn(classificationStyles[lead.classification], 'capitalize font-medium border-white/50 text-white bg-white/10')}>
                        {lead.classification.replace('_', ' ')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 text-white">
                    <div className="text-4xl font-bold font-headline">{lead.independent_score}<span className="text-2xl text-white/70">/100</span></div>
                    <Progress value={lead.independent_score} className="h-2 bg-white/30 [&>div]:bg-white" />
                </div>

                <Separator className="bg-white/20" />

                <div>
                    <h3 className="text-lg font-headline font-semibold text-white mb-4">Lead Details</h3>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Company</p>
                            <p className="font-medium">{lead.company_name || '-'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Website</p>
                            <p className="font-medium truncate">
                                {lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{lead.website}</a> : '-'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Email</p>
                            <p className="font-medium truncate">
                                <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Lead Source</p>
                            <p className="font-medium">{lead.source}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Active Listings</p>
                            <p className="font-medium">{lead.active_listings_count}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Date Added</p>
                            <p className="font-medium">{format(new Date(lead.created_at), 'MMM d, yyyy')}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
          
          <ScoringExplanation lead={lead} />
        </div>
      </div>
    </div>
  );
}
