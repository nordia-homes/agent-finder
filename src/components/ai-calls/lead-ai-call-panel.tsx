'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bot,
  Loader2,
  MessageSquareText,
  PhoneCall,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;
type PanelPayload = {
  recipients: Array<Record<string, any>>;
  campaigns: Record<string, Record<string, any>>;
  assistants: Array<Record<string, any>>;
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

function formatAbsolute(value: TimestampLike) {
  const date = asDate(value);
  return date ? format(date, 'dd MMM yyyy, HH:mm') : 'N/A';
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (mins === 0) return `${rest}s`;
  return `${mins}m ${rest}s`;
}

function toTitle(value?: string | null) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

const statusStyles: Record<string, string> = {
  queued: 'border-[#dbe2ef] bg-[#f5f8fc]',
  scheduled: 'border-sky-200 bg-sky-50',
  ringing: 'border-amber-200 bg-amber-50',
  in_progress: 'border-violet-200 bg-violet-50',
  ended: 'border-emerald-200 bg-emerald-50',
  failed: 'border-rose-200 bg-rose-50',
  skipped: 'border-zinc-200 bg-zinc-50',
};

const outcomeStyles: Record<string, string> = {
  interested: 'border-emerald-200 bg-emerald-50',
  callback_requested: 'border-sky-200 bg-sky-50',
  voicemail: 'border-amber-200 bg-amber-50',
  no_answer: 'border-zinc-200 bg-zinc-50',
  busy: 'border-orange-200 bg-orange-50',
  not_interested: 'border-rose-200 bg-rose-50',
  failed: 'border-rose-200 bg-rose-50',
  unknown: 'border-[#dbe2ef] bg-[#f5f8fc]',
};

function InsightPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-2',
        'shadow-[0_10px_22px_rgba(33,51,84,0.05)]',
        tone === 'positive' && 'border-emerald-200 bg-emerald-50/85',
        tone === 'warning' && 'border-amber-200 bg-amber-50/85',
        tone === 'neutral' && 'border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))]'
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusCard({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className={cn('min-w-[156px] rounded-[22px] border px-4 py-3 shadow-[0_12px_26px_rgba(33,51,84,0.06)]', toneClass)}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function LeadAICallPanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [data, setData] = useState<PanelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    assistantRefId: '',
  });

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-calls/leads/${encodeURIComponent(lead.id)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || 'Could not load AI call history for this lead.');
      }
      setData(payload as PanelPayload);
    } catch (error) {
      toast({
        title: 'AI call data unavailable',
        description: error instanceof Error ? error.message : 'Unexpected load error.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [lead.id]);

  const sortedRecipients = useMemo(
    () => [...(data?.recipients ?? [])].sort((a, b) => (b.lastEventAt?._seconds ?? 0) - (a.lastEventAt?._seconds ?? 0)),
    [data]
  );

  async function handleCreateSingleLeadCampaign() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/ai-calls/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || `Lead AI call - ${lead.full_name || lead.company_name || lead.id}`,
          description: form.description || 'Single-lead AI call campaign created from the lead profile.',
          assistantRefId: form.assistantRefId,
          leadIds: [lead.id],
          sendMode: 'send_now',
          timezone: 'Europe/Bucharest',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not start a single-lead AI call.');
      }

      setDialogOpen(false);
      setForm({ name: '', description: '', assistantRefId: '' });
      toast({ title: 'AI call started', description: 'A single-lead AI call campaign was created and dispatched.' });
      await loadData();
    } catch (error) {
      toast({
        title: 'AI call failed',
        description: error instanceof Error ? error.message : 'Unexpected start error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[30px] border border-[#d7dcea] bg-[linear-gradient(180deg,_#fcfaf6_0%,_#f7f9fc_100%)] shadow-[0_22px_55px_rgba(36,52,86,0.10)]">
      <CardHeader className="border-b border-[#e3e8f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(249,251,255,0.84))]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce3ef] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7b95] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#66789b]" />
              Call Intelligence
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#111827]">
                <PhoneCall className="h-6 w-6 text-[#5f7299]" />
                AI Call History
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-base leading-6 text-[#55657f]">
                Premium call review for this lead, with transcript visible, call outcome context, and commercial signals captured from the AI conversation.
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-[22px] bg-[#536591] px-5 text-white shadow-[0_14px_30px_rgba(83,101,145,0.22)] hover:bg-[#46567b]">
                <PlusCircle className="mr-2 h-4 w-4" />
                New AI Call
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start AI Call For This Lead</DialogTitle>
                <DialogDescription>Create and dispatch a one-lead AI call campaign from the lead profile.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Assistant Profile</Label>
                  <Select value={form.assistantRefId} onValueChange={(value) => setForm((current) => ({ ...current, assistantRefId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a saved AI assistant" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.assistants ?? []).map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id}>
                          {assistant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void handleCreateSingleLeadCampaign()} disabled={submitting || !form.assistantRefId}>
                  Start Call
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading AI call history...
          </div>
        ) : sortedRecipients.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#d6ddeb] bg-white/75 p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#172033]">No AI calls captured yet</p>
            <p className="mt-2 text-sm text-[#5a6a84]">
              Launch the first AI call for this lead and the transcript, summary, timing, and sales signals will appear here automatically.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[620px] pr-2">
            <div className="space-y-5">
              {sortedRecipients.map((recipient) => {
                const campaign = data?.campaigns?.[String(recipient.campaignId ?? '')];
                const transcript = String(recipient.transcript ?? '').trim();
                const summary = String(recipient.summary ?? '').trim();
                const status = String(recipient.status ?? 'queued');
                const outcome = String(recipient.outcome ?? 'unknown');

                return (
                  <div
                    key={recipient.id}
                    className="overflow-hidden rounded-[30px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_16px_34px_rgba(33,51,84,0.08)]"
                  >
                    <div className="border-b border-[#e4e9f2] bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(245,248,252,0.86))] px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusCard
                              label="Call Status"
                              value={toTitle(status)}
                              toneClass={statusStyles[status] ?? statusStyles.queued}
                            />
                            <StatusCard
                              label="Outcome"
                              value={toTitle(outcome)}
                              toneClass={outcomeStyles[outcome] ?? outcomeStyles.unknown}
                            />
                            {recipient.nextStepChannel ? (
                              <Badge variant="outline" className="rounded-full border-[#d8deea] bg-white px-3 py-1 font-medium text-[#4f607c] shadow-sm">
                                Next: {toTitle(String(recipient.nextStepChannel))}
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#172033]">
                            {campaign?.name || 'AI Call Campaign'}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-[#5a6a84]">
                            {recipient.phone || lead.phone || 'No phone available'} {campaign?.description ? `· ${campaign.description}` : ''}
                          </p>
                        </div>
                        <div className="min-w-[520px] space-y-3">
                          <div className="grid gap-3 sm:grid-cols-4">
                            <InsightPill label="Last Event" value={formatRelative(recipient.lastEventAt)} />
                            <InsightPill label="Call Time" value={formatAbsolute(recipient.endedAt || recipient.lastEventAt)} />
                            <InsightPill label="Duration" value={formatDuration(Number(recipient.durationSeconds ?? 0))} />
                            <InsightPill label="Attempt" value={`${Number(recipient.attemptCount ?? 0) || 0}`} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <InsightPill
                              label="Uses Another CRM"
                              value={lead.uses_other_crm == null ? 'Unknown' : lead.uses_other_crm ? 'Yes' : 'No'}
                              tone={lead.uses_other_crm ? 'warning' : 'neutral'}
                            />
                            <InsightPill
                              label="Current CRM"
                              value={lead.other_crm_name || 'Not captured yet'}
                              tone={lead.other_crm_name ? 'warning' : 'neutral'}
                            />
                            <InsightPill
                              label="WhatsApp Demo Consent"
                              value={lead.accepted_demo_on_whatsapp == null ? 'Unknown' : lead.accepted_demo_on_whatsapp ? 'Accepted' : 'Declined'}
                              tone={lead.accepted_demo_on_whatsapp ? 'positive' : 'neutral'}
                            />
                            <InsightPill
                              label="Started / Ended"
                              value={`${formatAbsolute(recipient.startedAt)} / ${formatAbsolute(recipient.endedAt || recipient.lastEventAt)}`}
                            />
                            <InsightPill
                              label="Ended Reason"
                              value={recipient.endedReason || 'Not recorded'}
                            />
                            <InsightPill
                              label="Recording / Cost"
                              value={`${recipient.recordingUrl ? 'Recording available' : 'No recording'}${recipient.cost ? ` · ${Number(recipient.cost).toFixed(4)} cost` : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 p-6">
                      <div className="rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#5f7299]" />
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">AI Summary</p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#31415e]">
                          {summary || 'No summary was generated for this call yet.'}
                        </p>
                      </div>

                      <div className="rounded-[26px] border border-[#d8deea] bg-[linear-gradient(180deg,_#f8fbff,_#f3f7fc)] p-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <MessageSquareText className="h-4 w-4 text-[#5f7299]" />
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d7b95]">Transcript</p>
                          </div>
                          <div className="text-xs text-[#7c89a1]">Visible by default</div>
                        </div>
                        <div className="mt-4 max-h-[280px] overflow-auto rounded-2xl border border-[#dbe2ef] bg-white p-4 shadow-inner">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-[#31415e]">
                            {transcript || 'Transcript not available yet for this call.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-[#7c89a1]">
                      <span>Recipient ID: {recipient.id}</span>
                      <span>Campaign: {campaign?.id || recipient.campaignId || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
