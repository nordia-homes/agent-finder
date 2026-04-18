'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ExternalLink, Pause, PhoneCall, Play, RefreshCw, RotateCcw } from 'lucide-react';

import { useAICallCampaign } from '@/hooks/use-ai-call-campaign';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;
type RecipientRecord = Record<string, any>;
type LeadRecord = Record<string, any>;
type CampaignPayload = {
  campaign: Record<string, any>;
  recipients: RecipientRecord[];
  leads: Record<string, LeadRecord>;
};

function asDate(value: TimestampLike) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatRelative(value: TimestampLike) {
  const date = asDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A';
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;
  const { data, loading, error, refresh } = useAICallCampaign<CampaignPayload>(id);

  const campaign = data?.campaign;
  const recipients = data?.recipients ?? [];
  const leads = data?.leads ?? {};

  async function runCampaignAction(action: 'pause' | 'resume') {
    try {
      const response = await fetch(`/api/ai-calls/campaigns/${id}/${action}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Failed to ${action} campaign.`);
      }
      toast({ title: `Campaign ${action}d`, description: `Campaign status is now ${payload.status}.` });
      await refresh();
    } catch (actionError) {
      toast({
        title: `${action} failed`,
        description: actionError instanceof Error ? actionError.message : 'Unexpected campaign action error.',
        variant: 'destructive',
      });
    }
  }

  async function retryRecipient(recipientId: string) {
    try {
      const response = await fetch(`/api/ai-calls/campaigns/${id}/recipients/${recipientId}/retry`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to retry recipient.');
      }
      toast({ title: 'Retry queued', description: 'The recipient was placed back into the dispatch flow.' });
      await refresh();
    } catch (retryError) {
      toast({
        title: 'Retry failed',
        description: retryError instanceof Error ? retryError.message : 'Unexpected retry error.',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <PageHeader title="Campaign unavailable" description="This AI call campaign could not be loaded." />
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex items-center gap-3 p-4 text-rose-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error || 'The requested campaign was not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={campaign.name} description={campaign.description || 'Detailed delivery, outcome, and retry view for this AI call campaign.'} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={statusStyles[campaign.status] ?? statusStyles.draft}>{campaign.status}</Badge>
        <Badge variant="outline">Assistant {campaign.assistantId}</Badge>
        <Badge variant="outline">Phone {campaign.phoneNumberId}</Badge>
        <Badge variant="outline">Retry {campaign.retryEnabled ? 'enabled' : 'disabled'}</Badge>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        {campaign.status === 'paused' ? (
          <Button size="sm" variant="outline" onClick={() => void runCampaignAction('resume')}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void runCampaignAction('pause')}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Audience</p><p className="mt-1 text-3xl font-headline font-bold text-primary">{campaign.leadCount}</p><p className="text-xs text-muted-foreground">total recipients in this campaign</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Answered</p><p className="mt-1 text-3xl font-headline font-bold text-primary">{campaign.answeredCount}</p><p className="text-xs text-muted-foreground">live conversations reached</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Interested</p><p className="mt-1 text-3xl font-headline font-bold text-primary">{campaign.interestedCount}</p><p className="text-xs text-muted-foreground">structured or inferred positive outcomes</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Callbacks</p><p className="mt-1 text-3xl font-headline font-bold text-primary">{campaign.callbackRequestedCount}</p><p className="text-xs text-muted-foreground">manual callback tasks should exist</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Policy</CardTitle>
            <CardDescription>Delivery and retry behavior currently configured on this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-muted-foreground">Retry automation</p>
              <p className="mt-1 font-medium">{campaign.retryEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-muted-foreground">Retry delay</p>
              <p className="mt-1 font-medium">{campaign.retryDelayMinutes || 1440} minutes</p>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-muted-foreground">Max attempts</p>
              <p className="mt-1 font-medium">{campaign.maxAttempts || 3}</p>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-muted-foreground">Retry outcomes</p>
              <p className="mt-1 font-medium">{Array.isArray(campaign.retryOutcomes) ? campaign.retryOutcomes.join(', ') : 'no_answer, busy, voicemail, failed'}</p>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Last dispatch {formatRelative(campaign.lastDispatchedAt)}. Last webhook {formatRelative(campaign.lastWebhookAt)}.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipient Detail</CardTitle>
            <CardDescription>Call status, business outcome, transcript summary, and retry controls by lead.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[640px]">
              <div className="space-y-4 p-6">
                {recipients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recipients found for this campaign.</p>
                ) : (
                  recipients.map((recipient) => {
                    const lead = leads[String(recipient.leadId ?? '')];
                    return (
                      <div key={recipient.id} className="rounded-3xl border p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">{lead?.full_name || lead?.company_name || recipient.phone}</p>
                              {lead?.id ? (
                                <Button asChild size="sm" variant="ghost" className="h-auto p-0 text-xs">
                                  <Link href={`/leads/${lead.id}`}>Open lead</Link>
                                </Button>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{recipient.phone} {lead?.city ? `· ${lead.city}` : ''}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{recipient.status}</Badge>
                            <Badge variant="outline">{String(recipient.outcome || 'unknown').replace(/_/g, ' ')}</Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Attempts</p><p className="font-medium">{recipient.attemptCount || 0}</p></div>
                          <div className="rounded-2xl bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Duration</p><p className="font-medium">{recipient.durationSeconds || 0}s</p></div>
                          <div className="rounded-2xl bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Next Channel</p><p className="font-medium">{recipient.nextStepChannel || 'n/a'}</p></div>
                          <div className="rounded-2xl bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Ended Reason</p><p className="font-medium">{recipient.endedReason || 'n/a'}</p></div>
                        </div>

                        <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Summary</p>
                          <p className="mt-2 text-sm text-slate-700">{recipient.summary || 'No summary captured yet.'}</p>
                        </div>

                        <div className="mt-3 rounded-2xl border bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Transcript Preview</p>
                          <p className="mt-2 line-clamp-4 text-sm text-slate-700">{recipient.transcript || 'Transcript not available yet.'}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>Last event {formatRelative(recipient.lastEventAt)}</span>
                          <div className="flex flex-wrap gap-2">
                            {recipient.recordingUrl ? (
                              <Button asChild size="sm" variant="outline">
                                <a href={recipient.recordingUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Recording
                                </a>
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => void retryRecipient(recipient.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
