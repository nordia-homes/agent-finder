'use client';

import { Fragment, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Pause, Play, RefreshCw, RotateCcw, Sparkles, Timer } from 'lucide-react';

import { useAICallCampaign } from '@/hooks/use-ai-call-campaign';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const outcomeStyles: Record<string, string> = {
  interested: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  callback_requested: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  not_interested: 'border-slate-200 bg-slate-100 text-slate-700',
  voicemail: 'border-amber-200 bg-amber-50 text-amber-700',
  no_answer: 'border-amber-200 bg-amber-50 text-amber-700',
  busy: 'border-orange-200 bg-orange-50 text-orange-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  unknown: 'border-slate-200 bg-white/80 text-slate-700',
};

function metricTone(tone: 'default' | 'sky' | 'emerald' | 'cyan') {
  if (tone === 'sky') return 'border-[#cfe0f5] bg-[linear-gradient(180deg,#f7fbff,#eaf3fe)]';
  if (tone === 'emerald') return 'border-emerald-200 bg-[linear-gradient(180deg,#f7fdf9,#ebf8ef)]';
  if (tone === 'cyan') return 'border-cyan-200 bg-[linear-gradient(180deg,#f5fcfe,#e8f7fb)]';
  return 'border-[#d9e3f0] bg-white/90';
}

