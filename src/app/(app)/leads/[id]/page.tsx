import { leads } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckSquare, FileText, History, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const scoreColorClass =
    lead.independent_score > 75
      ? 'text-green-600'
      : lead.independent_score > 50
      ? 'text-amber-600'
      : 'text-red-600';

  return (
    <div className="space-y-6">
      <LeadLifecycleTracker lead={lead} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} />
          <LeadDetailsCard lead={lead} />
          
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
          <Card className="bg-gradient-to-br from-accent/5 to-background">
            <CardContent className="pt-6 text-center flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-muted/20"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className={scoreColorClass}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray={`${lead.independent_score}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-4xl font-bold font-headline", scoreColorClass)}>{lead.independent_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <CardTitle className="font-headline mt-4 text-xl">Independent Score</CardTitle>
              <div className="mt-2">
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
