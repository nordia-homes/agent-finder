'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Bot, ExternalLink, PhoneCall, PlusCircle, RefreshCw, Rocket, Timer } from 'lucide-react';
import Link from 'next/link';

import { useAICallDashboard } from '@/hooks/use-ai-call-dashboard';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;
type DashboardLead = {
  id: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  city?: string;
  classification?: string;
};
type DashboardRecord = Record<string, any>;
type DashboardPayload = {
  health: {
    vapiConfigured: boolean;
    defaultAssistantConfigured: boolean;
    defaultPhoneNumberConfigured: boolean;
    webhookActive: boolean;
    assistantProfilesAvailable: boolean;
    campaignsNeedAttention: boolean;
    activeCampaigns: number;
  };
  assistants: DashboardRecord[];
  campaigns: DashboardRecord[];
  recipients: DashboardRecord[];
  leads: DashboardLead[];
  scheduledJobs: DashboardRecord[];
  workspace?: {
    assistants: DashboardRecord[];
    phoneNumbers: DashboardRecord[];
    tools: DashboardRecord[];
    calls: DashboardRecord[];
  };
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

function safeNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function HealthPill({ title, healthy }: { title: string; healthy: boolean }) {
  return (
    <Badge
      variant="outline"
      className={healthy ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}
    >
      {title}
    </Badge>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone?: 'default' | 'active' | 'pending' | 'delivered' | 'seen' | 'replies';
}) {
  const cardTone =
    tone === 'active'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'pending'
        ? 'border-amber-200 bg-amber-50'
        : tone === 'delivered'
          ? 'border-sky-200 bg-sky-50'
          : tone === 'seen'
            ? 'border-indigo-200 bg-indigo-50'
            : tone === 'replies'
              ? 'border-cyan-200 bg-cyan-50'
              : 'border-white/10 bg-white/80';

  return (
    <Card className={cardTone}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 font-headline text-3xl font-bold text-primary">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl bg-white/60 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function AICallDashboard() {
  const { toast } = useToast();
  const { data, loading, error, refresh } = useAICallDashboard<DashboardPayload>();
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assistantForm, setAssistantForm] = useState({
    name: '',
    description: '',
    assistantId: '',
    phoneNumberId: '',
    firstMessage: '',
    objective: '',
  });
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    assistantRefId: '',
    sendMode: 'send_now',
    retryEnabled: true,
    retryDelayMinutes: '1440',
    maxAttempts: '3',
    scheduledAt: '',
    timezone: 'Europe/Bucharest',
    leadIds: [] as string[],
    search: '',
  });

  const assistants = data?.assistants ?? [];
  const campaigns = data?.campaigns ?? [];
  const recipients = data?.recipients ?? [];
  const leads = data?.leads ?? [];
  const jobs = data?.scheduledJobs ?? [];
  const remoteAssistants = data?.workspace?.assistants ?? [];
  const remotePhoneNumbers = data?.workspace?.phoneNumbers ?? [];
  const remoteTools = data?.workspace?.tools ?? [];
  const remoteCalls = data?.workspace?.calls ?? [];
  const salesActionMetrics = useMemo(() => ({
    callbackQueue: recipients.filter((recipient) => recipient.outcome === 'callback_requested').length,
    warmLeads: recipients.filter((recipient) => recipient.outcome === 'interested').length,
    manualReview: recipients.filter((recipient) => ['voicemail', 'busy', 'failed', 'no_answer'].includes(String(recipient.outcome))).length,
  }), [recipients]);
  const assistantOptions = useMemo(() => {
    const savedOptions = assistants.map((assistant) => ({
      value: String(assistant.id),
      label: String(assistant.name || 'Saved assistant'),
      source: 'saved' as const,
      assistantRefId: String(assistant.id),
      assistantId: String(assistant.assistantId || ''),
      phoneNumberId: String(assistant.phoneNumberId || ''),
    }));

    const savedAssistantIds = new Set(savedOptions.map((assistant) => assistant.assistantId).filter(Boolean));

    const vapiOptions = remoteAssistants
      .filter((assistant) => !savedAssistantIds.has(String(assistant.id || '')))
      .map((assistant) => {
        const assistantId = String(assistant.id || '');
        const linkedPhoneNumber = remotePhoneNumbers.find(
          (phoneNumber) => String(phoneNumber.assistantId || '') === assistantId
        );

        return {
          value: `vapi:${assistantId}`,
          label: String(assistant.name || assistantId || 'Vapi assistant'),
          source: 'vapi' as const,
          assistantRefId: '',
          assistantId,
          phoneNumberId: String(linkedPhoneNumber?.id || ''),
        };
      });

    return [...savedOptions, ...vapiOptions];
  }, [assistants, remoteAssistants, remotePhoneNumbers]);
  const selectedAssistantOption = useMemo(
    () => assistantOptions.find((assistant) => assistant.value === campaignForm.assistantRefId) ?? null,
    [assistantOptions, campaignForm.assistantRefId]
  );
  const canSaveCampaign =
    campaignForm.name.trim().length > 0 &&
    campaignForm.assistantRefId.length > 0 &&
    campaignForm.leadIds.length > 0 &&
    (campaignForm.sendMode !== 'scheduled' || campaignForm.scheduledAt.length > 0);

  const filteredLeads = useMemo(() => {
    const search = campaignForm.search.toLowerCase();
    return leads.filter((lead) => {
      const haystack = `${lead.full_name ?? ''} ${lead.company_name ?? ''} ${lead.phone ?? ''} ${lead.city ?? ''}`.toLowerCase();
      return !search || haystack.includes(search);
    });
  }, [campaignForm.search, leads]);

  const metrics = useMemo(() => ({
    answered: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.answeredCount), 0),
    interested: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.interestedCount), 0),
    queued: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.queuedCount), 0),
    failed: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.failedCount), 0),
  }), [campaigns]);

  async function handleCreateAssistant() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/ai-calls/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to create AI call assistant profile.');
      setAssistantDialogOpen(false);
      setAssistantForm({ name: '', description: '', assistantId: '', phoneNumberId: '', firstMessage: '', objective: '' });
      toast({ title: 'Assistant profile created', description: 'The Vapi reference is ready for campaigns.' });
      await refresh();
    } catch (submitError) {
      toast({ title: 'Create failed', description: submitError instanceof Error ? submitError.message : 'Unexpected create error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCampaign() {
    setSubmitting(true);
    try {
      if (!campaignForm.name.trim()) {
        throw new Error('Campaign name is required.');
      }
      if (!campaignForm.assistantRefId) {
        throw new Error('Select an assistant before saving the campaign.');
      }
      if (campaignForm.leadIds.length === 0) {
        throw new Error('Select at least one lead before saving the campaign.');
      }
      if (
        campaignForm.sendMode === 'scheduled' &&
        (!campaignForm.scheduledAt || Number.isNaN(new Date(campaignForm.scheduledAt).getTime()))
      ) {
        throw new Error('Pick a valid scheduled date and time.');
      }

      const selectedAssistant = assistantOptions.find((assistant) => assistant.value === campaignForm.assistantRefId);
      const payload = {
        ...campaignForm,
        assistantRefId: selectedAssistant?.source === 'saved' ? selectedAssistant.assistantRefId : undefined,
        assistantId: selectedAssistant?.source === 'vapi' ? selectedAssistant.assistantId : undefined,
        phoneNumberId:
          selectedAssistant?.source === 'vapi' && selectedAssistant.phoneNumberId
            ? selectedAssistant.phoneNumberId
            : undefined,
        retryDelayMinutes: Number(campaignForm.retryDelayMinutes),
        maxAttempts: Number(campaignForm.maxAttempts),
        scheduledAt: campaignForm.sendMode === 'scheduled' ? new Date(campaignForm.scheduledAt).toISOString() : undefined,
      };
      const response = await fetch('/api/ai-calls/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to create AI call campaign.');
      setCampaignDialogOpen(false);
      setCampaignForm({ name: '', description: '', assistantRefId: '', sendMode: 'send_now', retryEnabled: true, retryDelayMinutes: '1440', maxAttempts: '3', scheduledAt: '', timezone: 'Europe/Bucharest', leadIds: [], search: '' });
      toast({ title: 'Campaign saved', description: 'The AI call campaign is now in the workspace.' });
      await refresh();
    } catch (submitError) {
      toast({ title: 'Campaign failed', description: submitError instanceof Error ? submitError.message : 'Unexpected campaign error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispatchCampaign(campaignId: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/ai-calls/campaigns/${campaignId}/dispatch`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to dispatch AI call campaign.');
      toast({ title: 'Dispatch started', description: 'Queued recipients are being sent to Vapi.' });
      await refresh();
    } catch (dispatchError) {
      toast({ title: 'Dispatch failed', description: dispatchError instanceof Error ? dispatchError.message : 'Unexpected dispatch error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCampaignAction(campaignId: string, action: 'pause' | 'resume') {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/ai-calls/campaigns/${campaignId}/${action}`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Unable to ${action} AI call campaign.`);
      toast({ title: `Campaign ${action}d`, description: `The campaign is now ${payload.status || action}.` });
      await refresh();
    } catch (actionError) {
      toast({ title: `${action} failed`, description: actionError instanceof Error ? actionError.message : 'Unexpected campaign action error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,rgba(240,247,255,0.96),rgba(250,252,255,1)_48%,rgba(243,250,247,0.95))] shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Vapi Voice Orchestration</p>
            <h2 className="mt-2 font-headline text-3xl tracking-tight text-primary">AI Call Campaigns</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Launch, schedule, and monitor outbound AI calls with Vapi while keeping this workspace focused on sales execution, outcomes, and follow-up.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={submitting}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Dialog open={assistantDialogOpen} onOpenChange={setAssistantDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Bot className="mr-2 h-4 w-4" />Add Assistant</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Save AI Call Assistant Profile</DialogTitle>
                  <DialogDescription>Store a reusable Vapi assistant ID and outbound phone number ID.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 md:grid-cols-2">
                  <div className="space-y-2"><Label>Name</Label><Input value={assistantForm.name} onChange={(event) => setAssistantForm((current) => ({ ...current, name: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Vapi Assistant ID</Label><Input value={assistantForm.assistantId} onChange={(event) => setAssistantForm((current) => ({ ...current, assistantId: event.target.value }))} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={assistantForm.description} onChange={(event) => setAssistantForm((current) => ({ ...current, description: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Vapi Phone Number ID</Label><Input value={assistantForm.phoneNumberId} onChange={(event) => setAssistantForm((current) => ({ ...current, phoneNumberId: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>First Message</Label><Input value={assistantForm.firstMessage} onChange={(event) => setAssistantForm((current) => ({ ...current, firstMessage: event.target.value }))} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Objective</Label><Textarea value={assistantForm.objective} onChange={(event) => setAssistantForm((current) => ({ ...current, objective: event.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => void handleCreateAssistant()} disabled={submitting}>Save Assistant</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" />New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-[#e7dfd2] bg-[#f4efe7] p-0 sm:max-w-6xl">
                <DialogHeader className="shrink-0 border-b border-[#e7dfd2] bg-[#f8f3eb] px-6 py-5">
                  <DialogTitle className="text-2xl text-[#1f1b18]">Create AI Call Campaign</DialogTitle>
                  <DialogDescription className="text-[#6f6458]">Pick a saved assistant profile, select leads, and choose delivery mode.</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1fr_0.72fr]">
                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-[#d8ccb9] bg-[#f1e7d9] p-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-[#3e342c]">Campaign Name</Label>
                            <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
                            <p className="text-xs text-[#6f6458]">Give the call motion a clear internal name so it is easy to find later.</p>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-[#3e342c]">Description</Label>
                            <Textarea className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.description} onChange={(event) => setCampaignForm((current) => ({ ...current, description: event.target.value }))} />
                            <p className="text-xs text-[#6f6458]">Optional. Add a short note about the offer, audience, or campaign goal if helpful.</p>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-[#3e342c]">Assistant Profile</Label>
                            <Select value={campaignForm.assistantRefId} onValueChange={(value) => setCampaignForm((current) => ({ ...current, assistantRefId: value }))}>
                              <SelectTrigger className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]">
                                <SelectValue placeholder="Choose a saved or Vapi assistant" />
                              </SelectTrigger>
                              <SelectContent>
                                {assistantOptions.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No saved profiles or Vapi assistants available yet.
                                  </div>
                                ) : (
                                  assistantOptions.map((assistant) => (
                                    <SelectItem key={assistant.value} value={assistant.value}>
                                      {assistant.source === 'saved' ? 'Saved · ' : 'Vapi · '}
                                      {assistant.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-[#6f6458]">
                              {selectedAssistantOption
                                ? selectedAssistantOption.source === 'saved'
                                  ? 'Saved profile selected with its stored assistant and outbound number mapping.'
                                  : selectedAssistantOption.phoneNumberId
                                  ? 'Direct Vapi assistant selected with a linked outbound number.'
                                  : 'Direct Vapi assistant selected. If no linked number is found, the default Vapi phone number will be used.'
                                : 'You can choose either a saved local profile or an assistant returned directly from Vapi.'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Send Mode</Label>
                            <Select value={campaignForm.sendMode} onValueChange={(value) => setCampaignForm((current) => ({ ...current, sendMode: value }))}>
                              <SelectTrigger className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="send_now">Send Now</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="manual">Draft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Timezone</Label>
                            <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.timezone} onChange={(event) => setCampaignForm((current) => ({ ...current, timezone: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Retry Enabled</Label>
                            <Select value={campaignForm.retryEnabled ? 'yes' : 'no'} onValueChange={(value) => setCampaignForm((current) => ({ ...current, retryEnabled: value === 'yes' }))}>
                              <SelectTrigger className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Retry Delay (min)</Label>
                            <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.retryDelayMinutes} onChange={(event) => setCampaignForm((current) => ({ ...current, retryDelayMinutes: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Max Attempts</Label>
                            <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.maxAttempts} onChange={(event) => setCampaignForm((current) => ({ ...current, maxAttempts: event.target.value }))} />
                          </div>
                          {campaignForm.sendMode === 'scheduled' ? (
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-[#3e342c]">Scheduled At</Label>
                              <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" type="datetime-local" value={campaignForm.scheduledAt} onChange={(event) => setCampaignForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-[#ddd3c3] bg-[#fbf7f1] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-[#1f1b18]">Audience</p>
                            <p className="mt-1 text-sm text-[#6f6458]">Search, inspect, and select the leads this AI call campaign should target.</p>
                          </div>
                          <Button variant="outline" className="border-[#d8cbb9] bg-[#fbf7f1] text-[#2e2822] hover:border-[#c9b69b] hover:bg-[#efe5d6] hover:text-[#1f1b18]" onClick={() => setCampaignForm((current) => ({ ...current, leadIds: Array.from(new Set([...current.leadIds, ...filteredLeads.map((lead) => lead.id)])) }))}>
                            Select visible
                          </Button>
                        </div>
                        <div className="mt-5 space-y-3">
                          <div className="space-y-2">
                            <Label className="text-[#3e342c]">Search Leads</Label>
                            <Input className="border-[#d7cab8] bg-[#fffcf8] text-[#1f1b18]" value={campaignForm.search} onChange={(event) => setCampaignForm((current) => ({ ...current, search: event.target.value }))} placeholder="Search by name, company, phone, city" />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-[#e5ddd1] bg-[#fcfaf6] px-4 py-3 text-sm">
                            <span className="text-[#6f6458]">Visible <span className="ml-1 font-semibold text-[#1f1b18]">{filteredLeads.length}</span></span>
                            <span className="h-1 w-1 rounded-full bg-[#cbbba5]" />
                            <span className="text-[#5f6d55]">Callable <span className="ml-1 font-semibold text-[#22311e]">{filteredLeads.filter((lead) => Boolean(lead.phone)).length}</span></span>
                            <span className="h-1 w-1 rounded-full bg-[#cbbba5]" />
                            <span className="text-[#6f6458]">Selected <span className="ml-1 font-semibold text-[#1f1b18]">{campaignForm.leadIds.length}</span></span>
                          </div>
                          <div className="rounded-[24px] border border-[#e3dbcf] bg-[#fcfaf6]">
                            <div className="h-[320px] overflow-y-auto p-3">
                              <div className="space-y-3">
                                {filteredLeads.map((lead) => {
                                  const checked = campaignForm.leadIds.includes(lead.id);
                                  return (
                                    <label key={lead.id} className="flex cursor-pointer items-start gap-3 rounded-[22px] border p-4 transition border-[#e5ddd1] bg-[#fffcf8] hover:bg-[#faf6ef]">
                                      <Checkbox checked={checked} onCheckedChange={(value) => setCampaignForm((current) => ({ ...current, leadIds: value ? [...current.leadIds, lead.id] : current.leadIds.filter((id) => id !== lead.id) }))} />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-medium text-[#1f1b18]">{lead.full_name || lead.company_name || 'Unnamed lead'}</p>
                                          <Badge variant="outline" className={lead.phone ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}>{lead.phone ? 'Callable' : 'Missing phone'}</Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">{lead.phone || 'No phone'} {lead.city ? `· ${lead.city}` : ''} {lead.classification ? `· ${lead.classification.replace(/_/g, ' ')}` : ''}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                      <Card className="overflow-hidden border-[#d9cfbf] bg-[#efe6da] shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-[#1f1b18]">Campaign snapshot</CardTitle>
                          <CardDescription>Only the essentials.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assistant</p>
                            <p className="mt-1 font-medium">{selectedAssistantOption?.label || 'No assistant selected yet'}</p>
                            <p className="mt-1 text-muted-foreground">
                              {selectedAssistantOption
                                ? selectedAssistantOption.source === 'saved'
                                  ? 'Saved profile selected, so assistant and outbound number selection stay consistent.'
                                  : selectedAssistantOption.phoneNumberId
                                  ? 'Direct Vapi assistant selected with its linked outbound number.'
                                  : 'Direct Vapi assistant selected and ready to use with your default outbound number if needed.'
                                : 'Choose either a saved profile or a direct Vapi assistant for this campaign.'}
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery mode</p>
                            <p className="mt-1 font-medium">
                              {campaignForm.sendMode === 'send_now' ? 'Immediate send' : campaignForm.sendMode === 'scheduled' ? 'Scheduled send' : 'Saved as draft'}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {campaignForm.sendMode === 'scheduled' && campaignForm.scheduledAt ? `Scheduled for ${campaignForm.scheduledAt} (${campaignForm.timezone})` : 'You can review retry and audience settings before launch.'}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected leads</p>
                              <p className="mt-1 text-lg font-semibold">{campaignForm.leadIds.length}</p>
                            </div>
                            <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Callable now</p>
                              <p className="mt-1 text-lg font-semibold">{filteredLeads.filter((lead) => campaignForm.leadIds.includes(lead.id) && lead.phone).length}</p>
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Retry policy</p>
                            <p className="mt-1 font-medium">{campaignForm.retryEnabled ? `Enabled, every ${campaignForm.retryDelayMinutes} min, up to ${campaignForm.maxAttempts} attempts` : 'Retries disabled'}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-[#eadfce] bg-[#f6f1e8] shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-[#1f1b18]">Pre-flight notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-[#5d5348]">
                          <div className="rounded-[18px] bg-[#fbf7f1] p-3">Selected leads: <span className="font-semibold">{campaignForm.leadIds.length}</span></div>
                          <div className="rounded-[18px] bg-[#fbf7f1] p-3">Selected callable leads: <span className="font-semibold">{filteredLeads.filter((lead) => campaignForm.leadIds.includes(lead.id) && lead.phone).length}</span></div>
                          <div className="rounded-[18px] bg-[#fbf7f1] p-3">Leads missing phone numbers in current audience: <span className="font-semibold">{filteredLeads.filter((lead) => campaignForm.leadIds.includes(lead.id) && !lead.phone).length}</span></div>
                          <div className="rounded-[18px] bg-[#fbf7f1] p-3">{campaignForm.sendMode === 'scheduled' ? 'Scheduling requires a valid date and time.' : 'Immediate send will start dispatch as soon as the campaign is created.'}</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
                <DialogFooter className="shrink-0 border-t border-[#e7dfd2] bg-[#f4efe7] px-6 py-4">
                  <div className="flex w-full items-center justify-between gap-3">
                    <p className="text-sm text-[#6f6458]">
                      {filteredLeads.filter((lead) => campaignForm.leadIds.includes(lead.id) && lead.phone).length} eligible recipients ready{campaignForm.sendMode === 'scheduled' ? ' for scheduling' : ' for sending'}.
                    </p>
                    <Button className="bg-[#1f1b18] text-white hover:bg-[#2a2521]" onClick={() => void handleCreateCampaign()} disabled={submitting || !canSaveCampaign}>Save Campaign</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="flex items-center gap-3 p-4 text-rose-800"><AlertCircle className="h-5 w-5" /><p>{error}</p></CardContent></Card> : null}

      <div className="flex flex-wrap gap-2">
        <HealthPill title="Vapi API" healthy={Boolean(data?.health.vapiConfigured)} />
        <HealthPill title="Default Assistant" healthy={Boolean(data?.health.defaultAssistantConfigured)} />
        <HealthPill title="Default Number" healthy={Boolean(data?.health.defaultPhoneNumberConfigured)} />
        <HealthPill title="Webhook Activity" healthy={Boolean(data?.health.webhookActive)} />
        <HealthPill title="Assistant Profiles" healthy={Boolean(data?.health.assistantProfilesAvailable)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Campaigns" value={String(data?.health.activeCampaigns ?? 0)} hint="Currently live call motions" icon={Rocket} tone="active" />
        <MetricCard title="Queued Calls" value={String(metrics.queued)} hint="Waiting to be dialed or processed" icon={Timer} tone="pending" />
        <MetricCard title="Answered Calls" value={String(metrics.answered)} hint="Reached a live conversation state" icon={PhoneCall} tone="delivered" />
        <MetricCard title="Interested Outcomes" value={String(metrics.interested)} hint="Calls marked interested so far" icon={Bot} tone="replies" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Callback Queue</p>
            <p className="mt-1 font-headline text-3xl font-bold text-primary">{salesActionMetrics.callbackQueue}</p>
            <p className="mt-1 text-xs text-muted-foreground">Leads that asked for a human callback.</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Warm Leads</p>
            <p className="mt-1 font-headline text-3xl font-bold text-primary">{salesActionMetrics.warmLeads}</p>
            <p className="mt-1 text-xs text-muted-foreground">Interested outcomes ready for WhatsApp or human follow-up.</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Manual Review</p>
            <p className="mt-1 font-headline text-3xl font-bold text-primary">{salesActionMetrics.manualReview}</p>
            <p className="mt-1 text-xs text-muted-foreground">Recipients that likely need retry strategy or rep review.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="workspace">Vapi Links</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/80">
            <CardHeader><CardTitle>Saved Assistant Profiles</CardTitle><CardDescription>Reusable Vapi assistant and outbound number combinations.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {assistants.length === 0 ? <p className="text-sm text-muted-foreground">No assistant profiles yet. Add one to make campaign setup safer.</p> : assistants.map((assistant) => (
                <div key={assistant.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="font-medium text-slate-900">{assistant.name}</p><p className="mt-1 text-sm text-muted-foreground">{assistant.description}</p></div>
                    <Badge variant="outline">{assistant.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <div>Assistant ID: <span className="font-medium text-slate-900">{assistant.assistantId}</span></div>
                    <div>Phone Number ID: <span className="font-medium text-slate-900">{assistant.phoneNumberId}</span></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/80">
            <CardHeader><CardTitle>Campaigns</CardTitle><CardDescription>Live and scheduled AI call campaigns backed by Vapi dispatch.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">No AI call campaigns yet. Create one from the button above.</p> : campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-3xl border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-headline text-xl text-primary">{campaign.name}</p><p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p></div>
                    <Badge variant="outline" className={statusStyles[campaign.status] ?? statusStyles.draft}>{campaign.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Audience</p><p className="font-medium">{campaign.leadCount}</p></div>
                    <div className="rounded-2xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Queued</p><p className="font-medium">{campaign.queuedCount}</p></div>
                    <div className="rounded-2xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Answered</p><p className="font-medium">{campaign.answeredCount}</p></div>
                    <div className="rounded-2xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Failed</p><p className="font-medium">{campaign.failedCount}</p></div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    Retry policy: {campaign.retryEnabled ? `enabled, every ${campaign.retryDelayMinutes || 1440} min up to ${campaign.maxAttempts || 3} attempts` : 'disabled'}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Last dispatch {formatRelative(campaign.lastDispatchedAt)}</span>
                    <span>Last webhook {formatRelative(campaign.lastWebhookAt)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleDispatchCampaign(campaign.id)} disabled={submitting}>Dispatch</Button>
                    {campaign.status === 'paused' ? (
                      <Button size="sm" variant="outline" onClick={() => void handleCampaignAction(campaign.id, 'resume')} disabled={submitting}>Resume</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => void handleCampaignAction(campaign.id, 'pause')} disabled={submitting}>Pause</Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/campaigns/${campaign.id}`}>View Details</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={submitting}>Refresh Metrics</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/10 bg-white/80">
            <CardHeader><CardTitle>Recent Call Outcomes</CardTitle><CardDescription>Recipient-level results captured from Vapi webhooks.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {recipients.length === 0 ? <p className="text-sm text-muted-foreground">Recipient-level call history will appear here after campaigns are launched.</p> : recipients.slice(0, 12).map((recipient) => (
                <div key={recipient.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium text-slate-900">{recipient.phone || 'Unknown number'}</p><p className="mt-1 text-sm text-muted-foreground">Outcome: {String(recipient.outcome || 'unknown').replace(/_/g, ' ')}</p></div>
                    <Badge variant="outline">{recipient.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Last event {formatRelative(recipient.lastEventAt)} {recipient.recordingUrl ? '· recording available' : ''}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/80">
            <CardHeader><CardTitle>Scheduled Jobs</CardTitle><CardDescription>Local queue for future dispatch and retries.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No scheduled jobs are pending right now.</p> : jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border p-4 text-sm">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900">{job.jobType}</p><Badge variant="outline">{job.status}</Badge></div>
                  <p className="mt-2 text-muted-foreground">Runs {formatRelative(job.runAt)} · {job.timezone}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card className="border-white/10 bg-white/80">
            <CardHeader>
              <CardTitle>Configuration Boundary</CardTitle>
              <CardDescription>Assistant design, provider tuning, voice quality, compliance tuning, and model internals should live in Vapi. This workspace stays centered on sales operations and campaign execution.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Button asChild variant="outline" className="justify-start">
                <a href="https://dashboard.vapi.ai/assistants" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Assistants In Vapi
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Phone Numbers
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href="https://dashboard.vapi.ai/tools" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Tools
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-white/10 bg-white/80">
              <CardHeader>
                <CardTitle>Assistant References</CardTitle>
                <CardDescription>Read-only visibility into which assistants exist in Vapi and which ones your campaigns are using.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {remoteAssistants.length === 0 ? <p className="text-sm text-muted-foreground">No remote assistants were returned from Vapi.</p> : remoteAssistants.slice(0, 20).map((assistant) => (
                  <div key={assistant.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{assistant.name || assistant.id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{assistant.firstMessage || 'No first message configured.'}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <a href={`https://dashboard.vapi.ai/assistants/${assistant.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open In Vapi
                        </a>
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <div>Model: <span className="font-medium text-slate-900">{assistant.model?.provider} / {assistant.model?.model}</span></div>
                      <div>Voice: <span className="font-medium text-slate-900">{assistant.voice?.provider} / {assistant.voice?.voiceId}</span></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/80">
              <CardHeader>
                <CardTitle>Phone Numbers</CardTitle>
                <CardDescription>Read-only visibility into the outbound phone numbers configured in Vapi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {remotePhoneNumbers.length === 0 ? <p className="text-sm text-muted-foreground">No phone numbers returned from Vapi.</p> : remotePhoneNumbers.slice(0, 20).map((phoneNumber) => (
                  <div key={phoneNumber.id} className="rounded-2xl border p-4 text-sm">
                    <p className="font-medium text-slate-900">{phoneNumber.name || phoneNumber.number || phoneNumber.id}</p>
                    <p className="mt-1 text-muted-foreground">{phoneNumber.provider} · {phoneNumber.status || 'unknown status'}</p>
                    <p className="mt-1 text-muted-foreground">Assistant {phoneNumber.assistantId || 'unassigned'}</p>
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Manage In Vapi
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-white/10 bg-white/80">
              <CardHeader>
                <CardTitle>Tools</CardTitle>
                <CardDescription>Reference what tools exist in Vapi without turning this page into an assistant builder.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {remoteTools.length === 0 ? <p className="text-sm text-muted-foreground">No tools returned from Vapi.</p> : remoteTools.slice(0, 24).map((tool) => (
                  <div key={tool.id} className="rounded-2xl border p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-900">{tool.name || tool.type || tool.id}</p>
                      <Badge variant="outline">{tool.type || 'tool'}</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">{tool.url || tool.description || 'No additional detail exposed by the API response.'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/80">
              <CardHeader>
                <CardTitle>Recent Vapi Calls</CardTitle>
                <CardDescription>Reference-level visibility into recent calls while campaign operations stay here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {remoteCalls.length === 0 ? <p className="text-sm text-muted-foreground">No recent calls returned from Vapi.</p> : remoteCalls.slice(0, 20).map((call) => (
                  <div key={call.id} className="rounded-2xl border p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-900">{call.name || call.id}</p>
                      <Badge variant="outline">{call.status || call.type || 'call'}</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">{call.customer?.number || call.customer?.name || 'Unknown customer'} · {call.phoneNumberId || 'No phoneNumberId'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