function compactId(value: unknown) {
  const text = String(value ?? '');
  if (!text) return 'n/a';
  return text.length > 18 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;
  const { data, loading, error, refresh } = useAICallCampaign<CampaignPayload>(id);
  const [statusFilter, setStatusFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [expandedRecipients, setExpandedRecipients] = useState<Record<string, boolean>>({});

  const campaign = data?.campaign;
  const recipients = data?.recipients ?? [];
  const leads = data?.leads ?? {};
  const filteredRecipients = useMemo(() => {
    const search = recipientSearch.trim().toLowerCase();

    return recipients.filter((recipient) => {
      const statusMatches = statusFilter === 'all' || String(recipient.status || '') === statusFilter;
      const outcomeMatches = outcomeFilter === 'all' || String(recipient.outcome || 'unknown') === outcomeFilter;
      const lead = leads[String(recipient.leadId ?? '')];
      const haystack = [
        lead?.full_name,
        lead?.company_name,
        lead?.city,
        recipient.phone,
        recipient.summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const searchMatches = !search || haystack.includes(search);

      return statusMatches && outcomeMatches && searchMatches;
    });
  }, [recipients, leads, statusFilter, outcomeFilter, recipientSearch]);
  const statusOptions = useMemo(
    () => Array.from(new Set(recipients.map((recipient) => String(recipient.status || 'unknown')).filter(Boolean))),
    [recipients]
  );
  const outcomeOptions = useMemo(
    () => Array.from(new Set(recipients.map((recipient) => String(recipient.outcome || 'unknown')).filter(Boolean))),
    [recipients]
  );

  function toggleRecipientExpanded(recipientId: string) {
    setExpandedRecipients((current) => ({
      ...current,
      [recipientId]: !current[recipientId],
    }));
  }

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
      <Card className="overflow-hidden border-[#bfd6f2] bg-[linear-gradient(135deg,rgba(238,246,255,0.98),rgba(248,251,255,1)_48%,rgba(234,244,255,0.95))] shadow-sm">
        <CardContent className="p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-slate-600 hover:bg-white/70 hover:text-slate-900">
                <Link href="/campaigns">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to campaigns
                </Link>
              </Button>
              <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
                AI Call Campaign Detail
              </div>
              <h1 className="mt-2 font-headline text-3xl tracking-tight text-primary sm:text-[2rem]">{campaign.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {campaign.description || 'Detailed delivery, outcome, and retry view for this AI call campaign.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className={statusStyles[campaign.status] ?? statusStyles.draft}>{campaign.status}</Badge>
                <Badge variant="outline" className="border-[#d5e4f6] bg-white/80 text-slate-700">Assistant {compactId(campaign.assistantId)}</Badge>
                <Badge variant="outline" className="border-[#d5e4f6] bg-white/80 text-slate-700">Phone {compactId(campaign.phoneNumberId)}</Badge>
                <Badge variant="outline" className="border-[#d5e4f6] bg-white/80 text-slate-700">Retry {campaign.retryEnabled ? 'enabled' : 'disabled'}</Badge>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
              <Button size="sm" variant="outline" className="border-[#c9daef] bg-white/80 text-slate-700 hover:bg-white" onClick={() => void refresh()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {campaign.status === 'paused' ? (
                <Button size="sm" variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => void runCampaignAction('resume')}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={() => void runCampaignAction('pause')}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={metricTone('sky')}>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Audience</p>
            <p className="mt-1 font-headline text-4xl font-bold text-primary">{campaign.leadCount}</p>
            <p className="mt-2 text-xs text-slate-500">Total recipients currently assigned to this motion.</p>
          </CardContent>
        </Card>
        <Card className={metricTone('default')}>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Answered</p>
            <p className="mt-1 font-headline text-4xl font-bold text-primary">{campaign.answeredCount}</p>
            <p className="mt-2 text-xs text-slate-500">Reached a live conversation state.</p>
          </CardContent>
        </Card>
        <Card className={metricTone('emerald')}>
          <CardContent className="p-5">
            <p className="text-sm text-emerald-700/80">Interested</p>
            <p className="mt-1 font-headline text-4xl font-bold text-emerald-700">{campaign.interestedCount}</p>
            <p className="mt-2 text-xs text-emerald-700/80">Leads marked positive through structured or inferred outcomes.</p>
          </CardContent>
        </Card>
        <Card className={metricTone('cyan')}>
          <CardContent className="p-5">
            <p className="text-sm text-cyan-700/80">Callbacks</p>
            <p className="mt-1 font-headline text-4xl font-bold text-cyan-700">{campaign.callbackRequestedCount}</p>
            <p className="mt-2 text-xs text-cyan-700/80">Manual callback follow-up opportunities created by the flow.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="border-[#d6e3f2] bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(240,246,253,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle>Campaign Policy</CardTitle>
            <CardDescription>Delivery behavior, retry cadence, and recency signals for this motion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-[24px] border border-[#d8e5f4] bg-white/80 p-4 shadow-[0_8px_24px_rgba(114,141,174,0.08)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#eaf3fe] p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-slate-500">Retry automation</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{campaign.retryEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-[#d8e5f4] bg-white/80 p-4">
                <p className="text-slate-500">Retry delay</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{campaign.retryDelayMinutes || 1440} minutes</p>
              </div>
              <div className="rounded-[24px] border border-[#d8e5f4] bg-white/80 p-4">
                <p className="text-slate-500">Max attempts</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{campaign.maxAttempts || 3}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d8e5f4] bg-white/80 p-4">
              <p className="text-slate-500">Retry outcomes</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                {Array.isArray(campaign.retryOutcomes) ? campaign.retryOutcomes.join(', ') : 'no_answer, busy, voicemail, failed'}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-[#d8e5f4] bg-[#edf5ff] p-4">
                <p className="text-slate-500">Last dispatch</p>
                <p className="mt-1 font-medium text-slate-900">{formatRelative(campaign.lastDispatchedAt)}</p>
              </div>
              <div className="rounded-[24px] border border-[#d8e5f4] bg-[#edf5ff] p-4">
                <p className="text-slate-500">Last webhook</p>
                <p className="mt-1 font-medium text-slate-900">{formatRelative(campaign.lastWebhookAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[#d6e3f2] bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(241,247,254,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle>Recipient Detail</CardTitle>
            <CardDescription>Per-lead call state, outcome, notes, transcript preview, and retry controls.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="sticky top-0 z-20 space-y-4 border-b border-[#d7e4f3] bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(241,247,254,0.95))] px-4 py-4 md:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <Input
                  value={recipientSearch}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                  placeholder="Search by lead, phone, city, summary..."
                  className="border-[#d3e2f4] bg-white/85"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-[#d3e2f4] bg-white/85">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="border-[#d3e2f4] bg-white/85">
                    <SelectValue placeholder="Filter by outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    {outcomeOptions.map((outcome) => (
                      <SelectItem key={outcome} value={outcome}>{outcome.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#d7e4f3] bg-white/70 px-4 py-3 text-sm text-slate-600">
                <span>{filteredRecipients.length} recipients shown</span>
                <span>Click a row to expand summary, transcript, and actions.</span>
              </div>
            </div>

            <ScrollArea className="h-[70vh] min-h-[520px] max-h-[780px] bg-white/80">
              {recipients.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No recipients found for this campaign.</p>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No recipients match the current filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[#f4f8fd]">
                    <TableRow className="border-[#d7e4f3] hover:bg-transparent">
                      <TableHead className="w-[44px]"></TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Last Event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipients.map((recipient) => {
                      const lead = leads[String(recipient.leadId ?? '')];
                      const isExpanded = Boolean(expandedRecipients[recipient.id]);

                      return (
                        <Fragment key={recipient.id}>
                          <TableRow
                            className="cursor-pointer border-[#e1ebf7] bg-white/60 hover:bg-[#f7fbff]"
                            onClick={() => toggleRecipientExpanded(recipient.id)}
                          >
                            <TableCell className="py-4">
                              <div className="rounded-full border border-[#d2e1f4] bg-[#eef5fd] p-1 text-slate-600">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{lead?.full_name || lead?.company_name || recipient.phone}</p>
                                <p className="mt-1 text-xs text-slate-500">{recipient.phone} {lead?.city ? `· ${lead.city}` : ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className={statusStyles[String(recipient.status || 'draft')] ?? statusStyles.draft}>{recipient.status}</Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className={outcomeStyles[String(recipient.outcome || 'unknown')] ?? outcomeStyles.unknown}>
                                {String(recipient.outcome || 'unknown').replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 font-medium text-slate-800">{recipient.attemptCount || 0}</TableCell>
                            <TableCell className="py-4 font-medium text-slate-800">{recipient.durationSeconds || 0}s</TableCell>
                            <TableCell className="py-4 text-slate-600">{formatRelative(recipient.lastEventAt)}</TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="border-[#e1ebf7] bg-[#fbfdff] hover:bg-[#fbfdff]">
                              <TableCell colSpan={7} className="p-0">
                                <div className="space-y-4 p-5">
                                  <div className="rounded-[22px] border border-[#d9e6f4] bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Transcript Preview</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">{recipient.transcript || 'Transcript not available yet.'}</p>
                                  </div>

                                  <div className="rounded-[22px] border border-[#d9e6f4] bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lead Context</p>
                                      {lead?.id ? (
                                        <Button asChild size="sm" variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/80">
                                          <Link href={`/leads/${lead.id}`}>Open lead</Link>
                                        </Button>
                                      ) : null}
                                    </div>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                      <div className="rounded-[18px] border border-[#e2edf8] bg-[#f6faff] p-3 text-sm">
                                        <p className="text-slate-500">Next Channel</p>
                                        <p className="font-semibold text-slate-900">{recipient.nextStepChannel || 'n/a'}</p>
                                      </div>
                                      <div className="rounded-[18px] border border-[#e2edf8] bg-[#f6faff] p-3 text-sm">
                                        <p className="text-slate-500">Ended Reason</p>
                                        <p className="font-semibold text-slate-900">{recipient.endedReason || 'n/a'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-[22px] border border-[#d9e6f4] bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Summary</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">{recipient.summary || 'No summary captured yet.'}</p>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#d9e6f4] bg-[#f8fbff] p-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                      <Timer className="h-3.5 w-3.5" />
                                      <span>Last event {formatRelative(recipient.lastEventAt)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {recipient.recordingUrl ? (
                                        <Button asChild size="sm" variant="outline" className="border-[#cfe0f5] bg-white text-slate-700 hover:bg-white">
                                          <a href={recipient.recordingUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Recording
                                          </a>
                                        </Button>
                                      ) : null}
                                      <Button size="sm" variant="outline" className="border-[#cfe0f5] bg-white text-slate-700 hover:bg-white" onClick={(event) => {
                                        event.stopPropagation();
                                        void retryRecipient(recipient.id);
                                      }}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Retry
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
