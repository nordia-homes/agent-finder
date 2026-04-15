import { leads } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckSquare, FileText, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ScoringExplanation } from '@/components/leads/scoring-explanation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadLifecycleTracker } from '@/components/leads/lead-lifecycle-tracker';
import { LeadInfoCard } from '@/components/leads/lead-info-card';
import { LeadDetailsCard } from '@/components/leads/lead-details-card';
import { NotesSection } from '@/components/leads/notes';
import { ActivityTimeline } from '@/components/leads/activity-timeline';


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
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} />
          <LeadDetailsCard lead={lead} />
          <LeadLifecycleTracker lead={lead} />
          
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
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Independent Score</span>
                <span className="text-2xl font-bold font-headline text-primary">{lead.independent_score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Classification</span>
                <Badge variant="outline" className={cn(classificationStyles[lead.classification], 'capitalize font-medium')}>
                  {lead.classification.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <ScoringExplanation lead={lead} />
        </div>
      </div>
    </div>
  );
}
