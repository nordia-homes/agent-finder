'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  Clock3,
  FileText,
  MoreVertical,
  ImageIcon,
  Globe2,
  Lock,
  MessageSquareText,
  Plus,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Upload,
  Video,
  Wand2,
  Wifi,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type TimestampLike = { _seconds?: number; seconds?: number; toDate?: () => Date } | string | null | undefined;

type TemplateStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'paused'
  | 'disabled'
  | 'unknown';

type TemplateHeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

type TemplateVariable = {
  key: string;
  sample: string;
  sourceField?: string;
};

type TemplateButton = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  payload?: string;
  url?: string;
};

type WhatsAppTemplateRecord = {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  headerType: TemplateHeaderType;
  headerText?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  variables: TemplateVariable[];
  buttons: TemplateButton[];
  rejectionReason?: string | null;
  qualityScore?: string | null;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  submittedAt?: TimestampLike;
  lastSyncedAt?: TimestampLike;
  whatsappTemplateId?: string | null;
};

type TemplateFormState = {
  id?: string;
  name: string;
  language: string;
  category: TemplateCategory;
  headerType: TemplateHeaderType;
  headerText: string;
  headerMediaUrl: string;
  bodyText: string;
  footerText: string;
  variables: TemplateVariable[];
  buttons: TemplateButton[];
};

const categoryOptions: TemplateCategory[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const headerTypeOptions: TemplateHeaderType[] = ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'];
const buttonTypeOptions: TemplateButton['type'][] = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'];

function asDate(value: TimestampLike) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === 'function') return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatRelative(value: TimestampLike) {
  const date = asDate(value);
  if (!date) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatStatus(status?: string | null) {
  return String(status || 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractPlaceholderIndexes(text: string) {
  const matches = Array.from(text.matchAll(/\{\{(\d+)\}\}/g));
  return Array.from(new Set(matches.map((match) => Number(match[1])).filter((value) => Number.isFinite(value)))).sort((a, b) => a - b);
}

function createEmptyForm(): TemplateFormState {
  return {
    name: '',
    language: 'ro',
    category: 'MARKETING',
    headerType: 'TEXT',
    headerText: '',
    headerMediaUrl: '',
    bodyText: '',
    footerText: '',
    variables: [],
    buttons: [],
  };
}

function syncVariablesWithBody(form: TemplateFormState): TemplateFormState {
  const indexes = extractPlaceholderIndexes(`${form.headerText}\n${form.bodyText}`);
  const nextVariables = indexes.map((index) => {
    const existing = form.variables.find((variable) => variable.key === String(index));
    return {
      key: String(index),
      sample: existing?.sample || `Exemplu ${index}`,
      sourceField: existing?.sourceField || '',
    };
  });

  return {
    ...form,
    variables: nextVariables,
  };
}

function normalizeTemplatePayload(form: TemplateFormState) {
  return {
    name: form.name.trim(),
    language: form.language.trim() || 'ro',
    category: form.category,
    headerType: form.headerType,
    headerText: form.headerType === 'TEXT' ? form.headerText.trim() : '',
    headerMediaUrl: form.headerType !== 'TEXT' && form.headerType !== 'NONE' ? form.headerMediaUrl.trim() : '',
    bodyText: form.bodyText.trim(),
    footerText: form.footerText.trim(),
    sampleValues: form.variables.map((variable) => variable.sample.trim()),
    variables: form.variables.map((variable) => ({
      key: variable.key,
      sample: variable.sample.trim(),
      sourceField: variable.sourceField?.trim() || undefined,
    })),
    buttons: form.buttons.map((button) => ({
      type: button.type,
      text: button.text.trim(),
      payload: button.payload?.trim() || undefined,
      url: button.url?.trim() || undefined,
    })),
    createdBy: 'agentfinder-app',
  };
}

function renderTemplateText(text: string, variables: TemplateVariable[]) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, key) => {
    const match = variables.find((variable) => variable.key === String(key));
    return match?.sample || `{{${key}}}`;
  });
}

function statusTone(status: string) {
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'pending_review') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function countByStatus(templates: WhatsAppTemplateRecord[], status: TemplateStatus) {
  return templates.filter((template) => template.status === status).length;
}

