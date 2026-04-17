'use client';

import { useMemo, useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';

import { CheckSquare, FileText, History, Mail, MessageSquare, Briefcase, Globe, AtSign, Database, List, Calendar, Phone, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead, Activity, Task } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadLifecycleTracker } from '@/components/leads/lead-lifecycle-tracker';
import { LeadInfoCard } from '@/components/leads/lead-info-card';
import { NotesSection } from '@/components/leads/notes';
import { ActivityTimeline } from '@/components/leads/activity-timeline';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { TasksSection } from '@/components/leads/tasks-section';
import { AIExplanationDialog } from '@/components/leads/ai-explanation-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EditableLeadDetail } from '@/components/leads/editable-lead-detail';
import { DuplicateLeadsDialog } from '@/components/leads/duplicate-leads-dialog';
import { Button } from '@/components/ui/button';


const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'bg-accent/10 text-accent border-accent/20',
  possible_independent: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  agency: 'bg-red-400/10 text-red-300 border-red-400/20',
};

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode, icon: React.ElementType }) => (
    <div className="bg-black/10 backdrop-blur-sm border border-white/10 rounded-lg p-3 transition-all hover:bg-black/20 group text-sm">
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-white/60 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-xs text-white/70">{label}</p>
                <div className="font-medium truncate text-white">{value || '-'}</div>
            </div>
        </div>
    </div>
);


export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  
  const [duplicates, setDuplicates] = useState<Lead[]>([]);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);

  const leadRef = useMemo(() => {
    if (!firestore || !id || !user) return null;
    return doc(firestore, 'leads', id);
  }, [firestore, id, user]);

  const { data: lead, loading: leadLoading, error } = useDoc<Lead>(leadRef);
  
  useEffect(() => {
    if (!firestore || !lead || !lead.phone) {
      setDuplicates([]);
      return;
    }

    const findDuplicates = async () => {
      const leadsRef = collection(firestore, 'leads');
      const q = query(leadsRef, where('phone', '==', lead.phone));
      try {
        const querySnapshot = await getDocs(q);
        const foundDuplicates = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
            .filter(l => l.id !== lead.id);
        
        setDuplicates(foundDuplicates);
      } catch (e) {
        console.error("Error finding duplicate leads:", e);
        setDuplicates([]);
      }
    };

    findDuplicates();

  }, [firestore, lead]);


  const leadName = lead?.full_name || lead?.company_name;

  const activitiesQuery = useMemo(() => {
    if (!firestore || !leadName || !user) return null;
    return query(collection(firestore, 'activities'), where('lead_name', '==', leadName));
  }, [firestore, leadName, user]);

  const { data: leadActivities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  
  const tasksQuery = useMemo(() => {
    if (!firestore || !leadName || !user) return null;
    return query(collection(firestore, 'tasks'), where('lead_name', '==', leadName));
  }, [firestore, leadName, user]);

  const { data: leadTasks, loading: tasksLoading } = useCollection<Task>(tasksQuery);
  
  if (error) {
    // Handle error (e.g., show a message)
    console.error(error);
  }
  
  if (!lead && !(userLoading || leadLoading)) {
    notFound();
  }
  
  if (userLoading || leadLoading || !lead) {
      return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-96 w-full" />
                </div>
             </div>
        </div>
      )
  }

  const leadNotes = leadActivities?.filter(a => a.event_type === 'note_added') || [];

  const scoreColor =
    lead.independent_score > 70
      ? 'text-accent'
      : lead.independent_score > 50
      ? 'text-amber-300'
      : 'text-red-300';
      
  const progressColorClass =
    lead.independent_score > 70
      ? '[&>div]:bg-accent'
      : lead.independent_score > 50
      ? '[&>div]:bg-amber-400'
      : '[&>div]:bg-red-400';

  return (
    <div className="space-y-6">
      <LeadLifecycleTracker lead={lead} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} />
          
          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4"/>WhatsApp</TabsTrigger>
              <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4"/>Email</TabsTrigger>
              <TabsTrigger value="ai-call"><Phone className="mr-2 h-4 w-4"/>AI Call</TabsTrigger>
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
             <TabsContent value="ai-call" className="mt-6">
              <Card>
                <CardHeader>
                    <CardTitle>AI Call</CardTitle>
                    <CardDescription>Initiate and manage AI-powered calls.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">AI Call functionality coming soon.</p>
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
              <NotesSection notes={leadNotes} leadId={id} leadName={lead.full_name || lead.company_name} />
            </TabsContent>
            <TabsContent value="activity" className="mt-6">
              <ActivityTimeline activities={leadActivities || []} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-6">
                <TasksSection tasks={leadTasks || []} leadId={id} leadName={lead.full_name || lead.company_name} />
            </TabsContent>
          </Tabs>

        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
              <div className="relative z-10 space-y-6">
                <div>
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle className="text-white font-headline">Independent Score</CardTitle>
                          <CardDescription className="text-white/80">Overall lead quality rating</CardDescription>
                      </div>
                      <AIExplanationDialog lead={lead} />
                  </div>
                </div>
                
                <div className="space-y-3">
                    <div className={cn("text-4xl font-bold", scoreColor)}>{lead.independent_score}<span className="text-2xl text-white/70">/100</span></div>
                    <Progress value={lead.independent_score} className={cn("h-2 bg-white/20", progressColorClass)} />
                    <Badge variant="outline" className={cn(classificationStyles[lead.classification], 'capitalize font-medium w-full justify-center py-1.5 text-sm')}>
                        {lead.classification.replace('_', ' ')}
                    </Badge>
                </div>

                {duplicates.length > 0 && (
                    <Button variant="secondary" className="w-full bg-amber-500 hover:bg-amber-600 text-black" onClick={() => setShowDuplicatesDialog(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        Vezi duplicate ({duplicates.length})
                    </Button>
                )}

                <Separator className="bg-white/20" />

                <div className="grid grid-cols-1 gap-3">
                    <DetailItem label="Company" value={lead.company_name} icon={Briefcase} />
                    <DetailItem label="Website" value={lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{lead.website}</a> : '-'} icon={Globe} />
                    <EditableLeadDetail leadId={id} fieldKey="email" label="Email" value={lead.email} icon={AtSign} />
                    <EditableLeadDetail leadId={id} fieldKey="phone" label="Phone" value={lead.phone} icon={Phone} />
                    <DetailItem label="Lead Source" value={lead.source} icon={Database} />
                    <DetailItem label="Active Listings" value={lead.active_listings_count} icon={List} />
                    <DetailItem label="Date Added" value={format(lead.created_at.toDate(), 'MMM d, yyyy')} icon={Calendar} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
       <DuplicateLeadsDialog 
        open={showDuplicatesDialog} 
        onOpenChange={setShowDuplicatesDialog} 
        duplicates={duplicates}
        originalLeadPhone={lead.phone || ''}
      />
    </div>
  );
}
