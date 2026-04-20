'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { CheckSquare, FileText, History, Mail, MessageSquare, Briefcase, Globe, AtSign, Database, List, Calendar, Phone, Users, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead, Activity, Task } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getLeadStatusLabel, normalizeLeadStatus } from '@/lib/lead-status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { serverTimestamp } from 'firebase/firestore';

const LeadWhatsAppPanel = dynamic(
  () => import('@/components/whatsapp/lead-whatsapp-panel').then((mod) => mod.LeadWhatsAppPanel),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Communication</CardTitle>
          <CardDescription>Loading WhatsApp panel...</CardDescription>
        </CardHeader>
      </Card>
    ),
  }
);

const LeadLifecycleTracker = dynamic(
  () => import('@/components/leads/lead-lifecycle-tracker').then((mod) => mod.LeadLifecycleTracker),
  { ssr: false, loading: () => <Skeleton className="h-20 w-full" /> }
);

const LeadInfoCard = dynamic(
  () => import('@/components/leads/lead-info-card').then((mod) => mod.LeadInfoCard),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> }
);

const NotesSection = dynamic(
  () => import('@/components/leads/notes').then((mod) => mod.NotesSection),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

const ActivityTimeline = dynamic(
  () => import('@/components/leads/activity-timeline').then((mod) => mod.ActivityTimeline),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

const TasksSection = dynamic(
  () => import('@/components/leads/tasks-section').then((mod) => mod.TasksSection),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

const AIExplanationDialog = dynamic(
  () => import('@/components/leads/ai-explanation-dialog').then((mod) => mod.AIExplanationDialog),
  { ssr: false, loading: () => <div className="h-8 w-8" /> }
);

const EditableLeadDetail = dynamic(
  () => import('@/components/leads/editable-lead-detail').then((mod) => mod.EditableLeadDetail),
  { ssr: false, loading: () => <Skeleton className="h-20 w-full" /> }
);

const AssociatedLeadsDialog = dynamic(
  () => import('@/components/leads/associated-leads-dialog').then((mod) => mod.AssociatedLeadsDialog),
  { ssr: false }
);

const LeadAICallPanel = dynamic(
  () => import('@/components/ai-calls/lead-ai-call-panel').then((mod) => mod.LeadAICallPanel),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>AI Call History</CardTitle>
          <CardDescription>Loading AI call panel...</CardDescription>
        </CardHeader>
      </Card>
    ),
  }
);


const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'bg-accent/10 text-accent border-accent/20',
  possible_independent: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  agency: 'bg-red-400/10 text-red-300 border-red-400/20',
};

const DetailItem = ({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href?: string;
}) => {
  const content = (
    <div className="rounded-[22px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-4 text-sm shadow-[0_10px_24px_rgba(33,51,84,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(33,51,84,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#eef3fb] p-2 text-[#61739a]">
            <Icon className="h-4 w-4 flex-shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7d8aa3]">{label}</p>
            <div className="truncate pt-1 font-semibold text-[#1b2435]">{value || '-'}</div>
          </div>
        </div>
        {href ? <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8a98b5]" /> : null}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#94a3c3] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      {content}
    </a>
  );
};

function formatLeadDate(createdAt: Lead['created_at'] | null | undefined) {
  if (!createdAt || typeof createdAt.toDate !== 'function') {
    return 'Just added';
  }

  try {
    return format(createdAt.toDate(), 'MMM d, yyyy');
  } catch {
    return 'Just added';
  }
}


