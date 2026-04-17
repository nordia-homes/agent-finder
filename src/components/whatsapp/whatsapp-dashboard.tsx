'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot,
  CalendarClock,
  CheckCheck,
  MessageCircleReply,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Timer,
  TriangleAlert,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useWhatsAppDashboard } from '@/hooks/use-whatsapp-dashboard';
import { cn } from '@/lib/utils';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type TimestampLike = {
  _seconds?: number;
  seconds?: number;
  toDate?: () => Date;
} | null | undefined;

type DashboardLead = {
  id: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  city?: string;
};

type DashboardPayload = {
  templates: Array<Record<string, any>>;
  campaigns: Array<Record<string, any>>;
  automations: Array<Record<string, any>>;
  conversations: Array<Record<string, any>>;
  leads: DashboardLead[];
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

const templateStatusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  submitted: 'bg-amber-100 text-amber-900 border-amber-200',
  pending_approval: 'bg-amber-100 text-amber-900 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  paused: 'bg-zinc-200 text-zinc-900 border-zinc-300',
};

const campaignStatusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-100 text-amber-900 border-amber-200',
  completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-white/10 bg-white/70 backdrop-blur">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold font-headline text-primary">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function WhatsAppDashboard() {
  const { toast } = useToast();
  const { data, loading, error, refresh } = useWhatsAppDashboard<DashboardPayload>();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    language: 'en',
    category: 'MARKETING',
    headerType: 'NONE',
    headerText: '',
    bodyText: '',
    footerText: '',
    sampleValues: '',
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    templateId: '',
    sendMode: 'send_now',
    scheduledAt: '',
    timezone: 'Europe/Bucharest',
    leadIds: [] as string[],
  });

  const [automationForm, setAutomationForm] = useState({
    name: '',
    description: '',
    templateId: '',
    triggerType: 'scheduled',
    schedule: '0 9 * * 1',
    delayMinutes: '60',
    timezone: 'Europe/Bucharest',
  });

  const metrics = useMemo(() => {
    const campaigns = data?.campaigns ?? [];
    const templates = data?.templates ?? [];
    return {
      activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
      delivered: campaigns.reduce((sum, campaign) => sum + Number(campaign.deliveredCount ?? 0), 0),
      seen: campaigns.reduce((sum, campaign) => sum + Number(campaign.seenCount ?? 0), 0),
      replies: campaigns.reduce((sum, campaign) => sum + Number(campaign.replyCount ?? 0), 0),
      pendingTemplates: templates.filter((template) =>
        ['submitted', 'pending_approval'].includes(template.status)
      ).length,
    };
  }, [data]);

  async function postJson(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  async function handleCreateTemplate() {
    setSubmitting(true);
    try {
      await postJson('/api/whatsapp/templates', {
        ...templateForm,
        sampleValues: templateForm.sampleValues.split('\n').map((item) => item.trim()).filter(Boolean),
      });
      toast({
        title: 'Template created',
        description: 'Template saved locally. Submit it for Infobip approval when you are ready.',
      });
      setTemplateDialogOpen(false);
      setTemplateForm({
        name: '',
        language: 'en',
        category: 'MARKETING',
        headerType: 'NONE',
        headerText: '',
        bodyText: '',
        footerText: '',
        sampleValues: '',
      });
      await refresh();
    } catch (requestError) {
      toast({
        title: 'Template creation failed',
        description: requestError instanceof Error ? requestError.message : 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCampaign() {
    setSubmitting(true);
    try {
      await postJson('/api/whatsapp/campaigns', {
        ...campaignForm,
        scheduledAt: campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : undefined,
      });
      toast({
        title: 'Campaign created',
        description:
          campaignForm.sendMode === 'send_now'
            ? 'Campaign was created and sent immediately.'
            : 'Campaign was saved with the selected schedule.',
      });
      setCampaignDialogOpen(false);
      setCampaignForm({
        name: '',
        description: '',
        templateId: '',
        sendMode: 'send_now',
        scheduledAt: '',
        timezone: 'Europe/Bucharest',
        leadIds: [],
      });
      await refresh();
    } catch (requestError) {
      toast({
        title: 'Campaign creation failed',
        description: requestError instanceof Error ? requestError.message : 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAutomation() {
    setSubmitting(true);
    try {
      await postJson('/api/whatsapp/automations', {
        ...automationForm,
        delayMinutes: Number(automationForm.delayMinutes),
      });
      toast({
        title: 'Automation created',
        description: 'Automation was saved and is ready to be connected to the dispatcher.',
      });
      setAutomationDialogOpen(false);
      setAutomationForm({
        name: '',
        description: '',
        templateId: '',
        triggerType: 'scheduled',
        schedule: '0 9 * * 1',
        delayMinutes: '60',
        timezone: 'Europe/Bucharest',
      });
      await refresh();
    } catch (requestError) {
      toast({
        title: 'Automation creation failed',
        description: requestError instanceof Error ? requestError.message : 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTemplateAction(templateId: string, action: 'submit' | 'sync') {
    setSubmitting(true);
    try {
      await postJson(`/api/whatsapp/templates/${templateId}/${action}`);
      toast({
        title: action === 'submit' ? 'Template submitted' : 'Template synced',
        description:
          action === 'submit'
            ? 'The template was sent to Infobip for approval.'
            : 'The latest Infobip status was pulled into the dashboard.',
      });
      await refresh();
    } catch (requestError) {
      toast({
        title: 'Template action failed',
        description: requestError instanceof Error ? requestError.message : 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispatchCampaign(campaignId: string) {
    setSubmitting(true);
    try {
      await postJson(`/api/whatsapp/campaigns/${campaignId}/dispatch`);
      toast({
        title: 'Campaign dispatched',
        description: 'Queued recipients were sent to Infobip.',
      });
      await refresh();
    } catch (requestError) {
      toast({
        title: 'Campaign dispatch failed',
        description: requestError instanceof Error ? requestError.message : 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-900">
            <TriangleAlert className="h-5 w-5" />
            WhatsApp dashboard unavailable
          </CardTitle>
          <CardDescription className="text-rose-800">
            {error ?? 'The dashboard could not be loaded.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refresh()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Active Campaigns" value={String(metrics.activeCampaigns)} hint="Campaigns currently sending or waiting for webhook updates" icon={Target} />
        <MetricCard title="Pending Templates" value={String(metrics.pendingTemplates)} hint="Templates waiting for Infobip or WhatsApp approval" icon={Sparkles} />
        <MetricCard title="Delivered" value={String(metrics.delivered)} hint="Messages marked as delivered by provider webhooks" icon={Send} />
        <MetricCard title="Seen" value={String(metrics.seen)} hint="Recipients that opened WhatsApp messages" icon={CheckCheck} />
        <MetricCard title="Replies" value={String(metrics.replies)} hint="Inbound replies captured by your webhook" icon={MessageCircleReply} />
      </div>

      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">WhatsApp Campaign Operating Center</CardTitle>
            <CardDescription className="max-w-3xl text-slate-300">
              Manage approval-ready templates, build audience-based campaigns from existing leads, and define scheduled or automated follow-up flows through Infobip.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refresh()} disabled={submitting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Sparkles className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create WhatsApp Template</DialogTitle>
                  <DialogDescription>Save the template locally first, then submit it to Infobip for approval.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template name</Label>
                    <Input id="template-name" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} placeholder="new_listing_follow_up" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={templateForm.category} onValueChange={(value) => setTemplateForm((current) => ({ ...current, category: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input value={templateForm.language} onChange={(event) => setTemplateForm((current) => ({ ...current, language: event.target.value }))} placeholder="en" />
                  </div>
                  <div className="space-y-2">
                    <Label>Header type</Label>
                    <Select value={templateForm.headerType} onValueChange={(value) => setTemplateForm((current) => ({ ...current, headerType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No header</SelectItem>
                        <SelectItem value="TEXT">Text header</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {templateForm.headerType === 'TEXT' ? (
                  <div className="space-y-2">
                    <Label>Header text</Label>
                    <Input value={templateForm.headerText} onChange={(event) => setTemplateForm((current) => ({ ...current, headerText: event.target.value }))} placeholder="Nordia Homes" />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Body text</Label>
                  <Textarea rows={6} value={templateForm.bodyText} onChange={(event) => setTemplateForm((current) => ({ ...current, bodyText: event.target.value }))} placeholder="Hello {{1}}, we prepared a quick update for {{2}} in {{3}}." />
                </div>
                <div className="space-y-2">
                  <Label>Footer text</Label>
                  <Input value={templateForm.footerText} onChange={(event) => setTemplateForm((current) => ({ ...current, footerText: event.target.value }))} placeholder="Reply here if you want the full details." />
                </div>
                <div className="space-y-2">
                  <Label>Sample variable values</Label>
                  <Textarea rows={4} value={templateForm.sampleValues} onChange={(event) => setTemplateForm((current) => ({ ...current, sampleValues: event.target.value }))} placeholder={'Cristian\nNordia Homes\nBucharest'} />
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleCreateTemplate()} disabled={submitting}>Save Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-slate-950 hover:bg-slate-100">
                  <Send className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create WhatsApp Campaign</DialogTitle>
                  <DialogDescription>Choose an approved template, select existing leads, then send immediately or schedule delivery.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Campaign name</Label>
                    <Input value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} placeholder="Q2 Reactivation - Approved WA Template" />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={campaignForm.templateId} onValueChange={(value) => setCampaignForm((current) => ({ ...current, templateId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                      <SelectContent>
                        {data.templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.name} ({template.status})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={3} value={campaignForm.description} onChange={(event) => setCampaignForm((current) => ({ ...current, description: event.target.value }))} placeholder="Send a compliant follow-up to high-intent leads collected this week." />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Send mode</Label>
                    <Select value={campaignForm.sendMode} onValueChange={(value) => setCampaignForm((current) => ({ ...current, sendMode: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_now">Send now</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="manual">Save as draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input value={campaignForm.timezone} onChange={(event) => setCampaignForm((current) => ({ ...current, timezone: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled at</Label>
                    <Input type="datetime-local" value={campaignForm.scheduledAt} onChange={(event) => setCampaignForm((current) => ({ ...current, scheduledAt: event.target.value }))} disabled={campaignForm.sendMode !== 'scheduled'} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Choose leads</Label>
                    <span className="text-xs text-muted-foreground">{campaignForm.leadIds.length} selected</span>
                  </div>
                  <ScrollArea className="h-56 rounded-xl border p-3">
                    <div className="space-y-3">
                      {data.leads.map((lead) => {
                        const checked = campaignForm.leadIds.includes(lead.id);
                        return (
                          <label key={lead.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-muted/50">
                            <Checkbox checked={checked} onCheckedChange={(value) => setCampaignForm((current) => ({ ...current, leadIds: value ? [...current.leadIds, lead.id] : current.leadIds.filter((id) => id !== lead.id) }))} />
                            <div className="space-y-1">
                              <p className="font-medium">{lead.full_name || lead.company_name || 'Unnamed lead'}</p>
                              <p className="text-sm text-muted-foreground">{lead.phone || 'No phone'} {lead.city ? `· ${lead.city}` : ''}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleCreateCampaign()} disabled={submitting}>Save Campaign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  <Bot className="mr-2 h-4 w-4" />
                  New Automation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create WhatsApp Automation</DialogTitle>
                  <DialogDescription>Store the rule now, then connect it to your scheduled dispatcher in production.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={automationForm.name} onChange={(event) => setAutomationForm((current) => ({ ...current, name: event.target.value }))} placeholder="No reply follow-up" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={3} value={automationForm.description} onChange={(event) => setAutomationForm((current) => ({ ...current, description: event.target.value }))} placeholder="If the lead does not reply within 48h, queue the approved reminder template." />
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={automationForm.templateId} onValueChange={(value) => setAutomationForm((current) => ({ ...current, templateId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                    <SelectContent>
                      {data.templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Trigger type</Label>
                    <Select value={automationForm.triggerType} onValueChange={(value) => setAutomationForm((current) => ({ ...current, triggerType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="reply_missing">No reply</SelectItem>
                        <SelectItem value="lead_status_changed">Lead status changed</SelectItem>
                        <SelectItem value="demo_booked">Demo booked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delay minutes</Label>
                    <Input value={automationForm.delayMinutes} onChange={(event) => setAutomationForm((current) => ({ ...current, delayMinutes: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Schedule expression</Label>
                  <Input value={automationForm.schedule} onChange={(event) => setAutomationForm((current) => ({ ...current, schedule: event.target.value }))} placeholder="0 9 * * 1" />
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleCreateAutomation()} disabled={submitting}>Save Automation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="conversations">Live Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.templates.length === 0 ? (
              <EmptyState title="No WhatsApp templates yet" description="Create the first template, store it locally, then submit it for Infobip approval." />
            ) : (
              data.templates.map((template) => (
                <Card key={template.id} className="border-white/10 bg-white/80">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-xl">{template.name}</CardTitle>
                        <CardDescription>{template.category} · {template.language} · updated {formatRelative(template.updatedAt)}</CardDescription>
                      </div>
                      <Badge variant="outline" className={cn(templateStatusStyles[template.status])}>{template.status}</Badge>
                    </div>
                    <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{template.bodyText}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(template.variables ?? []).map((variable: Record<string, string>) => (
                        <Badge key={variable.key} variant="secondary">{variable.key}: {variable.sample}</Badge>
                      ))}
                    </div>
                    {template.rejectionReason ? <p className="text-sm text-rose-600">Rejection reason: {template.rejectionReason}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void handleTemplateAction(template.id, 'submit')} disabled={submitting}>Submit for Approval</Button>
                      <Button size="sm" variant="outline" onClick={() => void handleTemplateAction(template.id, 'sync')} disabled={submitting}>Sync Status</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.campaigns.length === 0 ? (
              <EmptyState title="No WhatsApp campaigns yet" description="Create a campaign from an approved template and your existing leads." />
            ) : (
              data.campaigns.map((campaign) => (
                <Card key={campaign.id} className="border-white/10 bg-white/80">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-xl">{campaign.name}</CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className={cn(campaignStatusStyles[campaign.status])}>{campaign.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Template</p><p className="font-medium">{campaign.templateName}</p></div>
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Audience</p><p className="font-medium">{campaign.leadCount} leads</p></div>
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Delivered</p><p className="font-medium">{campaign.deliveredCount ?? 0}</p></div>
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Replies</p><p className="font-medium">{campaign.replyCount ?? 0}</p></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last dispatch {formatRelative(campaign.lastDispatchedAt)}</span>
                      <span>{campaign.scheduledAt ? `Scheduled ${formatRelative(campaign.scheduledAt)}` : 'No schedule'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void handleDispatchCampaign(campaign.id)} disabled={submitting}>Dispatch Queue</Button>
                      <Button size="sm" variant="outline" onClick={() => void refresh()}>Refresh Metrics</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.automations.length === 0 ? (
              <EmptyState title="No automations configured" description="Create rule-based flows for reminders, follow-ups, and post-demo messages." />
            ) : (
              data.automations.map((automation) => (
                <Card key={automation.id} className="border-white/10 bg-white/80">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-xl">{automation.name}</CardTitle>
                        <CardDescription>{automation.description}</CardDescription>
                      </div>
                      <Badge variant="outline">{automation.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Trigger</p><p className="font-medium">{automation.triggerType}</p></div>
                      <div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Delay</p><p className="font-medium">{automation.delayMinutes ?? 0} min</p></div>
                      <div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Schedule</p><p className="font-medium">{automation.schedule || 'Event-driven'}</p></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Timezone: {automation.timezone} · updated {formatRelative(automation.updatedAt)}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          {data.conversations.length === 0 ? (
            <EmptyState title="No live conversations yet" description="Once webhook events start arriving, active WhatsApp threads will appear here." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.conversations.map((conversation) => (
                <Card key={conversation.id} className="border-white/10 bg-white/80">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-xl">{conversation.phone}</CardTitle>
                        <CardDescription>Session closes {formatRelative(conversation.sessionWindowClosesAt)}</CardDescription>
                      </div>
                      <Badge variant="outline">{conversation.unreadCount ?? 0} unread</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{conversation.lastMessagePreview || 'No preview available yet.'}</p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Timer className="h-4 w-4" />Last outbound {formatRelative(conversation.lastOutboundAt)}</div>
                      <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />Last inbound {formatRelative(conversation.lastInboundAt)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
