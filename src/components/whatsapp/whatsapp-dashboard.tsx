'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import {
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  FileText,
  Filter,
  MessageCircleReply,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TriangleAlert,
  Video,
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

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | null | undefined;
type DashboardLead = { id: string; full_name?: string; company_name?: string; phone?: string; city?: string; classification?: string; independent_score?: number; owner_id?: string; lead_status?: string; };
type DashboardRecord = Record<string, any>;
type DashboardPayload = {
  health: { infobipConfigured: boolean; senderConfigured: boolean; webhookActive: boolean; approvedTemplatesAvailable: boolean; schedulerActive: boolean; campaignsNeedAttention: boolean; };
  templates: DashboardRecord[];
  campaigns: DashboardRecord[];
  automations: DashboardRecord[];
  conversations: DashboardRecord[];
  leads: DashboardLead[];
  events: DashboardRecord[];
  scheduledJobs: DashboardRecord[];
};
type TabKey = 'overview' | 'templates' | 'campaigns' | 'automations' | 'conversations';
type TemplateVariableForm = { key: string; index: number; label: string; sample: string; sourceField?: string };
type TemplateButtonForm = { type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; payload?: string };

const HEADER_MEDIA_TYPES = ['IMAGE', 'DOCUMENT', 'VIDEO'] as const;
const VARIABLE_SOURCE_OPTIONS = [
  { value: 'full_name', label: 'Lead full name' },
  { value: 'company_name', label: 'Company name' },
  { value: 'city', label: 'City' },
  { value: 'phone', label: 'Phone number' },
  { value: 'classification', label: 'Classification' },
  { value: 'owner_id', label: 'Owner' },
  { value: 'independent_score', label: 'Independent score' },
] as const;
const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]+$/;
const MAX_TEMPLATE_BUTTONS = 3;
const HEADER_TEXT_MAX_LENGTH = 60;
const FOOTER_TEXT_MAX_LENGTH = 60;
const BUTTON_TEXT_MAX_LENGTH = 25;
const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Nou' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'contacted', label: 'Contactat' },
  { value: 'replied', label: 'A raspuns' },
  { value: 'demo_booked', label: 'Demo booked' },
  { value: 'closed_won', label: 'Closed won' },
  { value: 'closed_lost', label: 'Closed lost' },
  { value: 'not_relevant', label: 'Not relevant' },
] as const;

function extractPlaceholderIndexes(bodyText: string) {
  const matches = bodyText.match(/{{\d+}}/g) ?? [];
  return Array.from(new Set(matches.map((token) => Number(token.replace(/[{}]/g, ''))))).sort((a, b) => a - b);
}

function createDefaultVariables() {
  return [
    { key: '{{1}}', index: 1, label: 'First name', sample: 'Cristian', sourceField: 'full_name' },
    { key: '{{2}}', index: 2, label: 'Company name', sample: 'Nordia Homes', sourceField: 'company_name' },
    { key: '{{3}}', index: 3, label: 'City', sample: 'Bucharest', sourceField: 'city' },
  ] as TemplateVariableForm[];
}

function createDefaultButtons() {
  return [{ type: 'QUICK_REPLY', text: 'Profita de Accesul Gratuit', payload: 'FREE_ACCESS' }] as TemplateButtonForm[];
}

function getLeadFieldValue(lead: DashboardLead | null, sourceField?: string) {
  if (!lead || !sourceField) return '';
  const value = lead[sourceField as keyof DashboardLead];
  return value == null ? '' : String(value);
}

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

function parseScheduledDateTime(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function buildScheduledDateTime(dateValue: string, timeValue: string) {
  if (!dateValue) return '';
  return `${dateValue}T${timeValue || '09:00'}`;
}

function buildSchedulingDateOptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 90 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'dd MMM yyyy'),
    };
  });
}

function buildSchedulingTimeOptions() {
  const options: Array<{ value: string; label: string }> = [];

  for (let hour = 8; hour <= 20; hour += 1) {
    for (const minutes of [0, 15, 30, 45]) {
      const value = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      options.push({ value, label: value });
    }
  }

  return options;
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

const metricStyles: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50/80',
  pending: 'border-amber-200 bg-amber-50/80',
  delivered: 'border-sky-200 bg-sky-50/80',
  seen: 'border-indigo-200 bg-indigo-50/80',
  replies: 'border-teal-200 bg-teal-50/80',
};

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center"><p className="font-medium">{title}</p><p className="mt-2 text-sm text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