function renderPhonePreview(
  template: Pick<WhatsAppTemplateRecord, 'headerType' | 'headerText' | 'headerMediaUrl' | 'bodyText' | 'footerText' | 'buttons' | 'variables'>
) {
  const resolvedHeader = template.headerText ? renderTemplateText(template.headerText, template.variables ?? []) : '';
  const resolvedBody = template.bodyText ? renderTemplateText(template.bodyText, template.variables ?? []) : '';
  const hasMedia = template.headerType !== 'TEXT' && template.headerType !== 'NONE';
  const isImage = template.headerType === 'IMAGE';
  const isVideo = template.headerType === 'VIDEO';
  const isDocument = template.headerType === 'DOCUMENT';
  const mediaLabel = isImage ? 'Image attached' : isVideo ? 'Video attached' : 'Document attached';
  const mediaTone = isImage
    ? 'from-[#dceaff] via-[#f4f9ff] to-[#eef6ff] text-[#375a89]'
    : isVideo
      ? 'from-[#1e2638] via-[#293247] to-[#222c41] text-white'
      : 'from-[#eef2f7] via-[#f8fafc] to-[#edf2f8] text-[#42526b]';

  return (
    <div className="mx-auto w-full max-w-[336px] rounded-[40px] border border-[#20324f] bg-[linear-gradient(180deg,_#0c1626,_#13233b)] p-3 shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-center pb-2 pt-1">
        <div className="h-1.5 w-24 rounded-full bg-white/18" />
      </div>

      <div
        className="relative overflow-hidden rounded-[32px] border border-white/6 p-3"
        style={{
          backgroundColor: '#e5ddd5',
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.32) 0, rgba(255,255,255,0) 22%), radial-gradient(circle at 80% 12%, rgba(255,255,255,0.22) 0, rgba(255,255,255,0) 18%), radial-gradient(circle at 25% 72%, rgba(166,201,184,0.18) 0, rgba(166,201,184,0) 22%), radial-gradient(circle at 85% 78%, rgba(204,178,152,0.14) 0, rgba(204,178,152,0) 22%), linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%) 0 0/24px 24px, linear-gradient(225deg, rgba(255,255,255,0.08) 25%, transparent 25%) 0 0/24px 24px, linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
        }}
      >
        <div className="mb-3 flex items-center justify-between px-1 text-[11px] font-semibold text-[#f7fbff]">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-white/90">
            <Wifi className="h-3.5 w-3.5" />
            <div className="flex h-3.5 w-6 items-center rounded-[4px] border border-white/75 px-[2px]">
              <div className="h-2 w-4 rounded-[2px] bg-white/90" />
            </div>
          </div>
        </div>

        <div className="rounded-[22px] bg-[linear-gradient(180deg,_#0c5b53,_#0b4d46)] px-3 py-3 text-white shadow-[0_10px_24px_rgba(10,23,38,0.28)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-white/90" />
              <div className="h-9 w-9 rounded-full bg-white/14 ring-1 ring-white/10" />
              <div>
                <p className="text-sm font-semibold">Agent Finder Pro</p>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/70">
                  <Lock className="h-3 w-3" />
                  Business account
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/88">
              {isVideo ? <Video className="h-4 w-4" /> : null}
              <Search className="h-4 w-4" />
              <MoreVertical className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-start">
          <div className="max-w-[92%] overflow-hidden rounded-[22px] rounded-tl-[8px] bg-white shadow-[0_12px_28px_rgba(62,76,92,0.16)]">
            {hasMedia ? (
              template.headerMediaUrl && isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={template.headerMediaUrl} alt="Template media" className="h-[182px] w-full object-cover" />
              ) : (
                <div className={cn('relative flex h-[182px] w-full items-center justify-center bg-gradient-to-br', mediaTone)}>
                  {template.headerMediaUrl && !isDocument ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.headerMediaUrl}
                      alt="Template media"
                      className={cn('absolute inset-0 h-full w-full object-cover', isVideo ? 'opacity-45' : 'opacity-18')}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(8,14,24,0.06),_rgba(8,14,24,0.26))]" />
                  <div className="relative z-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/82 shadow-[0_10px_20px_rgba(33,51,84,0.12)]">
                      {isVideo ? (
                        <Play className="h-6 w-6 text-[#1d2f4f]" />
                      ) : isDocument ? (
                        <FileText className="h-6 w-6 text-[#1d2f4f]" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-[#1d2f4f]" />
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]">{mediaLabel}</p>
                    <p className={cn('mt-1 text-xs', isVideo ? 'text-white/78' : 'text-[#7083a8]')}>
                      {isVideo ? 'Tap to watch preview' : isDocument ? 'Tap to open document' : 'Tap to view full image'}
                    </p>
                  </div>
                  {isDocument ? (
                    <div className="absolute bottom-3 left-3 rounded-xl bg-white/82 px-3 py-2 text-left shadow-[0_8px_18px_rgba(33,51,84,0.12)]">
                      <p className="text-[11px] font-semibold text-[#25344e]">brochure_agentfinder.pdf</p>
                      <p className="mt-0.5 text-[10px] text-[#6f809c]">PDF · 2.4 MB</p>
                    </div>
                  ) : null}
                </div>
              )
            ) : null}

            <div className="space-y-3 px-4 py-4 text-[#1b2435]">
              {template.headerType === 'TEXT' && resolvedHeader ? (
                <p className="text-sm font-semibold leading-6 text-[#152033]">{resolvedHeader}</p>
              ) : null}

              <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#34455f]">
                {resolvedBody || 'Your template body preview will appear here.'}
              </p>

              {template.footerText ? (
                <p className="text-[11px] text-[#8a97ad]">{template.footerText}</p>
              ) : null}

              {template.buttons.length > 0 ? (
                <div className="space-y-0 border-t border-[#e7edf5] pt-2">
                  {template.buttons.map((button, index) => (
                    <div
                      key={`${button.type}-${index}`}
                      className={cn(
                        'flex items-center justify-center border-[#e4ebf4] bg-[#fbfdff] px-3 py-3 text-center text-[13px] font-semibold text-[#1d74b8]',
                        index === 0 ? 'rounded-t-[14px] border' : 'border-x border-b',
                        index === template.buttons.length - 1 ? 'rounded-b-[14px]' : ''
                      )}
                    >
                      {button.text || button.type}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-1 px-4 pb-3 text-[11px] text-[#8b97ab]">
              <span>21:47</span>
              <CheckCheck className="h-3.5 w-3.5 text-[#4aa3ff]" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="h-1.5 w-24 rounded-full bg-[#0e1c31]/22" />
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [templates, setTemplates] = useState<WhatsAppTemplateRecord[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TemplateStatus>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(createEmptyForm());

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load templates.');
      }

      setTemplates(payload);
    } catch (error) {
      toast({
        title: 'Templates unavailable',
        description: error instanceof Error ? error.message : 'Unexpected template loading error.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
      const haystack = [
        template.name,
        template.bodyText,
        template.footerText,
        template.category,
        template.language,
        template.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
      return matchesStatus && matchesQuery;
    });
  }, [deferredQuery, statusFilter, templates]);

  useEffect(() => {
    if (!filteredTemplates.length) {
      setSelectedTemplateId(null);
      return;
    }

    const selectedStillVisible = filteredTemplates.some((template) => template.id === selectedTemplateId);
    if (!selectedStillVisible) {
      setSelectedTemplateId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((template) => template.id === selectedTemplateId) ?? filteredTemplates[0] ?? null,
    [filteredTemplates, selectedTemplateId]
  );

  const openCreateDialog = () => {
    setForm(createEmptyForm());
    setEditorOpen(true);
  };

  const openEditDialog = (template: WhatsAppTemplateRecord) => {
    setForm({
      id: template.id,
      name: template.name,
      language: template.language || 'ro',
      category: template.category,
      headerType: template.headerType || 'TEXT',
      headerText: template.headerText || '',
      headerMediaUrl: template.headerMediaUrl || '',
      bodyText: template.bodyText || '',
      footerText: template.footerText || '',
      variables: template.variables ?? [],
      buttons: template.buttons ?? [],
    });
    setEditorOpen(true);
  };

  const handleFormChange = <K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'bodyText' || key === 'headerText') {
        return syncVariablesWithBody(next);
      }
      return next;
    });
  };

  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: string) => {
    setForm((current) => ({
      ...current,
      variables: current.variables.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [field]: value } : variable
      ),
    }));
  };

  const handleButtonChange = (index: number, field: keyof TemplateButton, value: string) => {
    setForm((current) => ({
      ...current,
      buttons: current.buttons.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: value } : button
      ),
    }));
  };

  const handleAddButton = () => {
    setForm((current) => {
      if (current.buttons.length >= 3) return current;
      return {
        ...current,
        buttons: [...current.buttons, { type: 'QUICK_REPLY', text: '', payload: '' }],
      };
    });
  };

  const handleRemoveButton = (index: number) => {
    setForm((current) => ({
      ...current,
      buttons: current.buttons.filter((_, buttonIndex) => buttonIndex !== index),
    }));
  };

  const handleSaveTemplate = async () => {
    const payload = normalizeTemplatePayload(syncVariablesWithBody(form));

    if (!payload.name || !payload.bodyText) {
      toast({
        title: 'Missing template content',
        description: 'Template name and body are required before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(form.id ? `/api/whatsapp/templates/${form.id}` : '/api/whatsapp/templates', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not save template.');
      }

      toast({
        title: form.id ? 'Template updated' : 'Template created',
        description: `${payload.name} is now saved in your template workspace.`,
      });
      setEditorOpen(false);
      await fetchTemplates();
      setSelectedTemplateId(result.id || form.id || null);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unexpected template save error.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitTemplate = async (template: WhatsAppTemplateRecord) => {
    try {
      const response = await fetch(`/api/whatsapp/templates/${template.id}/submit`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not submit template.');
      }

      toast({
        title: 'Submitted to WhatsApp',
        description: `${template.name} was sent for review successfully.`,
      });
      await fetchTemplates();
    } catch (error) {
      toast({
        title: 'Submit failed',
        description: error instanceof Error ? error.message : 'Unexpected submit error.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncTemplate = async (template: WhatsAppTemplateRecord) => {
    try {
      const response = await fetch(`/api/whatsapp/templates/${template.id}/sync`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not sync template.');
      }

      toast({
        title: 'Status synced',
        description: `${template.name} was refreshed from WhatsApp.`,
      });
      await fetchTemplates();
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unexpected sync error.',
        variant: 'destructive',
      });
    }
  };

  const handleMediaUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/whatsapp/media-upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not upload media.');
      }

      setForm((current) => ({
        ...current,
        headerMediaUrl: result.url,
      }));

      toast({
        title: 'Media uploaded',
        description: 'Header media is ready for this template.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unexpected upload error.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const draftCount = countByStatus(templates, 'draft');
  const reviewCount = countByStatus(templates, 'pending_review');
  const approvedCount = countByStatus(templates, 'approved');

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(241,246,253,0.98)_62%,_rgba(248,251,255,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Template studio
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Templates</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                  Build polished WhatsApp templates with preview, approval workflow, variables, and reusable CTA buttons in one premium workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="rounded-full border-[#d6e0ed] bg-white/90 px-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]"
                onClick={() => void fetchTemplates()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                className="rounded-full bg-[#152033] px-5 text-white shadow-[0_16px_36px_rgba(21,32,51,0.18)] hover:bg-[#101827]"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[26px] border-[#dbe3ef] bg-[linear-gradient(135deg,_rgba(244,248,253,0.98),_rgba(232,240,251,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">All templates</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : templates.length}</p>
                <p className="mt-2 text-sm text-slate-500">Every template currently saved in the workspace.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[26px] border-[#dce5ef] bg-[linear-gradient(135deg,_rgba(245,251,247,0.98),_rgba(233,246,238,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approved</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : approvedCount}</p>
                <p className="mt-2 text-sm text-slate-500">Templates ready to send once conversations are eligible.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[26px] border-[#e1e0ef] bg-[linear-gradient(135deg,_rgba(248,246,252,0.98),_rgba(238,235,248,0.98))] shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Drafts / review</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : draftCount + reviewCount}</p>
                <p className="mt-2 text-sm text-slate-500">Work-in-progress templates still being refined or reviewed.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7083a8]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by template name, content, category, language..."
              className="h-14 rounded-[22px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(246,249,255,0.96))] pl-12 pr-4 text-sm text-[#152033] shadow-[0_14px_30px_rgba(33,51,84,0.07)] placeholder:text-[#7d8aa3]"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:w-[420px]">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | TemplateStatus)}>
              <SelectTrigger className="h-14 rounded-[22px] border-white/90 bg-white/95 px-4 text-sm text-[#152033] shadow-[0_14px_28px_rgba(33,51,84,0.06)]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center rounded-[22px] border border-[#dbe4f0] bg-white/90 px-5 text-sm font-medium text-[#61739a] shadow-[0_12px_24px_rgba(33,51,84,0.05)]">
              Showing {filteredTemplates.length} templates
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.78fr)]">
        <div className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-4 shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
          <div className="mb-4 flex items-center justify-between px-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7584a0]">Library</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">WhatsApp Templates</h2>
            </div>
          </div>

          {!isLoading && filteredTemplates.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#d8deea] bg-[#fafcff] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#5f7399]">
                <MessageSquareText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">No templates yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667691]">
                Start by creating your first reusable WhatsApp template for outreach, follow-up, or authentication.
              </p>
              <Button className="mt-5 rounded-full bg-[#152033] text-white hover:bg-[#101827]" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create template
              </Button>
            </div>
          ) : null}

          {filteredTemplates.length > 0 ? (
            <ScrollArea className="h-[720px] pr-3">
              <div className="space-y-4">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className="block w-full text-left"
                    >
                      <Card
                        className={cn(
                          'rounded-[28px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,253,0.98))] shadow-[0_16px_38px_rgba(33,51,84,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c4d5eb] hover:shadow-[0_24px_56px_rgba(33,51,84,0.10)]',
                          isSelected && 'border-[#9db2d4] shadow-[0_24px_56px_rgba(33,51,84,0.12)] ring-2 ring-[#dbe6f5]'
                        )}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-xl font-semibold tracking-[-0.04em] text-[#152033]">
                                  {template.name}
                                </h3>
                                <Badge variant="secondary" className={cn('rounded-full border px-3 py-1 text-xs font-medium', statusTone(template.status))}>
                                  {formatStatus(template.status)}
                                </Badge>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#556680]">
                                {template.bodyText}
                              </p>
                              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-[#7a89a3]">
                                <span>{template.category}</span>
                                <span>{template.language}</span>
                                <span>{template.buttons?.length ?? 0} buttons</span>
                                <span>{template.variables?.length ?? 0} vars</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-[#7c89a1]">
                              <p>Updated</p>
                              <p className="mt-1 font-semibold text-[#40516f]">{formatRelative(template.updatedAt)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          {selectedTemplate ? (
            <Card className="rounded-[30px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,253,0.98))] shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#61739a]">
                        <Wand2 className="h-3.5 w-3.5" />
                        Template preview
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">
                        {selectedTemplate.name}
                      </h2>
                      <p className="mt-1 text-sm text-[#667691]">
                        {selectedTemplate.category} · {selectedTemplate.language} · {selectedTemplate.headerType}
                      </p>
                    </div>
                    <Badge variant="secondary" className={cn('rounded-full border px-3 py-1 text-xs font-medium', statusTone(selectedTemplate.status))}>
                      {formatStatus(selectedTemplate.status)}
                    </Badge>
                  </div>

                  <div className="rounded-[28px] border border-[#dbe4f0] bg-[linear-gradient(180deg,_rgba(15,28,45,0.98),_rgba(35,49,72,0.98))] p-5 text-white shadow-[0_20px_40px_rgba(21,32,51,0.18)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                          <MessageSquareText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">WhatsApp Preview</p>
                          <p className="text-xs text-white/65">How the message feels once variables are resolved</p>
                        </div>
                      </div>
                      <Badge className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/10">
                        {selectedTemplate.headerType}
                      </Badge>
                    </div>

                    <div className="mt-5">
                      {renderPhonePreview(selectedTemplate)}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Variables</p>
                      <p className="mt-2 text-sm font-semibold text-[#152033]">{selectedTemplate.variables?.length ?? 0}</p>
                    </div>
                    <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Buttons</p>
                      <p className="mt-2 text-sm font-semibold text-[#152033]">{selectedTemplate.buttons?.length ?? 0}</p>
                    </div>
                    <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Updated</p>
                      <p className="mt-2 text-sm font-semibold text-[#152033]">{formatRelative(selectedTemplate.updatedAt)}</p>
                    </div>
                    <div className="rounded-[22px] border border-[#dbe4f0] bg-white/90 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Synced</p>
                      <p className="mt-2 text-sm font-semibold text-[#152033]">{formatRelative(selectedTemplate.lastSyncedAt || selectedTemplate.updatedAt)}</p>
                    </div>
                  </div>

                  {selectedTemplate.rejectionReason ? (
                    <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                      <p className="font-semibold">Review feedback</p>
                      <p className="mt-1">{selectedTemplate.rejectionReason}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-full bg-[#152033] text-white hover:bg-[#101827]" onClick={() => openEditDialog(selectedTemplate)}>
                      Edit template
                    </Button>
                    <Button variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90" onClick={() => void handleSubmitTemplate(selectedTemplate)}>
                      <Send className="mr-2 h-4 w-4" />
                      Submit for review
                    </Button>
                    <Button variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90" onClick={() => void handleSyncTemplate(selectedTemplate)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[30px] border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,253,0.98))] shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
              <CardContent className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#5f7399]">
                  <Globe2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">Select a template</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667691]">
                  Pick any saved template to inspect the content, buttons, placeholders, and approval status from the preview panel.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[30px] border-[#d9dfeb] p-0">
          <div className="grid h-full max-h-[92vh] grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.82fr)]">
            <div className="border-b border-[#e7edf5] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(247,250,254,0.98))] xl:border-b-0 xl:border-r">
              <ScrollArea className="h-[92vh] max-h-[92vh]">
                <div className="p-7">
                  <DialogHeader>
                    <DialogTitle className="text-2xl tracking-[-0.04em] text-[#152033]">
                      {form.id ? 'Edit Template' : 'Create Template'}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-[#667691]">
                      Configure content, placeholders, CTA buttons, and header media for a reusable WhatsApp template.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-6 space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template name</Label>
                        <Input
                          id="template-name"
                          value={form.name}
                          onChange={(event) => handleFormChange('name', event.target.value)}
                          placeholder="welcome_followup_ro"
                          className="h-12 rounded-[18px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-language">Language</Label>
                        <Input
                          id="template-language"
                          value={form.language}
                          onChange={(event) => handleFormChange('language', event.target.value)}
                          placeholder="ro"
                          className="h-12 rounded-[18px]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={form.category} onValueChange={(value) => handleFormChange('category', value as TemplateCategory)}>
                          <SelectTrigger className="h-12 rounded-[18px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Header type</Label>
                        <Select value={form.headerType} onValueChange={(value) => handleFormChange('headerType', value as TemplateHeaderType)}>
                          <SelectTrigger className="h-12 rounded-[18px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {headerTypeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {form.headerType === 'TEXT' ? (
                      <div className="space-y-2">
                        <Label htmlFor="header-text">Header text</Label>
                        <Input
                          id="header-text"
                          value={form.headerText}
                          onChange={(event) => handleFormChange('headerText', event.target.value)}
                          placeholder="Buna, {{1}}"
                          className="h-12 rounded-[18px]"
                        />
                      </div>
                    ) : null}

                    {form.headerType !== 'TEXT' && form.headerType !== 'NONE' ? (
                      <div className="space-y-3 rounded-[22px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label htmlFor="header-media">Header media URL</Label>
                            <p className="mt-1 text-xs text-[#7c89a1]">Upload once and keep the URL attached to the template.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full border-[#d6e0ed] bg-white"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload media'}
                          </Button>
                        </div>
                        <Input
                          id="header-media"
                          value={form.headerMediaUrl}
                          onChange={(event) => handleFormChange('headerMediaUrl', event.target.value)}
                          placeholder="https://..."
                          className="h-12 rounded-[18px]"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,.pdf,.doc,.docx"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleMediaUpload(file);
                            }
                            event.currentTarget.value = '';
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="body-text">Body</Label>
                      <Textarea
                        id="body-text"
                        value={form.bodyText}
                        onChange={(event) => handleFormChange('bodyText', event.target.value)}
                        placeholder="Salut {{1}}, am vazut ca aveti {{2}} listari active..."
                        className="min-h-[170px] rounded-[20px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="footer-text">Footer</Label>
                      <Input
                        id="footer-text"
                        value={form.footerText}
                        onChange={(event) => handleFormChange('footerText', event.target.value)}
                        placeholder="Agent Finder Pro"
                        className="h-12 rounded-[18px]"
                      />
                    </div>

                    <div className="rounded-[24px] border border-[#dbe4f0] bg-[linear-gradient(145deg,_rgba(248,251,255,0.98),_rgba(255,255,255,0.95))] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#152033]">Variables</p>
                          <p className="mt-1 text-xs text-[#7c89a1]">Detected automatically from placeholders like {'{{1}}'} and {'{{2}}'}.</p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90 text-[#61739a]">
                          {form.variables.length} detected
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-4">
                        {form.variables.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#d7e1ee] bg-white/90 px-4 py-5 text-sm text-[#71819b]">
                            Add placeholders in the header or body to define dynamic fields.
                          </div>
                        ) : (
                          form.variables.map((variable, index) => (
                            <div key={variable.key} className="grid gap-3 rounded-[18px] border border-[#e0e7f1] bg-white/90 p-4 md:grid-cols-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c89a1]">Placeholder</p>
                                <p className="mt-2 text-sm font-semibold text-[#152033]">{`{{${variable.key}}}`}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Sample value</Label>
                                <Input
                                  value={variable.sample}
                                  onChange={(event) => handleVariableChange(index, 'sample', event.target.value)}
                                  className="h-11 rounded-[16px]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Source field</Label>
                                <Input
                                  value={variable.sourceField || ''}
                                  onChange={(event) => handleVariableChange(index, 'sourceField', event.target.value)}
                                  placeholder="full_name"
                                  className="h-11 rounded-[16px]"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#dbe4f0] bg-[linear-gradient(145deg,_rgba(248,251,255,0.98),_rgba(255,255,255,0.95))] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#152033]">Buttons</p>
                          <p className="mt-1 text-xs text-[#7c89a1]">Use up to 3 CTAs for quick reply, URL, or phone actions.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-[#d6e0ed] bg-white/90"
                          onClick={handleAddButton}
                          disabled={form.buttons.length >= 3}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add button
                        </Button>
                      </div>

                      <div className="mt-4 space-y-4">
                        {form.buttons.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#d7e1ee] bg-white/90 px-4 py-5 text-sm text-[#71819b]">
                            No CTA buttons yet. Add one if this template needs a direct action.
                          </div>
                        ) : (
                          form.buttons.map((button, index) => (
                            <div key={`${button.type}-${index}`} className="space-y-3 rounded-[18px] border border-[#e0e7f1] bg-white/90 p-4">
                              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                <div className="space-y-2">
                                  <Label>Type</Label>
                                  <Select
                                    value={button.type}
                                    onValueChange={(value) => handleButtonChange(index, 'type', value)}
                                  >
                                    <SelectTrigger className="h-11 rounded-[16px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {buttonTypeOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Label</Label>
                                  <Input
                                    value={button.text}
                                    onChange={(event) => handleButtonChange(index, 'text', event.target.value)}
                                    placeholder="Book a call"
                                    className="h-11 rounded-[16px]"
                                  />
                                </div>
                                <div className="self-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                    onClick={() => handleRemoveButton(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>

                              {button.type === 'URL' ? (
                                <div className="space-y-2">
                                  <Label>URL</Label>
                                  <Input
                                    value={button.url || ''}
                                    onChange={(event) => handleButtonChange(index, 'url', event.target.value)}
                                    placeholder="https://agentfinder.pro/demo"
                                    className="h-11 rounded-[16px]"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label>{button.type === 'PHONE_NUMBER' ? 'Phone number' : 'Payload'}</Label>
                                  <Input
                                    value={button.payload || ''}
                                    onChange={(event) => handleButtonChange(index, 'payload', event.target.value)}
                                    placeholder={button.type === 'PHONE_NUMBER' ? '+40712345678' : 'reply_demo'}
                                    className="h-11 rounded-[16px]"
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-7 border-t border-[#e8edf4] pt-5">
                    <Button type="button" variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90" onClick={() => setEditorOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" className="rounded-full bg-[#152033] text-white hover:bg-[#101827]" onClick={() => void handleSaveTemplate()} disabled={isSaving}>
                      {isSaving ? 'Saving...' : form.id ? 'Save changes' : 'Create template'}
                    </Button>
                  </DialogFooter>
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="h-[92vh] max-h-[92vh]">
              <div className="bg-[linear-gradient(180deg,_rgba(18,30,48,0.98),_rgba(31,45,67,0.98))] p-7 text-white">
                <div className="flex items-center gap-2 text-white/75">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Live preview</p>
                </div>

                <div className="mt-5">
                  {renderPhonePreview({
                    headerType: form.headerType,
                    headerText: form.headerText,
                    headerMediaUrl: form.headerMediaUrl,
                    bodyText: form.bodyText,
                    footerText: form.footerText,
                    buttons: form.buttons,
                    variables: form.variables,
                  })}
                </div>

                <div className="mt-6 space-y-4 pb-6">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock3 className="h-4 w-4" />
                      <p className="text-sm font-semibold">Approval readiness</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/68">
                      Keep names machine-friendly, stay inside WhatsApp policy, and make placeholders readable with realistic examples.
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Upload className="h-4 w-4" />
                      <p className="text-sm font-semibold">Media headers</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/68">
                      Image, video, and document headers can be uploaded directly here and stored as reusable media URLs.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