export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [potentialDuplicates, setPotentialDuplicates] = useState<Lead[]>([]);
  const [mergedLeads, setMergedLeads] = useState<Lead[]>([]);
  const [showAssociatedLeadsDialog, setShowAssociatedLeadsDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const leadRef = useMemo(() => {
    if (!firestore || !id || !user) return null;
    return doc(firestore, 'leads', id);
  }, [firestore, id, user]);

  const { data: lead, loading: leadLoading, error } = useDoc<Lead>(leadRef);
  
  // Find potential duplicates (active leads with the same phone number)
  useEffect(() => {
    if (!firestore || !lead || !lead.phone) {
      setPotentialDuplicates([]);
      return;
    }

    const findDuplicates = async () => {
      const leadsRef = collection(firestore, 'leads');
      // Look for other active leads with the same phone number
      const q = query(leadsRef, where('phone', '==', lead.phone));
      try {
        const querySnapshot = await getDocs(q);
        const foundDuplicates = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
            .filter(l => l.id !== lead.id && l.lead_status !== 'merged' && !l.archived_at);
        
        setPotentialDuplicates(foundDuplicates);
      } catch (e) {
        console.error("Error finding potential duplicate leads:", e);
        setPotentialDuplicates([]);
      }
    };

    findDuplicates();

  }, [firestore, lead]);

  // Find leads that have been merged INTO this lead
  useEffect(() => {
    if (!firestore || !lead) {
      setMergedLeads([]);
      return;
    }
    const findMerged = async () => {
        const leadsRef = collection(firestore, 'leads');
        const q = query(leadsRef, where('merged_into', '==', lead.id));
        try {
            const querySnapshot = await getDocs(q);
            const foundMerged = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
            setMergedLeads(foundMerged);
        } catch(e) {
            console.error("Error finding merged leads:", e);
            setMergedLeads([]);
        }
    }
    findMerged();
  }, [firestore, lead]);

  const handleMerge = async (masterLeadId: string) => {
    if (!firestore || !lead) return;

    const leadToMergeRef = doc(firestore, 'leads', lead.id);
    try {
        await updateDoc(leadToMergeRef, {
            lead_status: 'merged',
            merged_into: masterLeadId,
        });

        toast({
            title: "Merge Successful",
            description: `${lead.full_name || lead.company_name} has been merged.`,
        });

        router.push('/leads');

    } catch (e) {
        console.error("Error merging lead:", e);
        toast({
            variant: "destructive",
            title: "Merge Failed",
            description: "Could not merge the lead. Please try again.",
        })
    }
  }

  const handleArchive = async () => {
    if (!firestore || !lead) return;

    setIsArchiving(true);
    try {
      await updateDoc(doc(firestore, 'leads', lead.id), {
        archived_at: serverTimestamp(),
        archived_reason: 'manual_archive',
      });

      toast({
        title: "Lead archived",
        description: `${lead.full_name || lead.company_name} was moved out of the active leads list.`,
      });
      router.push('/leads');
    } catch (e) {
      console.error("Error archiving lead:", e);
      toast({
        variant: "destructive",
        title: "Archive failed",
        description: "Could not archive the lead. Please try again.",
      });
    } finally {
      setIsArchiving(false);
    }
  };


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

  // Show a holding page if the lead has been merged
  if (lead && (normalizeLeadStatus(lead.lead_status) === 'merged' || lead.archived_at)) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
             <Card className="p-8 max-w-md w-full">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Lead Archived</CardTitle>
                    <CardDescription>
                      {normalizeLeadStatus(lead.lead_status) === 'merged'
                        ? 'This lead has been archived by merging it into another lead.'
                        : 'This lead has been archived and removed from active lead lists.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {normalizeLeadStatus(lead.lead_status) === 'merged' && lead.merged_into ? (
                        <Button asChild>
                            <Link href={`/leads/${lead.merged_into}`}>
                                View Master Lead <ArrowRight className="ml-2 h-4 w-4"/>
                            </Link>
                        </Button>
                    ) : (
                       <Button asChild>
                            <Link href="/leads">
                                Back to Leads
                            </Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
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
      
  const hasAssociatedLeads = potentialDuplicates.length > 0 || mergedLeads.length > 0;

  return (
    <div className="space-y-6">
      <LeadLifecycleTracker lead={lead} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} />
          
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4"/>WhatsApp</TabsTrigger>
              <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4"/>Email</TabsTrigger>
              <TabsTrigger value="ai-call"><Phone className="mr-2 h-4 w-4"/>AI Call</TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp" className="mt-6">
              <LeadWhatsAppPanel lead={lead} />
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
              <LeadAICallPanel lead={lead} />
            </TabsContent>
          </Tabs>
          
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-[22px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(244,247,252,0.92))] p-1 shadow-sm">
              <TabsTrigger value="notes" className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-sm"><FileText className="mr-2 h-4 w-4"/>Notes</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-sm"><History className="mr-2 h-4 w-4"/>Activity</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-[16px] data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-sm"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
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
          <Card className="overflow-hidden border-[#d6ddeb] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(255,255,255,0.7)_28%,_transparent_54%),linear-gradient(160deg,_#f7f4ee_0%,_#f4f7fb_48%,_#edf2f8_100%)] shadow-[0_24px_60px_rgba(34,50,82,0.12)]">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,_rgba(83,100,145,0.96),_rgba(66,79,119,0.92))] p-6 text-white shadow-[0_20px_40px_rgba(49,66,110,0.28)]">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Lead Score</p>
                      <CardTitle className="mt-2 font-headline text-3xl text-white">Independent Score</CardTitle>
                      <CardDescription className="mt-1 text-white/75">Overall lead quality rating</CardDescription>
                    </div>
                    <AIExplanationDialog lead={lead} />
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className={cn("text-5xl font-bold tracking-tight", scoreColor)}>{lead.independent_score}<span className="text-2xl text-white/60">/100</span></div>
                    <Progress value={lead.independent_score} className={cn("h-2.5 bg-white/15", progressColorClass)} />
                    <Badge variant="outline" className={cn(classificationStyles[lead.classification], 'w-full justify-center rounded-full border-white/10 py-2 text-sm font-medium capitalize')}>
                      {lead.classification.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {hasAssociatedLeads && (
                  <Button variant="secondary" className="w-full rounded-[22px] border border-amber-200 bg-[linear-gradient(180deg,_#ffb11b,_#f59d0c)] py-6 text-base font-semibold text-[#24180b] shadow-[0_16px_30px_rgba(245,157,12,0.22)] hover:brightness-105" onClick={() => setShowAssociatedLeadsDialog(true)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Associated Leads ({potentialDuplicates.length + mergedLeads.length})
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full rounded-[22px] border border-rose-200 bg-white py-6 text-base font-semibold text-rose-700 shadow-[0_12px_26px_rgba(33,51,84,0.08)] hover:bg-rose-50 hover:text-rose-800">
                      Archive Lead
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[24px] border border-[#d9dfeb] bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The lead will be removed from active lead lists, but it will stay saved in the system and can still be accessed directly.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleArchive}
                        className="bg-rose-600 text-white hover:bg-rose-700"
                        disabled={isArchiving}
                      >
                        {isArchiving ? 'Archiving...' : 'Archive lead'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Profile</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailItem label="Company" value={lead.company_name} icon={Briefcase} />
                      <DetailItem
                        label="Lead Source"
                        value={lead.source}
                        icon={Database}
                        href={lead.source_url || undefined}
                      />
                      <EditableLeadDetail leadId={id} fieldKey="phone" label="Phone" value={lead.phone} icon={Phone} />
                      <DetailItem label="Website" value={lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#44537b] hover:underline">{lead.website}</a> : '-'} icon={Globe} />
                      <EditableLeadDetail leadId={id} fieldKey="email" label="Email" value={lead.email} icon={AtSign} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Lead Context</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailItem label="Active Listings" value={lead.active_listings_count} icon={List} />
                      <DetailItem label="Date Added" value={formatLeadDate(lead.created_at)} icon={Calendar} />
                      <DetailItem label="Lead Status" value={getLeadStatusLabel(lead.lead_status)} icon={CheckSquare} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">CRM Signals</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailItem label="Uses Another CRM" value={lead.uses_other_crm == null ? '-' : lead.uses_other_crm ? 'Yes' : 'No'} icon={Database} />
                      <DetailItem label="Current CRM" value={lead.other_crm_name || '-'} icon={Briefcase} />
                      <DetailItem label="Demo Accepted On WhatsApp" value={lead.accepted_demo_on_whatsapp == null ? '-' : lead.accepted_demo_on_whatsapp ? 'Yes' : 'No'} icon={MessageSquare} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
       <AssociatedLeadsDialog 
        open={showAssociatedLeadsDialog} 
        onOpenChange={setShowAssociatedLeadsDialog} 
        potentialDuplicates={potentialDuplicates}
        mergedLeads={mergedLeads}
        onMerge={handleMerge}
        currentLeadName={leadName || 'this lead'}
      />
    </div>
  );
}