function HealthPill({ label, healthy, detail }: { label: string; healthy: boolean; detail: string }) {
  return (
    <div className={cn('rounded-full border px-3 py-2 text-xs font-medium', healthy ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
      <div className="flex items-center gap-2">{healthy ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}<span>{label}</span></div>
      <p className="mt-1 text-[11px] opacity-80">{detail}</p>
    </div>
  );
}

function MetricCard({ title, value, hint, icon: Icon, tone, onClick }: { title: string; value: string; hint: string; icon: React.ElementType; tone: keyof typeof metricStyles; onClick: () => void; }) {
  return <button type="button" onClick={onClick} className="text-left"><Card className={cn('transition hover:-translate-y-0.5 hover:shadow-md', metricStyles[tone])}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-bold font-headline text-primary">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div><div className="rounded-2xl bg-white/70 p-3"><Icon className="h-5 w-5 text-primary" /></div></CardContent></Card></button>;
}

export function WhatsAppDashboard() {
  const { toast } = useToast();
  const { data, loading, error, refresh } = useWhatsAppDashboard<DashboardPayload>();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'draft'>('all');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'scheduled' | 'draft' | 'attention'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [previewLeadId, setPreviewLeadId] = useState('');
  const [templateForm, setTemplateForm] = useState({
    name: '',
    language: 'en',
    category: 'MARKETING',
    headerType: 'NONE',
    headerText: '',
    headerMediaUrl: '',
    bodyText: '',
    footerText: '',
    sampleValues: '',
    variables: createDefaultVariables(),
    buttons: createDefaultButtons(),
  });
  const [campaignForm, setCampaignForm] = useState({ name: '', description: '', templateId: '', sendMode: 'send_now', scheduledAt: '', timezone: 'Europe/Bucharest', leadIds: [] as string[], search: '', city: 'all', classification: 'all', statuses: [] as string[] });
  const [automationForm, setAutomationForm] = useState({ name: '', description: '', templateId: '', triggerType: 'scheduled', schedule: '0 9 * * 1', delayMinutes: '60', timezone: 'Europe/Bucharest' });

  const leads = data?.leads ?? [];
  const templates = data?.templates ?? [];
  const campaigns = data?.campaigns ?? [];
  const automations = data?.automations ?? [];
  const conversations = data?.conversations ?? [];
  const events = data?.events ?? [];
  const scheduledJobs = data?.scheduledJobs ?? [];
  const previewLead = useMemo(() => leads.find((lead) => lead.id === previewLeadId) ?? leads[0] ?? null, [leads, previewLeadId]);
  const selectedCampaignTemplate = useMemo(
    () => templates.find((template) => template.id === campaignForm.templateId) ?? null,
    [campaignForm.templateId, templates]
  );
  const selectedLeadStatusLabels = useMemo(
    () =>
      LEAD_STATUS_OPTIONS.filter((option) => campaignForm.statuses.includes(option.value)).map((option) => option.label),
    [campaignForm.statuses]
  );
  const scheduledDateValue = useMemo(() => parseScheduledDateTime(campaignForm.scheduledAt), [campaignForm.scheduledAt]);
  const scheduledDateInputValue = useMemo(
    () => (scheduledDateValue ? format(scheduledDateValue, 'yyyy-MM-dd') : ''),
    [scheduledDateValue]
  );
  const scheduledTimeInputValue = useMemo(
    () => (scheduledDateValue ? format(scheduledDateValue, 'HH:mm') : '09:00'),
    [scheduledDateValue]
  );
  const scheduledDateDisplayValue = useMemo(
    () => (scheduledDateValue ? format(scheduledDateValue, 'dd MMM yyyy, HH:mm') : ''),
    [scheduledDateValue]
  );
  const schedulingDateOptions = useMemo(() => buildSchedulingDateOptions(), []);
  const schedulingTimeOptions = useMemo(() => buildSchedulingTimeOptions(), []);
  const cities = useMemo(() => Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean))) as string[], [leads]);
  const metrics = useMemo(() => ({ activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length, pendingTemplates: templates.filter((template) => ['submitted', 'pending_approval'].includes(template.status)).length, delivered: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.deliveredCount), 0), seen: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.seenCount), 0), replies: campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.replyCount), 0) }), [campaigns, templates]);
  const filteredAudienceLeads = useMemo(() => {
    const search = campaignForm.search.toLowerCase();
    return leads.filter((lead) => {
      const searchable = `${lead.full_name ?? ''} ${lead.company_name ?? ''} ${lead.phone ?? ''}`.toLowerCase();
      const statusMatches = campaignForm.statuses.length === 0 || (lead.lead_status ? campaignForm.statuses.includes(lead.lead_status) : false);
      return (!search || searchable.includes(search)) && (campaignForm.city === 'all' || lead.city === campaignForm.city) && (campaignForm.classification === 'all' || lead.classification === campaignForm.classification) && statusMatches;
    });
  }, [campaignForm, leads]);
  const audienceStats = useMemo(() => {
    const selectedLeads = leads.filter((lead) => campaignForm.leadIds.includes(lead.id));
    const eligibleVisible = filteredAudienceLeads.filter((lead) => Boolean(lead.phone));
    const selectedEligible = selectedLeads.filter((lead) => Boolean(lead.phone));
    const selectedMissingStatus = selectedLeads.filter((lead) => campaignForm.statuses.length > 0 && (!lead.lead_status || !campaignForm.statuses.includes(lead.lead_status))).length;
    return { totalVisible: filteredAudienceLeads.length, eligibleVisible: eligibleVisible.length, selected: selectedLeads.length, selectedEligible: selectedEligible.length, selectedMissingPhone: selectedLeads.length - selectedEligible.length, selectedOutsideStatus: selectedMissingStatus };
  }, [campaignForm.leadIds, filteredAudienceLeads, leads]);
  const filteredTemplates = useMemo(() => templateFilter === 'all' ? templates : templateFilter === 'pending' ? templates.filter((template) => ['submitted', 'pending_approval'].includes(template.status)) : templates.filter((template) => template.status === templateFilter), [templateFilter, templates]);
  const filteredCampaigns = useMemo(() => campaignFilter === 'all' ? campaigns : campaignFilter === 'attention' ? campaigns.filter((campaign) => safeNumber(campaign.failedCount) > 0) : campaigns.filter((campaign) => campaign.status === campaignFilter), [campaignFilter, campaigns]);
  const filteredConversations = useMemo(() => !inboxSearch.trim() ? conversations : conversations.filter((conversation) => `${conversation.phone ?? ''} ${conversation.lastMessagePreview ?? ''}`.toLowerCase().includes(inboxSearch.toLowerCase())), [conversations, inboxSearch]);
  const warnings = useMemo(() => {
    const result: Array<{ title: string; body: string }> = [];
    if (!data?.health.infobipConfigured) result.push({ title: 'Infobip configuration incomplete', body: 'Add the Infobip base URL, API key, and sender before launching production campaigns.' });
    if (!data?.health.webhookActive) result.push({ title: 'Webhook activity not detected', body: 'No Infobip webhook events were found yet. Delivery and reply tracking may still be inactive.' });
    if (!data?.health.approvedTemplatesAvailable) result.push({ title: 'No approved templates available', body: 'Create a template and submit it for approval before scheduling or sending WhatsApp campaigns.' });
    if (campaigns.some((campaign) => safeNumber(campaign.failedCount) > 0)) result.push({ title: 'One or more campaigns have failures', body: 'Review failed recipients and retry or adjust the affected campaign before scaling outreach.' });
    return result;
  }, [campaigns, data]);
  const onboardingSteps = useMemo(() => [{ label: 'Create first template', done: templates.length > 0 }, { label: 'Get an approved template', done: templates.some((template) => template.status === 'approved') }, { label: 'Create first campaign', done: campaigns.length > 0 }, { label: 'Receive webhook activity', done: events.some((event) => event.source === 'infobip_webhook') }], [campaigns, events, templates]);
  const scheduledToday = useMemo(() => scheduledJobs.filter((job) => { const date = asDate(job.runAt); return date ? isToday(date) : false; }), [scheduledJobs]);
  const templatePreviewText = useMemo(() => {
    let preview = templateForm.bodyText;
    for (const variable of templateForm.variables) {
      preview = preview.replaceAll(variable.key, getLeadFieldValue(previewLead, variable.sourceField) || variable.sample);
    }
    return preview;
  }, [previewLead, templateForm.bodyText, templateForm.variables]);

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateForm({
      name: '',
      language: 'en',
      category: 'MARKETING',
      headerType: 'NONE',
      headerText: '',
      headerMediaUrl: '',
      bodyText: '',
      footerText: '',
      sampleValues: '',
      variables: createDefaultVariables(),
      buttons: createDefaultButtons(),
    });
  }

  function renderTemplateBody(
    bodyText: string,
    variables: Array<{ key: string; sample?: string; sourceField?: string }> = []
  ) {
    let preview = bodyText || '';
    for (const variable of variables) {
      preview = preview.replaceAll(variable.key, getLeadFieldValue(previewLead, variable.sourceField) || variable.sample || variable.key);
    }
    return preview;
  }

  async function handleTemplateMediaUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/whatsapp/media-upload', {
        method: 'POST',
        body: uploadFormData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to upload media.');
      }

      setTemplateForm((current) => ({ ...current, headerMediaUrl: payload.url }));
      toast({ title: 'Media uploaded', description: 'Header media was uploaded and attached to the template.' });
    } catch (uploadError) {
      toast({
        title: 'Upload failed',
        description: uploadError instanceof Error ? uploadError.message : 'Unable to upload the selected file.',
        variant: 'destructive',
      });
    } finally {
      setMediaUploading(false);
      event.target.value = '';
    }
  }

  function updateTemplateVariable(index: number, changes: Partial<TemplateVariableForm>) {
    setTemplateForm((current) => ({
      ...current,
      variables: current.variables.map((item, itemIdx) => {
        if (itemIdx !== index) return item;
        const next = { ...item, ...changes };
        if (changes.sourceField !== undefined) {
          const mappedValue = getLeadFieldValue(previewLead, changes.sourceField) || next.sample;
          return { ...next, sample: mappedValue };
        }
        return next;
      }),
    }));
  }

  async function requestJson(method: 'POST' | 'PATCH', url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  async function handleCreateTemplate() {
    const trimmedName = templateForm.name.trim();
    const trimmedBody = templateForm.bodyText.trim();
    const activeButtons = templateForm.buttons.filter((button) => button.text.trim());
    const placeholderIndexes = extractPlaceholderIndexes(templateForm.bodyText);
    const variableIndexes = templateForm.variables.map((variable) => variable.index).sort((a, b) => a - b);
    if (!trimmedName || !TEMPLATE_NAME_PATTERN.test(trimmedName)) {
      toast({
        title: 'Template name invalid',
        description: 'Use only lowercase letters, numbers, and underscores for the WhatsApp template name.',
        variant: 'destructive',
      });
      return;
    }
    if (!trimmedBody) {
      toast({
        title: 'Body text required',
        description: 'WhatsApp templates need body text before they can be saved.',
        variant: 'destructive',
      });
      return;
    }
    if (templateForm.headerType === 'TEXT' && templateForm.headerText.trim().length > HEADER_TEXT_MAX_LENGTH) {
      toast({
        title: 'Header too long',
        description: `Text headers should stay within ${HEADER_TEXT_MAX_LENGTH} characters.`,
        variant: 'destructive',
      });
      return;
    }
    if (templateForm.footerText.trim().length > FOOTER_TEXT_MAX_LENGTH) {
      toast({
        title: 'Footer too long',
        description: `Footer text should stay within ${FOOTER_TEXT_MAX_LENGTH} characters.`,
        variant: 'destructive',
      });
      return;
    }
    if (HEADER_MEDIA_TYPES.includes(templateForm.headerType as (typeof HEADER_MEDIA_TYPES)[number]) && !templateForm.headerMediaUrl.trim()) {
      toast({
        title: 'Media header required',
        description: 'Upload a file or provide a direct media URL for image, document, or video headers.',
        variant: 'destructive',
      });
      return;
    }
    if (placeholderIndexes.join(',') !== variableIndexes.join(',')) {
      toast({
        title: 'Variables do not match body placeholders',
        description: 'Keep the variable list aligned with the placeholders used in the body text.',
        variant: 'destructive',
      });
      return;
    }
    if (activeButtons.length > MAX_TEMPLATE_BUTTONS) {
      toast({
        title: 'Too many buttons',
        description: `WhatsApp templates support up to ${MAX_TEMPLATE_BUTTONS} buttons.`,
        variant: 'destructive',
      });
      return;
    }
    for (const button of activeButtons) {
      if (button.text.trim().length > BUTTON_TEXT_MAX_LENGTH) {
        toast({
          title: 'Button label too long',
          description: `Keep each button label within ${BUTTON_TEXT_MAX_LENGTH} characters.`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'URL' && !button.url?.trim()) {
        toast({
          title: 'Website URL required',
          description: `Add a URL for the "${button.text}" website button.`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'URL' && button.url?.trim() && !/^https?:\/\//i.test(button.url.trim())) {
        toast({
          title: 'Website URL invalid',
          description: `The "${button.text}" website button needs a full http or https URL.`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'PHONE_NUMBER' && !button.payload?.trim()) {
        toast({
          title: 'Phone number required',
          description: `Add a phone number for the "${button.text}" call button.`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'QUICK_REPLY' && !button.payload?.trim()) {
        toast({
          title: 'Quick reply payload required',
          description: `Add a payload for the "${button.text}" quick reply button.`,
          variant: 'destructive',
        });
        return;
      }
    }
    if (templateForm.variables.some((variable) => !variable.sample.trim())) {
      toast({
        title: 'Sample values required',
        description: 'Each template variable needs a sample value for approval preview and campaign mapping.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await requestJson(editingTemplateId ? 'PATCH' : 'POST', editingTemplateId ? `/api/whatsapp/templates/${editingTemplateId}` : '/api/whatsapp/templates', {
        ...templateForm,
        name: trimmedName,
        bodyText: trimmedBody,
        sampleValues: templateForm.variables.map((variable) => variable.sample),
        variables: templateForm.variables,
        buttons: activeButtons,
      });
      toast({ title: editingTemplateId ? 'Template updated' : 'Template created', description: editingTemplateId ? 'Draft template updated successfully.' : 'Template saved locally. Submit it for Infobip approval when you are ready.' });
      setTemplateDialogOpen(false);
      resetTemplateForm();
      await refresh();
    } catch (requestError) {
      toast({ title: 'Template creation failed', description: requestError instanceof Error ? requestError.message : 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
  async function handleCreateCampaign() {
    const selectedTemplate = templates.find((template) => template.id === campaignForm.templateId);
    if (!selectedTemplate) {
      toast({ title: 'Select a template', description: 'Choose a template before saving the campaign.', variant: 'destructive' });
      return;
    }
    if (['send_now', 'scheduled'].includes(campaignForm.sendMode) && selectedTemplate.status !== 'approved') {
      toast({ title: 'Approved template required', description: 'Immediate and scheduled sends require an approved WhatsApp template.', variant: 'destructive' });
      return;
    }
    if (audienceStats.selectedEligible === 0) {
      toast({ title: 'No eligible leads selected', description: 'Select at least one lead with a phone number before saving the campaign.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await requestJson('POST', '/api/whatsapp/campaigns', {
        name: campaignForm.name,
        description: campaignForm.description,
        templateId: campaignForm.templateId,
        sendMode: campaignForm.sendMode,
        scheduledAt: campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : undefined,
        timezone: campaignForm.timezone,
        leadIds: campaignForm.leadIds,
        segmentSnapshot: JSON.stringify({
          search: campaignForm.search,
          city: campaignForm.city,
          classification: campaignForm.classification,
          statuses: campaignForm.statuses,
        }),
      });
      toast({ title: 'Campaign created', description: campaignForm.sendMode === 'send_now' ? 'Campaign was created and sent immediately.' : 'Campaign was saved with the selected configuration.' });
      setCampaignDialogOpen(false);
      setCampaignForm({ name: '', description: '', templateId: '', sendMode: 'send_now', scheduledAt: '', timezone: 'Europe/Bucharest', leadIds: [], search: '', city: 'all', classification: 'all', statuses: [] });
      await refresh();
    } catch (requestError) {
      toast({ title: 'Campaign creation failed', description: requestError instanceof Error ? requestError.message : 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
  async function handleCreateAutomation() {
    setSubmitting(true);
    try {
      await requestJson('POST', '/api/whatsapp/automations', { ...automationForm, delayMinutes: Number(automationForm.delayMinutes) });
      toast({ title: 'Automation created', description: 'Automation was saved and is ready to be connected to the dispatcher.' });
      setAutomationDialogOpen(false);
      setAutomationForm({ name: '', description: '', templateId: '', triggerType: 'scheduled', schedule: '0 9 * * 1', delayMinutes: '60', timezone: 'Europe/Bucharest' });
      await refresh();
    } catch (requestError) {
      toast({ title: 'Automation creation failed', description: requestError instanceof Error ? requestError.message : 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
  async function handleTemplateAction(templateId: string, action: 'submit' | 'sync') {
    setSubmitting(true);
    try {
      await requestJson('POST', `/api/whatsapp/templates/${templateId}/${action}`);
      toast({ title: action === 'submit' ? 'Template submitted' : 'Template synced', description: action === 'submit' ? 'The template was sent to Infobip for approval.' : 'The latest Infobip status was pulled into the dashboard.' });
      await refresh();
    } catch (requestError) {
      toast({ title: 'Template action failed', description: requestError instanceof Error ? requestError.message : 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
  async function handleDispatchCampaign(campaignId: string) {
    setSubmitting(true);
    try {
      await requestJson('POST', `/api/whatsapp/campaigns/${campaignId}/dispatch`);
      toast({ title: 'Campaign dispatched', description: 'Queued recipients were sent to Infobip.' });
      await refresh();
    } catch (requestError) {
      toast({ title: 'Campaign dispatch failed', description: requestError instanceof Error ? requestError.message : 'Unexpected error.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
  function openTemplateEditor(template: DashboardRecord) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name ?? '',
      language: template.language ?? 'en',
      category: template.category ?? 'MARKETING',
      headerType: template.headerType ?? 'NONE',
      headerText: template.headerText ?? '',
      headerMediaUrl: template.headerMediaUrl ?? '',
      bodyText: template.bodyText ?? '',
      footerText: template.footerText ?? '',
      sampleValues: '',
      variables: (template.variables ?? []).length > 0
        ? (template.variables as TemplateVariableForm[])
        : createDefaultVariables(),
      buttons: (template.buttons ?? []).length > 0
        ? (template.buttons as TemplateButtonForm[])
        : createDefaultButtons(),
    });
    setTemplateDialogOpen(true);
  }
  function jumpTo(tab: TabKey, options?: { templateFilter?: typeof templateFilter; campaignFilter?: typeof campaignFilter }) { setActiveTab(tab); if (options?.templateFilter) setTemplateFilter(options.templateFilter); if (options?.campaignFilter) setCampaignFilter(options.campaignFilter); }

  if (loading) return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-2xl" />)}</div><Skeleton className="h-[720px] w-full rounded-2xl" /></div>;
  if (error || !data) return <Card className="border-rose-200 bg-rose-50"><CardHeader><CardTitle className="flex items-center gap-2 text-rose-900"><TriangleAlert className="h-5 w-5" />WhatsApp dashboard unavailable</CardTitle><CardDescription className="text-rose-800">{error ?? 'The dashboard could not be loaded.'}</CardDescription></CardHeader><CardContent><Button onClick={() => void refresh()}>Retry</Button></CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <HealthPill label="Infobip" healthy={data.health.infobipConfigured} detail={data.health.infobipConfigured ? 'Provider credentials detected' : 'Missing provider configuration'} />
        <HealthPill label="Sender" healthy={data.health.senderConfigured} detail={data.health.senderConfigured ? 'Sender configured in app env' : 'Sender not configured yet'} />
        <HealthPill label="Webhooks" healthy={data.health.webhookActive} detail={data.health.webhookActive ? 'Recent Infobip webhook activity found' : 'No webhook activity detected yet'} />
        <HealthPill label="Templates" healthy={data.health.approvedTemplatesAvailable} detail={data.health.approvedTemplatesAvailable ? 'Approved templates are ready to use' : 'No approved template available yet'} />
        <HealthPill label="Scheduler" healthy={data.health.schedulerActive} detail={data.health.schedulerActive ? 'Scheduled jobs exist in Firestore' : 'No active scheduled jobs yet'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Active Campaigns" value={String(metrics.activeCampaigns)} hint="Open active campaign operations" icon={Target} tone="active" onClick={() => jumpTo('campaigns', { campaignFilter: 'active' })} />
        <MetricCard title="Pending Templates" value={String(metrics.pendingTemplates)} hint="Review templates waiting for approval" icon={Sparkles} tone="pending" onClick={() => jumpTo('templates', { templateFilter: 'pending' })} />
        <MetricCard title="Delivered" value={String(metrics.delivered)} hint="See delivery funnel performance" icon={Send} tone="delivered" onClick={() => jumpTo('campaigns')} />
        <MetricCard title="Seen" value={String(metrics.seen)} hint="Inspect campaigns with message opens" icon={CheckCheck} tone="seen" onClick={() => jumpTo('campaigns')} />
        <MetricCard title="Replies" value={String(metrics.replies)} hint="Go to live inbox and replies" icon={MessageCircleReply} tone="replies" onClick={() => jumpTo('conversations')} />
      </div>

      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 xl:max-w-3xl">
            <CardTitle className="font-headline text-2xl">WhatsApp Campaign Operating Center</CardTitle>
            <CardDescription className="text-slate-300">Run campaigns, monitor health, review approvals, and triage replies from one operational workspace.</CardDescription>
          </div>
          <div className="flex flex-nowrap items-center gap-2 xl:shrink-0">
            <Button variant="secondary" className="shrink-0" onClick={() => setCampaignDialogOpen(true)} disabled={submitting}><Send className="mr-2 h-4 w-4" />New Campaign</Button>
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild><Button className="shrink-0 bg-emerald-500 text-black hover:bg-emerald-400" onClick={() => resetTemplateForm()}><Sparkles className="mr-2 h-4 w-4" />New Template</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
                <div className="flex max-h-[90vh] flex-col">
                <DialogHeader className="border-b px-6 pb-4 pt-6"><DialogTitle>{editingTemplateId ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}</DialogTitle><DialogDescription>{editingTemplateId ? 'Update the local draft before sending it for approval.' : 'Save the template locally first, then submit it to Infobip for approval.'}</DialogDescription></DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="template-name">Template name</Label><Input id="template-name" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} placeholder="new_listing_follow_up" /></div>
                      <div className="space-y-2"><Label>Category</Label><Select value={templateForm.category} onValueChange={(value) => setTemplateForm((current) => ({ ...current, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MARKETING">Marketing</SelectItem><SelectItem value="UTILITY">Utility</SelectItem><SelectItem value="AUTHENTICATION">Authentication</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Language</Label><Input value={templateForm.language} onChange={(event) => setTemplateForm((current) => ({ ...current, language: event.target.value }))} placeholder="en" /></div>
                      <div className="space-y-2"><Label>Header type</Label><Select value={templateForm.headerType} onValueChange={(value) => setTemplateForm((current) => ({ ...current, headerType: value, headerText: value === 'TEXT' ? current.headerText : '', headerMediaUrl: HEADER_MEDIA_TYPES.includes(value as (typeof HEADER_MEDIA_TYPES)[number]) ? current.headerMediaUrl : '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">No header</SelectItem><SelectItem value="TEXT">Text header</SelectItem><SelectItem value="IMAGE">Image header</SelectItem><SelectItem value="DOCUMENT">Document header</SelectItem><SelectItem value="VIDEO">Video header</SelectItem></SelectContent></Select></div>
                    </div>
                    {templateForm.headerType === 'TEXT' ? <div className="space-y-2"><Label>Header text</Label><Input value={templateForm.headerText} onChange={(event) => setTemplateForm((current) => ({ ...current, headerText: event.target.value }))} placeholder="Nordia Homes" /></div> : null}
                    {HEADER_MEDIA_TYPES.includes(templateForm.headerType as (typeof HEADER_MEDIA_TYPES)[number]) ? <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><div className="space-y-2"><Label>Header media URL</Label><Input value={templateForm.headerMediaUrl} onChange={(event) => setTemplateForm((current) => ({ ...current, headerMediaUrl: event.target.value }))} placeholder="https://example.com/media.jpg" /></div><div className="space-y-2"><Label>Upload file</Label><Input type="file" accept={templateForm.headerType === 'IMAGE' ? 'image/*' : templateForm.headerType === 'VIDEO' ? 'video/*' : '.pdf,.doc,.docx,.txt,.ppt,.pptx'} onChange={(event) => void handleTemplateMediaUpload(event)} disabled={mediaUploading} /></div></div> : null}
                    {HEADER_MEDIA_TYPES.includes(templateForm.headerType as (typeof HEADER_MEDIA_TYPES)[number]) ? <p className="text-xs text-muted-foreground">{mediaUploading ? 'Uploading media to Firebase Storage...' : 'You can paste a direct URL or upload a file. The uploaded file URL will be filled in automatically.'}</p> : null}
                    <div className="space-y-2"><Label>Body text</Label><Textarea rows={6} value={templateForm.bodyText} onChange={(event) => { const bodyText = event.target.value; const indexes = extractPlaceholderIndexes(bodyText); setTemplateForm((current) => ({ ...current, bodyText, variables: indexes.map((index) => current.variables.find((variable) => variable.index === index) ?? { key: `{{${index}}}`, index, label: `Variable ${index}`, sample: `Example ${index}`, sourceField: '' }) })); }} placeholder="Hello {{1}}, we prepared a quick update for {{2}} in {{3}}." /></div>
                    <div className="space-y-2"><Label>Footer text</Label><Input value={templateForm.footerText} onChange={(event) => setTemplateForm((current) => ({ ...current, footerText: event.target.value }))} placeholder="Reply here if you want the full details." /></div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between"><Label>Variables</Label><Button type="button" variant="outline" size="sm" onClick={() => setTemplateForm((current) => ({ ...current, variables: [...current.variables, { key: `{{${current.variables.length + 1}}}`, index: current.variables.length + 1, label: `Variable ${current.variables.length + 1}`, sample: `Example ${current.variables.length + 1}`, sourceField: '' }] }))}><PlusCircle className="mr-2 h-4 w-4" />Add Variable</Button></div>
                      <p className="mt-2 text-xs text-muted-foreground">Map each variable to a lead field so the preview and campaigns can auto-fill values from your CRM.</p>
                      <div className="mt-3 space-y-3">{templateForm.variables.map((variable, idx) => <div key={variable.index} className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[110px_1fr_220px_1fr_auto]"><Input value={variable.key} onChange={(event) => updateTemplateVariable(idx, { key: event.target.value })} /><Input value={variable.label} onChange={(event) => updateTemplateVariable(idx, { label: event.target.value })} placeholder="Friendly label" /><Select value={variable.sourceField ?? '__none'} onValueChange={(value) => updateTemplateVariable(idx, { sourceField: value === '__none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Lead field" /></SelectTrigger><SelectContent><SelectItem value="__none">Custom sample only</SelectItem>{VARIABLE_SOURCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Input value={variable.sample} onChange={(event) => updateTemplateVariable(idx, { sample: event.target.value })} placeholder="Sample value" /><Button type="button" variant="ghost" size="icon" onClick={() => setTemplateForm((current) => ({ ...current, variables: current.variables.filter((_, itemIdx) => itemIdx !== idx) }))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between"><Label>Buttons</Label><Button type="button" variant="outline" size="sm" onClick={() => setTemplateForm((current) => current.buttons.length >= MAX_TEMPLATE_BUTTONS ? current : { ...current, buttons: [...current.buttons, { type: 'QUICK_REPLY', text: 'Profita de Accesul Gratuit', payload: 'FREE_ACCESS' }] })}><PlusCircle className="mr-2 h-4 w-4" />Add Button</Button></div>
                      <p className="mt-2 text-xs text-muted-foreground">Use up to {MAX_TEMPLATE_BUTTONS} buttons. Keep labels short so they stay compliant and readable on mobile.</p>
                      <div className="mt-3 space-y-3">{templateForm.buttons.map((button, idx) => <div key={`${button.type}-${idx}`} className="space-y-3 rounded-xl border p-3"><div className="grid gap-3 md:grid-cols-[180px_1fr_auto]"><Select value={button.type} onValueChange={(value) => setTemplateForm((current) => ({ ...current, buttons: current.buttons.map((item, itemIdx) => itemIdx === idx ? { ...item, type: value as TemplateButtonForm['type'] } : item) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="QUICK_REPLY">Quick reply</SelectItem><SelectItem value="URL">Visit website</SelectItem><SelectItem value="PHONE_NUMBER">Call phone number</SelectItem></SelectContent></Select><Input value={button.text} onChange={(event) => setTemplateForm((current) => ({ ...current, buttons: current.buttons.map((item, itemIdx) => itemIdx === idx ? { ...item, text: event.target.value } : item) }))} placeholder="Button label" /><Button type="button" variant="ghost" size="icon" onClick={() => setTemplateForm((current) => ({ ...current, buttons: current.buttons.filter((_, itemIdx) => itemIdx !== idx) }))}><Trash2 className="h-4 w-4" /></Button></div>{button.type === 'URL' ? <Input value={button.url ?? ''} onChange={(event) => setTemplateForm((current) => ({ ...current, buttons: current.buttons.map((item, itemIdx) => itemIdx === idx ? { ...item, url: event.target.value } : item) }))} placeholder="https://example.com" /> : null}{button.type !== 'URL' ? <Input value={button.payload ?? ''} onChange={(event) => setTemplateForm((current) => ({ ...current, buttons: current.buttons.map((item, itemIdx) => itemIdx === idx ? { ...item, payload: event.target.value } : item) }))} placeholder={button.type === 'PHONE_NUMBER' ? '+407...' : 'FREE_ACCESS'} /> : null}</div>)}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card className="border-white/10 bg-muted/30">
                      <CardHeader><CardTitle className="text-base">WhatsApp preview</CardTitle><CardDescription>Preview the final template with sample variables, media header, and buttons.</CardDescription></CardHeader>
                      <CardContent>
                        <div className="rounded-[28px] bg-[#e6ddd4] p-4">
                          <div className="ml-auto max-w-sm rounded-2xl bg-[#dcf8c6] p-4 text-sm shadow-sm">
                            {templateForm.headerType === 'TEXT' && templateForm.headerText ? <p className="mb-2 font-semibold">{templateForm.headerText}</p> : null}
                            {templateForm.headerType === 'IMAGE' && templateForm.headerMediaUrl ? <div className="mb-3 overflow-hidden rounded-xl bg-white/70 p-2 text-xs text-muted-foreground"><img src={templateForm.headerMediaUrl} alt="Template header preview" className="max-h-48 w-full rounded-lg object-cover" /></div> : null}
                            {templateForm.headerType === 'DOCUMENT' && templateForm.headerMediaUrl ? <div className="mb-3 rounded-xl bg-white/70 p-3 text-xs text-muted-foreground"><FileText className="mb-2 h-4 w-4" />{templateForm.headerMediaUrl}</div> : null}
                            {templateForm.headerType === 'VIDEO' && templateForm.headerMediaUrl ? <div className="mb-3 overflow-hidden rounded-xl bg-white/70 p-2 text-xs text-muted-foreground"><video src={templateForm.headerMediaUrl} className="max-h-48 w-full rounded-lg" controls /></div> : null}
                            <p className="whitespace-pre-wrap">{templatePreviewText}</p>
                            {templateForm.footerText ? <p className="mt-3 text-xs text-muted-foreground">{templateForm.footerText}</p> : null}
                            {templateForm.buttons.length > 0 ? <div className="mt-4 space-y-2">{templateForm.buttons.filter((button) => button.text.trim()).map((button, idx) => <div key={`${button.text}-${idx}`} className="rounded-xl border border-emerald-200 bg-white/60 px-3 py-2 text-center text-xs font-medium text-emerald-800">{button.text}</div>)}</div> : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                </div>
                <DialogFooter className="border-t px-6 py-4"><Button onClick={() => void handleCreateTemplate()} disabled={submitting || mediaUploading}>Save Template</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" className="shrink-0 border-white/20 bg-transparent text-white hover:bg-white/10"><Bot className="mr-2 h-4 w-4" />New Automation</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create WhatsApp Automation</DialogTitle><DialogDescription>Store the rule now, then connect it to your scheduled dispatcher in production.</DialogDescription></DialogHeader>
                <div className="space-y-2"><Label>Name</Label><Input value={automationForm.name} onChange={(event) => setAutomationForm((current) => ({ ...current, name: event.target.value }))} placeholder="No reply follow-up" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={automationForm.description} onChange={(event) => setAutomationForm((current) => ({ ...current, description: event.target.value }))} placeholder="If the lead does not reply within 48h, queue the approved reminder template." /></div>
                <div className="space-y-2"><Label>Template</Label><Select value={automationForm.templateId} onValueChange={(value) => setAutomationForm((current) => ({ ...current, templateId: value }))}><SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Trigger type</Label><Select value={automationForm.triggerType} onValueChange={(value) => setAutomationForm((current) => ({ ...current, triggerType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="reply_missing">No reply</SelectItem><SelectItem value="lead_status_changed">Lead status changed</SelectItem><SelectItem value="demo_booked">Demo booked</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Delay minutes</Label><Input value={automationForm.delayMinutes} onChange={(event) => setAutomationForm((current) => ({ ...current, delayMinutes: event.target.value }))} /></div></div>
                <div className="space-y-2"><Label>Schedule expression</Label><Input value={automationForm.schedule} onChange={(event) => setAutomationForm((current) => ({ ...current, schedule: event.target.value }))} placeholder="0 9 * * 1" /></div>
                <DialogFooter><Button onClick={() => void handleCreateAutomation()} disabled={submitting}>Save Automation</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="conversations">Live Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card><CardHeader><CardTitle>Activation checklist</CardTitle><CardDescription>Use this to move from setup into real WhatsApp operations.</CardDescription></CardHeader><CardContent className="space-y-3">{onboardingSteps.map((step) => <div key={step.label} className="flex items-center justify-between rounded-xl border p-3"><div className="flex items-center gap-3"><div className={cn('h-3 w-3 rounded-full', step.done ? 'bg-emerald-500' : 'bg-slate-300')} /><p className="text-sm font-medium">{step.label}</p></div><Badge variant={step.done ? 'secondary' : 'outline'}>{step.done ? 'Done' : 'Pending'}</Badge></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Action required</CardTitle><CardDescription>Warnings that can block scale, visibility, or delivery confidence.</CardDescription></CardHeader><CardContent className="space-y-3">{warnings.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">WhatsApp workspace looks healthy. Templates, webhooks, and campaigns have no urgent warnings.</div> : warnings.map((warning) => <div key={warning.title} className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-rose-700" /><p className="font-medium text-rose-900">{warning.title}</p></div><p className="mt-2 text-sm text-rose-800">{warning.body}</p></div>)}</CardContent></Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>The last inbound, delivery, and system events captured by the dashboard.</CardDescription></CardHeader><CardContent className="space-y-3">{events.length === 0 ? <EmptyState title="No WhatsApp events yet" description="Once deliveries, replies, or status callbacks come in, they will appear here." /> : events.slice(0, 6).map((event) => <div key={event.id} className="flex items-start justify-between rounded-xl border p-3"><div><p className="text-sm font-medium">{String(event.type).replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{event.source} {event.leadId ? `· lead ${event.leadId}` : ''}</p></div><p className="text-xs text-muted-foreground">{formatRelative(event.eventAt)}</p></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Scheduled work</CardTitle><CardDescription>Campaigns and jobs that are due today or waiting to be processed.</CardDescription></CardHeader><CardContent className="space-y-3">{scheduledJobs.length === 0 ? <EmptyState title="No scheduled jobs yet" description="Scheduled campaigns and dispatcher work will show up here once created." /> : <>{scheduledToday.length > 0 ? <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-medium text-sky-900">Scheduled for today: {scheduledToday.length}</p><p className="mt-1 text-xs text-sky-800">Use this list to verify today&apos;s pending dispatch workload.</p></div> : null}{scheduledJobs.slice(0, 6).map((job) => <div key={job.id} className="flex items-start justify-between rounded-xl border p-3"><div><p className="text-sm font-medium">{job.jobType?.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{job.status} {job.campaignId ? `· campaign ${job.campaignId}` : ''}</p></div><p className="text-xs text-muted-foreground">{job.runAt ? format(asDate(job.runAt) ?? new Date(), 'MMM d, HH:mm') : 'No run date'}</p></div>)}</>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All templates'],
                ['approved', 'Approved'],
                ['pending', 'Pending'],
                ['rejected', 'Rejected'],
                ['draft', 'Draft'],
              ].map(([value, label]) => (
                <Button key={value} size="sm" variant={templateFilter === value ? 'default' : 'outline'} onClick={() => setTemplateFilter(value as typeof templateFilter)}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Preview lead</Label>
              <Select value={previewLeadId || (previewLead?.id ?? '')} onValueChange={setPreviewLeadId}>
                <SelectTrigger className="w-[260px]"><SelectValue placeholder="Choose a lead for preview" /></SelectTrigger>
                <SelectContent>{leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.full_name || lead.company_name || lead.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredTemplates.length === 0 ? (
              <EmptyState title="No templates in this filter" description="Create the first template, then submit and sync it from this workspace." action={<Button onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}>Create Template</Button>} />
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="border-white/10 bg-white/80">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-headline text-xl">{template.name}</CardTitle>
                        <CardDescription>{template.category} · {template.language} · synced {formatRelative(template.lastSyncedAt || template.updatedAt)}</CardDescription>
                      </div>
                      <Badge variant="outline" className={cn(templateStatusStyles[template.status] ?? templateStatusStyles.draft)}>{template.status}</Badge>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Sample preview</p>
                      <p className="mt-2 whitespace-pre-wrap">{renderTemplateBody(template.bodyText ?? '', template.variables ?? [])}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">{(template.variables ?? []).map((variable: Record<string, string>) => <Badge key={variable.key} variant="secondary">{variable.key}: {getLeadFieldValue(previewLead, variable.sourceField) || variable.sample}</Badge>)}</div>
                    {template.rejectionReason ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Rejection reason: {template.rejectionReason}</div> : null}
                    <div className="flex flex-wrap gap-2">
                      {template.status === 'draft' ? <Button size="sm" variant="secondary" onClick={() => openTemplateEditor(template)} disabled={submitting}>Edit Draft</Button> : null}
                      <Button size="sm" onClick={() => void handleTemplateAction(template.id, 'submit')} disabled={submitting}>Submit for Approval</Button>
                      <Button size="sm" variant="outline" onClick={() => void handleTemplateAction(template.id, 'sync')} disabled={submitting}>Sync Status</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All campaigns'],
                ['active', 'Active'],
                ['scheduled', 'Scheduled'],
                ['draft', 'Draft'],
                ['attention', 'Needs attention'],
              ].map(([value, label]) => (
                <Button key={value} size="sm" variant={campaignFilter === value ? 'default' : 'outline'} onClick={() => setCampaignFilter(value as typeof campaignFilter)}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Funnel: queued {campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.queuedCount), 0)} · sent {campaigns.reduce((sum, campaign) => sum + safeNumber(campaign.sentCount), 0)} · delivered {metrics.delivered} · seen {metrics.seen} · replies {metrics.replies}</p>
          </div>

          <Dialog
            open={campaignDialogOpen}
            onOpenChange={setCampaignDialogOpen}
          >
            <DialogContent
              className="max-h-[92vh] max-w-5xl overflow-hidden border-[#e7e1d6] bg-[#f7f3ed] p-0 shadow-[0_32px_90px_rgba(28,24,20,0.18)]"
            >
              <div className="flex h-full max-h-[92vh] flex-col">
                <DialogHeader className="shrink-0 border-b border-[#e7dfd2] bg-[#f4efe7] px-6 py-3">
                  <div className="flex items-center justify-between gap-4 pr-12">
                    <div>
                      <DialogTitle className="text-[1.2rem] font-headline tracking-[-0.03em] text-[#1f1b18]">Create WhatsApp Campaign</DialogTitle>
                      <DialogDescription className="mt-0.5 text-[12px] leading-4 text-[#6f6458]">
                        Approved template, selected audience, clean launch.
                      </DialogDescription>
                    </div>
                    <div className="hidden min-w-[96px] rounded-[18px] border border-[#ddd3c3] bg-[#fbf8f3] px-3 py-2 text-right md:block">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a7d6d]">Eligible</p>
                      <p className="mt-0.5 text-[1.25rem] font-semibold text-[#1f1b18]">{audienceStats.selectedEligible}</p>
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-5">
                      <Card className="overflow-hidden border-[#d7cab7] bg-[#e9dfd1] shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-[#1f1b18]">Campaign setup</CardTitle>
                          <CardDescription className="text-[#61574c]">Title, approved template, and timing.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="rounded-[22px] border border-[#d7cab7] bg-[#f7f1e8] p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#786c5f]">Campaign identity</p>
                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-[#2b251f]">Campaign name</Label>
                                <Input
                                  value={campaignForm.name}
                                  onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))}
                                  placeholder="Q2 Reactivation - Approved WA Template"
                                  className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18] placeholder:text-[#7b6f60]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#2b251f]">Template</Label>
                                <Select value={campaignForm.templateId} onValueChange={(value) => setCampaignForm((current) => ({ ...current, templateId: value }))}>
                                  <SelectTrigger className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18]"><SelectValue placeholder="Choose a template" /></SelectTrigger>
                                  <SelectContent>
                                    {templates.map((template) => (
                                      <SelectItem key={template.id} value={template.id}>
                                        {template.name} ({template.status})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-[#d7cab7] bg-[#f7f1e8] p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#786c5f]">Message context</p>
                            <div className="mt-3 space-y-2">
                              <Label className="text-[#2b251f]">Description</Label>
                              <Textarea
                                rows={3}
                                value={campaignForm.description}
                                onChange={(event) => setCampaignForm((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Send a compliant follow-up to high-intent leads collected this week."
                                className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18] placeholder:text-[#7b6f60]"
                              />
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-[#d7cab7] bg-[#f7f1e8] p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#786c5f]">Delivery settings</p>
                            <div className="mt-3 grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label className="text-[#2b251f]">Send mode</Label>
                                <Select value={campaignForm.sendMode} onValueChange={(value) => setCampaignForm((current) => ({ ...current, sendMode: value }))}>
                                  <SelectTrigger className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="send_now">Send now</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="manual">Save as draft</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#2b251f]">Timezone</Label>
                                <Input
                                  value={campaignForm.timezone}
                                  onChange={(event) => setCampaignForm((current) => ({ ...current, timezone: event.target.value }))}
                                  className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18] placeholder:text-[#7b6f60]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#2b251f]">Scheduled at</Label>
                                {campaignForm.sendMode === 'scheduled' ? (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Select
                                      value={scheduledDateInputValue || undefined}
                                      onValueChange={(value) =>
                                        setCampaignForm((current) => ({
                                          ...current,
                                          scheduledAt: buildScheduledDateTime(value, scheduledTimeInputValue),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18]">
                                        <SelectValue placeholder="Select date" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {schedulingDateOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={scheduledTimeInputValue || undefined}
                                      onValueChange={(value) =>
                                        setCampaignForm((current) => ({
                                          ...current,
                                          scheduledAt: buildScheduledDateTime(scheduledDateInputValue || schedulingDateOptions[0]?.value || '', value),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18]">
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {schedulingTimeOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <Input
                                    value=""
                                    readOnly
                                    disabled
                                    placeholder="Switch to Scheduled to choose date and time"
                                    className="border-[#cfc0ab] bg-[#fffaf3] text-[#1f1b18] placeholder:text-[#7b6f60]"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-[#e3dbcf] bg-[#fbf8f3] shadow-none">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-[#7a6d60]" />
                            <CardTitle className="text-base text-[#1f1b18]">Audience</CardTitle>
                          </div>
                          <CardDescription>
                            Narrow the list, then select only the leads worth reaching.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="rounded-[24px] border border-[#e5ddd1] bg-[#fdfaf5] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8b7f72]">Refine audience</p>
                                <p className="mt-1 text-sm text-[#6f6458]">Search quickly, then narrow by city and lead type.</p>
                              </div>
                              {(campaignForm.search || campaignForm.city !== 'all' || campaignForm.classification !== 'all') ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setCampaignForm((current) => ({
                                      ...current,
                                      search: '',
                                      city: 'all',
                                      classification: 'all',
                                    }))
                                  }
                                  className="rounded-full text-[#7a6d60] hover:bg-[#f0e7db] hover:text-[#1f1b18]"
                                >
                                  Clear filters
                                </Button>
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[1.35fr_0.8fr_0.8fr]">
                              <div className="space-y-2">
                                <Label className="text-[#332c25]">Search leads</Label>
                                <Input
                                  value={campaignForm.search}
                                  onChange={(event) => setCampaignForm((current) => ({ ...current, search: event.target.value }))}
                                  placeholder="Name, company, or phone"
                                  className="border-[#d9cebf] bg-white text-[#1f1b18] placeholder:text-[#7b6f60]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#332c25]">City</Label>
                                <Select value={campaignForm.city} onValueChange={(value) => setCampaignForm((current) => ({ ...current, city: value }))}>
                                  <SelectTrigger className="border-[#d9cebf] bg-white text-[#1f1b18]">
                                    <SelectValue placeholder="All cities" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All cities</SelectItem>
                                    {cities.map((city) => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[#332c25]">Lead type</Label>
                                <Select value={campaignForm.classification} onValueChange={(value) => setCampaignForm((current) => ({ ...current, classification: value }))}>
                                  <SelectTrigger className="border-[#d9cebf] bg-white text-[#1f1b18]">
                                    <SelectValue placeholder="All lead types" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All lead types</SelectItem>
                                    <SelectItem value="likely_independent">Likely independent</SelectItem>
                                    <SelectItem value="possible_independent">Possible independent</SelectItem>
                                    <SelectItem value="agency">Agency</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Label className="text-[#332c25]">Lead status</Label>
                              {campaignForm.statuses.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCampaignForm((current) => ({ ...current, statuses: [] }))}
                                  className="text-[#7a6d60] hover:bg-[#f3ece2] hover:text-[#1f1b18]"
                                >
                                  Clear statuses
                                </Button>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {LEAD_STATUS_OPTIONS.map((status) => {
                                const active = campaignForm.statuses.includes(status.value);
                                return (
                                  <Button
                                    key={status.value}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                      "rounded-full border-[#ddd3c3] bg-[#faf6f0] px-4 text-[#4f473f] hover:border-[#ccb89d] hover:bg-[#efe5d6] hover:text-[#1f1b18]",
                                      active && "border-[#bfa889] bg-[#cfbea6] text-[#1f1b18] hover:border-[#b59d7d] hover:bg-[#c6b294] hover:text-[#1f1b18]"
                                    )}
                                    onClick={() =>
                                      setCampaignForm((current) => ({
                                        ...current,
                                        statuses: active
                                          ? current.statuses.filter((item) => item !== status.value)
                                          : [...current.statuses, status.value],
                                      }))
                                    }
                                  >
                                    {status.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-[#e5ddd1] bg-[#fcfaf6] px-4 py-3 text-sm">
                            <span className="text-[#6f6458]">Visible <span className="ml-1 font-semibold text-[#1f1b18]">{audienceStats.totalVisible}</span></span>
                            <span className="h-1 w-1 rounded-full bg-[#cbbba5]" />
                            <span className="text-[#5f6d55]">Eligible <span className="ml-1 font-semibold text-[#22311e]">{audienceStats.eligibleVisible}</span></span>
                            <span className="h-1 w-1 rounded-full bg-[#cbbba5]" />
                            <span className="text-[#6f6458]">Selected <span className="ml-1 font-semibold text-[#1f1b18]">{audienceStats.selected}</span></span>
                            {audienceStats.selectedMissingPhone > 0 ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-[#cbbba5]" />
                                <span className="text-[#8a534c]">Missing phone <span className="ml-1 font-semibold text-[#6b2d26]">{audienceStats.selectedMissingPhone}</span></span>
                              </>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" className="rounded-full border-[#d8cbb9] bg-[#fbf7f1] text-[#2e2822] hover:border-[#c9b69b] hover:bg-[#efe5d6] hover:text-[#1f1b18]" onClick={() => setCampaignForm((current) => ({ ...current, leadIds: Array.from(new Set([...current.leadIds, ...filteredAudienceLeads.map((lead) => lead.id)])) }))}>Select visible</Button>
                              <Button type="button" variant="ghost" className="rounded-full text-[#7a6d60] hover:bg-[#f0e7db] hover:text-[#1f1b18]" onClick={() => setCampaignForm((current) => ({ ...current, leadIds: [] }))}>Clear selection</Button>
                            </div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#8b7f72]">{filteredAudienceLeads.length} leads in view</p>
                          </div>

                          <div className="rounded-[24px] border border-[#e3dbcf] bg-[#fcfaf6]">
                            <ScrollArea className="h-[320px] p-3">
                              <div className="space-y-3">
                                {filteredAudienceLeads.map((lead) => {
                                  const checked = campaignForm.leadIds.includes(lead.id);
                                  const eligible = Boolean(lead.phone);
                                  return (
                                    <label key={lead.id} className={cn("flex cursor-pointer items-start gap-3 rounded-[22px] border p-4 transition", checked ? "border-[#c9b59a] bg-[#f5ede2]" : "border-[#e5ddd1] bg-[#fffcf8] hover:bg-[#faf6ef]")}>
                                      <Checkbox checked={checked} onCheckedChange={(value) => setCampaignForm((current) => ({ ...current, leadIds: value ? [...current.leadIds, lead.id] : current.leadIds.filter((id) => id !== lead.id) }))} />
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-medium text-[#1f1b18]">{lead.full_name || lead.company_name || 'Unnamed lead'}</p>
                                          <Badge variant="outline" className={eligible ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}>
                                            {eligible ? 'Eligible' : 'Missing phone'}
                                          </Badge>
                                          {lead.lead_status ? <Badge variant="secondary" className="bg-slate-100 text-slate-700">{lead.lead_status.replace('_', ' ')}</Badge> : null}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {lead.phone || 'No phone'} {lead.city ? `· ${lead.city}` : ''} {lead.classification ? `· ${lead.classification.replace('_', ' ')}` : ''}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                      <Card className="overflow-hidden border-[#d9cfbf] bg-[#efe6da] shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-[#1f1b18]">Campaign snapshot</CardTitle>
                          <CardDescription>Only the essentials.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Template</p>
                            <p className="mt-1 font-medium">{selectedCampaignTemplate?.name || 'No template selected yet'}</p>
                            <p className="mt-1 text-muted-foreground">
                              {selectedCampaignTemplate ? `${selectedCampaignTemplate.status || 'draft'} template · ${selectedCampaignTemplate.language || 'en'}` : 'Choose a template to unlock approval and preview checks.'}
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery mode</p>
                            <p className="mt-1 font-medium">
                              {campaignForm.sendMode === 'send_now' ? 'Immediate send' : campaignForm.sendMode === 'scheduled' ? 'Scheduled send' : 'Saved as draft'}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {campaignForm.sendMode === 'scheduled' && campaignForm.scheduledAt
                                ? `Scheduled for ${scheduledDateDisplayValue} (${campaignForm.timezone})`
                                : campaignForm.sendMode === 'scheduled'
                                  ? 'Choose a date and time before saving.'
                                  : 'You can still edit audience and template after saving.'}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected leads</p>
                              <p className="mt-1 text-lg font-semibold">{audienceStats.selected}</p>
                            </div>
                            <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligible to send</p>
                              <p className="mt-1 text-lg font-semibold">{audienceStats.selectedEligible}</p>
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-[#ddd3c3] bg-[#fbf7f1] p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead statuses in audience</p>
                            <p className="mt-1 font-medium">
                              {selectedLeadStatusLabels.length ? selectedLeadStatusLabels.join(', ') : 'All lead statuses'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-[#eadfce] bg-[#f6f1e8] shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-[#1f1b18]">Pre-flight notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-[#5d5348]">
                          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4" /><p>Immediate and scheduled campaigns should use an approved template.</p></div>
                          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4" /><p>Selected eligible recipients: <span className="font-semibold">{audienceStats.selectedEligible}</span></p></div>
                          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4" /><p>Selected leads missing phone numbers: <span className="font-semibold">{audienceStats.selectedMissingPhone}</span></p></div>
                          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4" /><p>Lead status filters applied: <span className="font-semibold">{selectedLeadStatusLabels.length ? selectedLeadStatusLabels.join(', ') : 'All statuses'}</span></p></div>
                          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4" /><p>{campaignForm.sendMode === 'scheduled' ? 'Scheduling requires a date, time, and timezone.' : 'Draft mode is useful while approvals are still pending.'}</p></div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="shrink-0 border-t border-[#e7dfd2] bg-[#f4efe7] px-6 py-4">
                  <div className="flex w-full items-center justify-between gap-3">
                    <p className="text-sm text-[#6f6458]">
                      {audienceStats.selectedEligible} eligible recipients ready{campaignForm.sendMode === 'scheduled' ? ' for scheduling' : ' for sending'}.
                    </p>
                    <Button className="bg-[#1f1b18] text-white hover:bg-[#2a2521]" onClick={() => void handleCreateCampaign()} disabled={submitting}>Save Campaign</Button>
                  </div>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCampaigns.length === 0 ? <EmptyState title="No campaigns in this view" description="Create a campaign from an approved template and eligible audience, then manage it here." action={<Button onClick={() => setCampaignDialogOpen(true)}>Create Campaign</Button>} /> : filteredCampaigns.map((campaign) => { const queued = safeNumber(campaign.queuedCount); const sent = safeNumber(campaign.sentCount); const delivered = safeNumber(campaign.deliveredCount); const seen = safeNumber(campaign.seenCount); const replies = safeNumber(campaign.replyCount); const failed = safeNumber(campaign.failedCount); const total = Math.max(safeNumber(campaign.leadCount), 1); return <Card key={campaign.id} className="border-white/10 bg-white/80"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-headline text-xl">{campaign.name}</CardTitle><CardDescription>{campaign.description}</CardDescription></div><Badge variant="outline" className={cn(campaignStatusStyles[campaign.status] ?? campaignStatusStyles.draft)}>{campaign.status}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Template</p><p className="font-medium">{campaign.templateName}</p></div><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Audience</p><p className="font-medium">{campaign.leadCount} leads</p></div><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Owner</p><p className="font-medium">{campaign.ownerId || 'system'}</p></div></div><div className="space-y-3 rounded-2xl border p-4"><div className="flex items-center justify-between text-sm"><p className="font-medium">Campaign funnel</p><p className="text-muted-foreground">{Math.round((delivered / total) * 100)}% delivery rate</p></div><div className="grid gap-3 sm:grid-cols-6">{[['Queued', queued], ['Sent', sent], ['Delivered', delivered], ['Seen', seen], ['Replies', replies], ['Failed', failed]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-3 text-center text-sm"><p className="text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value}</p></div>)}</div></div><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Last dispatch {formatRelative(campaign.lastDispatchedAt)}</span><span>{campaign.scheduledAt ? `Scheduled ${formatRelative(campaign.scheduledAt)}` : 'No schedule'}</span></div>{failed > 0 ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">This campaign has failed recipients. Review and retry after checking delivery errors.</div> : null}<div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void handleDispatchCampaign(campaign.id)} disabled={submitting}>Dispatch Queue</Button><Button size="sm" variant="outline" onClick={() => void refresh()}>Refresh Metrics</Button></div></CardContent></Card>; })}
          </div>
        </TabsContent>

        <TabsContent value="automations" className="mt-6 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
            <div className="grid gap-4">{automations.length === 0 ? <EmptyState title="No automations configured" description="Create rule-based flows for reminders, follow-ups, and post-demo messages." action={<Button onClick={() => setAutomationDialogOpen(true)}>Create Automation</Button>} /> : automations.map((automation) => <Card key={automation.id} className="border-white/10 bg-white/80"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-headline text-xl">{automation.name}</CardTitle><CardDescription>{automation.description}</CardDescription></div><Badge variant="outline">{automation.status}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Trigger</p><p className="font-medium">{automation.triggerType}</p></div><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Delay</p><p className="font-medium">{automation.delayMinutes ?? 0} min</p></div><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Schedule</p><p className="font-medium">{automation.schedule || 'Event-driven'}</p></div><div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Timezone</p><p className="font-medium">{automation.timezone}</p></div></div><p className="text-xs text-muted-foreground">Updated {formatRelative(automation.updatedAt)} · owner {automation.ownerId || 'system'}</p></CardContent></Card>)}</div>
            <Card><CardHeader><CardTitle>Automation playbook</CardTitle><CardDescription>Recommended starter rules for a healthier WhatsApp motion.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="rounded-xl bg-muted/50 p-4"><p className="font-medium">No reply in 48h</p><p className="mt-1 text-muted-foreground">Send an approved follow-up template only if the conversation remains inactive.</p></div><div className="rounded-xl bg-muted/50 p-4"><p className="font-medium">After demo booked</p><p className="mt-1 text-muted-foreground">Send prep or reminder content automatically ahead of the booked time.</p></div><div className="rounded-xl bg-muted/50 p-4"><p className="font-medium">After AI call connection</p><p className="mt-1 text-muted-foreground">Follow successful calls with a compliant WhatsApp template inside a controlled delay.</p></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={inboxSearch} onChange={(event) => setInboxSearch(event.target.value)} placeholder="Search phone or recent message" /></div>
            <p className="text-sm text-muted-foreground">Unread first and active session windows should be prioritized for human follow-up.</p>
          </div>
          {filteredConversations.length === 0 ? <EmptyState title="No live conversations yet" description="Once webhook events start arriving, active WhatsApp threads will appear here." /> : <div className="grid gap-4 xl:grid-cols-2">{filteredConversations.map((conversation) => { const unread = safeNumber(conversation.unreadCount); const sessionActive = Boolean(conversation.sessionWindowClosesAt); return <Card key={conversation.id} className="border-white/10 bg-white/80"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-headline text-xl">{conversation.phone}</CardTitle><CardDescription>{sessionActive ? `Session closes ${formatRelative(conversation.sessionWindowClosesAt)}` : 'Template required to restart conversation'}</CardDescription></div><div className="flex flex-col items-end gap-2"><Badge variant="outline">{unread} unread</Badge><Badge variant="secondary">{sessionActive ? '24h window open' : 'Needs template'}</Badge></div></div></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{conversation.lastMessagePreview || 'No preview available yet.'}</div><Separator /><div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground"><div className="flex items-center gap-2"><Timer className="h-4 w-4" />Last outbound {formatRelative(conversation.lastOutboundAt)}</div><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />Last inbound {formatRelative(conversation.lastInboundAt)}</div></div>{unread > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Human action recommended: this conversation has unread inbound messages.</div> : null}</CardContent></Card>; })}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
