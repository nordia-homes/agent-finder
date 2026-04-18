'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, RefreshCw, Save, WandSparkles, X } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type DashboardRecord = Record<string, any>;

const MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  ],
  google: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
};

const VOICE_PROVIDER_OPTIONS = [
  { value: '11labs', label: 'ElevenLabs' },
  { value: 'vapi', label: 'Vapi' },
  { value: 'azure', label: 'Azure' },
  { value: 'cartesia', label: 'Cartesia' },
];

const TRANSCRIBER_PROVIDER_OPTIONS = [
  { value: 'deepgram', label: 'Deepgram' },
  { value: 'gladia', label: 'Gladia' },
  { value: 'assembly-ai', label: 'AssemblyAI' },
  { value: 'talkscriber', label: 'Talkscriber' },
];

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonField(value: string, label: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export function ManagedAssistantEditor({
  open,
  onOpenChange,
  assistantId,
  tools,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantId: string | null;
  tools: DashboardRecord[];
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assistant, setAssistant] = useState<DashboardRecord | null>(null);
  const [activeTab, setActiveTab] = useState('model');
  const [form, setForm] = useState({
    name: '',
    firstMessage: '',
    firstMessageMode: 'assistant-speaks-first',
    voicemailDetection: 'off',
    maxDurationSeconds: '600',
    modelProvider: '',
    modelName: '',
    systemPrompt: '',
    messagesJson: '[]',
    voiceProvider: '',
    voiceId: '',
    voiceJson: '{}',
    transcriberProvider: '',
    language: '',
    transcriberJson: '{}',
    toolIds: [] as string[],
    toolIdsText: '',
    serverUrl: '',
    serverJson: '{}',
    analysisJson: '{}',
    complianceJson: '{}',
    monitorJson: '{}',
    advancedJson: '{}',
    fullPatchJson: '{}',
  });

  const toolOptions = useMemo(
    () =>
      tools.map((tool) => ({
        id: String(tool.id),
        label: String(tool.name || tool.type || tool.id),
      })),
    [tools]
  );
  const modelOptions = MODEL_OPTIONS[form.modelProvider] ?? [];

  async function loadAssistant() {
    if (!assistantId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-calls/vapi/assistants/${assistantId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load Vapi assistant.');
      }

      const systemMessage = Array.isArray(payload.model?.messages)
        ? payload.model.messages.find((message: Record<string, unknown>) => message.role === 'system')
        : null;

      setAssistant(payload);
      setForm({
        name: String(payload.name ?? ''),
        firstMessage: String(payload.firstMessage ?? ''),
        firstMessageMode: String(payload.firstMessageMode ?? 'assistant-speaks-first'),
        voicemailDetection: String(payload.voicemailDetection ?? 'off'),
        maxDurationSeconds: String(payload.maxDurationSeconds ?? 600),
        modelProvider: String(payload.model?.provider ?? ''),
        modelName: String(payload.model?.model ?? ''),
        systemPrompt: String(systemMessage?.content ?? ''),
        messagesJson: prettyJson(payload.model?.messages ?? []),
        voiceProvider: String(payload.voice?.provider ?? ''),
        voiceId: String(payload.voice?.voiceId ?? payload.voice?.voice ?? ''),
        voiceJson: prettyJson(payload.voice ?? {}),
        transcriberProvider: String(payload.transcriber?.provider ?? ''),
        language: String(payload.transcriber?.language ?? ''),
        transcriberJson: prettyJson(payload.transcriber ?? {}),
        toolIds: Array.isArray(payload.model?.toolIds) ? payload.model.toolIds.map(String) : [],
        toolIdsText: Array.isArray(payload.model?.toolIds) ? payload.model.toolIds.join(', ') : '',
        serverUrl: String(payload.server?.url ?? ''),
        serverJson: prettyJson(payload.server ?? {}),
        analysisJson: prettyJson(payload.analysisPlan ?? payload.analysis ?? {}),
        complianceJson: prettyJson(payload.compliancePlan ?? payload.compliance ?? {}),
        monitorJson: prettyJson(payload.monitorPlan ?? payload.monitors ?? {}),
        advancedJson: prettyJson({
          backgroundSound: payload.backgroundSound,
          endCallMessage: payload.endCallMessage,
          endCallPhrases: payload.endCallPhrases,
          silenceTimeoutSeconds: payload.silenceTimeoutSeconds,
          responseDelaySeconds: payload.responseDelaySeconds,
          hipaaEnabled: payload.hipaaEnabled,
          backchannelingEnabled: payload.backchannelingEnabled,
        }),
        fullPatchJson: prettyJson(payload),
      });
    } catch (error) {
      toast({
        title: 'Assistant load failed',
        description: error instanceof Error ? error.message : 'Unexpected assistant load error.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && assistantId) {
      void loadAssistant();
    }
  }, [open, assistantId]);

  async function saveStructuredPatch() {
    if (!assistantId) return;
    setSaving(true);
    try {
      const messages = parseJsonField(form.messagesJson, 'Model messages');
      const voice = parseJsonField(form.voiceJson, 'Voice JSON');
      const transcriber = parseJsonField(form.transcriberJson, 'Transcriber JSON');
      const server = parseJsonField(form.serverJson, 'Server JSON');
      const analysis = parseJsonField(form.analysisJson, 'Analysis JSON');
      const compliance = parseJsonField(form.complianceJson, 'Compliance JSON');
      const monitors = parseJsonField(form.monitorJson, 'Monitors JSON');
      const advanced = parseJsonField(form.advancedJson, 'Advanced JSON');

      const patch = {
        name: form.name,
        firstMessage: form.firstMessage,
        firstMessageMode: form.firstMessageMode,
        voicemailDetection: form.voicemailDetection,
        maxDurationSeconds: Number(form.maxDurationSeconds),
        model: {
          ...(assistant?.model ?? {}),
          provider: form.modelProvider,
          model: form.modelName,
          messages,
          toolIds: form.toolIds.length > 0
            ? form.toolIds
            : form.toolIdsText.split(',').map((item) => item.trim()).filter(Boolean),
        },
        voice: {
          ...voice,
          provider: form.voiceProvider || voice.provider,
          voiceId: form.voiceId || voice.voiceId || voice.voice,
        },
        transcriber: {
          ...transcriber,
          provider: form.transcriberProvider || transcriber.provider,
          language: form.language || transcriber.language,
        },
        server: form.serverUrl ? { ...server, url: form.serverUrl } : server,
        analysisPlan: analysis,
        compliancePlan: compliance,
        monitorPlan: monitors,
        ...advanced,
      };

      const response = await fetch('/api/ai-calls/vapi/assistants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          patch,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update assistant.');
      }

      toast({
        title: 'Assistant updated',
        description: 'The assistant was updated with the full structured patch.',
      });
      await onSaved();
      await loadAssistant();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unexpected save error.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveRawPatch() {
    if (!assistantId) return;
    setSaving(true);
    try {
      const patch = parseJsonField(form.fullPatchJson, 'Full assistant JSON');
      const response = await fetch('/api/ai-calls/vapi/assistants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          patch,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update assistant from raw JSON.');
      }

      toast({
        title: 'Raw patch applied',
        description: 'The full assistant JSON patch was sent to Vapi.',
      });
      await onSaved();
      await loadAssistant();
    } catch (error) {
      toast({
        title: 'Raw patch failed',
        description: error instanceof Error ? error.message : 'Unexpected raw patch error.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] h-[94vh] overflow-hidden border-slate-200 bg-[#f4f6fb] p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Bot className="h-6 w-6 text-primary" />
                  {form.name || 'Managed Vapi Assistant'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Full-screen editor inspired by the Vapi assistant workspace, with structured sections and raw JSON fallback.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{assistantId || 'No assistant selected'}</Badge>
                <Button variant="outline" size="sm" onClick={() => void loadAssistant()} disabled={loading || saving}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Reload
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-slate-200 bg-white px-6 py-3">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="model">Model</TabsTrigger>
                  <TabsTrigger value="voice">Voice</TabsTrigger>
                  <TabsTrigger value="transcriber">Transcriber</TabsTrigger>
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
                    <TabsContent value="model" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Core Behavior</h3>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>First Message Mode</Label>
                              <Input value={form.firstMessageMode} onChange={(event) => setForm((current) => ({ ...current, firstMessageMode: event.target.value }))} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>First Message</Label>
                              <Input value={form.firstMessage} onChange={(event) => setForm((current) => ({ ...current, firstMessage: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Model Provider</Label>
                              <Select
                                value={form.modelProvider}
                                onValueChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    modelProvider: value,
                                    modelName: MODEL_OPTIONS[value]?.some((model) => model.value === current.modelName)
                                      ? current.modelName
                                      : MODEL_OPTIONS[value]?.[0]?.value ?? current.modelName,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="anthropic">Anthropic</SelectItem>
                                  <SelectItem value="openai">OpenAI</SelectItem>
                                  <SelectItem value="google">Google</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Model Name</Label>
                              <Select value={form.modelName} onValueChange={(value) => setForm((current) => ({ ...current, modelName: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose model" />
                                </SelectTrigger>
                                <SelectContent>
                                  {modelOptions.length > 0 ? (
                                    modelOptions.map((model) => (
                                      <SelectItem key={model.value} value={model.value}>
                                        {model.label}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value={form.modelName || 'custom-model'}>
                                      {form.modelName || 'Custom model'}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>System Prompt</Label>
                              <Textarea rows={14} value={form.systemPrompt} onChange={(event) => {
                                const prompt = event.target.value;
                                setForm((current) => {
                                  const messages = parseJsonField(current.messagesJson, 'Model messages');
                                  const nextMessages = Array.isArray(messages)
                                    ? [
                                        { role: 'system', content: prompt },
                                        ...messages.filter((message: Record<string, unknown>) => message.role !== 'system'),
                                      ]
                                    : [{ role: 'system', content: prompt }];
                                  return {
                                    ...current,
                                    systemPrompt: prompt,
                                    messagesJson: prettyJson(nextMessages),
                                  };
                                });
                              }} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Messages JSON</h3>
                          <p className="mt-2 text-sm text-slate-500">Keep this aligned with the system prompt above for a Vapi-like model editor.</p>
                          <Textarea className="mt-4 min-h-[420px] font-mono text-sm" value={form.messagesJson} onChange={(event) => setForm((current) => ({ ...current, messagesJson: event.target.value }))} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="voice" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Voice Basics</h3>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Voice Provider</Label>
                              <Select value={form.voiceProvider} onValueChange={(value) => setForm((current) => ({ ...current, voiceProvider: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose voice provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {VOICE_PROVIDER_OPTIONS.map((provider) => (
                                    <SelectItem key={provider.value} value={provider.value}>
                                      {provider.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Voice ID</Label>
                              <Input value={form.voiceId} onChange={(event) => setForm((current) => ({ ...current, voiceId: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Voicemail Detection</Label>
                              <Input value={form.voicemailDetection} onChange={(event) => setForm((current) => ({ ...current, voicemailDetection: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Duration (s)</Label>
                              <Input value={form.maxDurationSeconds} onChange={(event) => setForm((current) => ({ ...current, maxDurationSeconds: event.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Voice JSON</h3>
                          <Textarea className="mt-4 min-h-[420px] font-mono text-sm" value={form.voiceJson} onChange={(event) => setForm((current) => ({ ...current, voiceJson: event.target.value }))} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="transcriber" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Transcriber Basics</h3>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Provider</Label>
                              <Select value={form.transcriberProvider} onValueChange={(value) => setForm((current) => ({ ...current, transcriberProvider: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose transcriber" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRANSCRIBER_PROVIDER_OPTIONS.map((provider) => (
                                    <SelectItem key={provider.value} value={provider.value}>
                                      {provider.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Language</Label>
                              <Input value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Silence Timeout / endpointing lives in JSON</Label>
                              <Input value={assistant?.transcriber?.endUtteranceSilenceThreshold ?? ''} disabled />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Transcriber JSON</h3>
                          <Textarea className="mt-4 min-h-[420px] font-mono text-sm" value={form.transcriberJson} onChange={(event) => setForm((current) => ({ ...current, transcriberJson: event.target.value }))} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tools" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Tool Attachments</h3>
                          <div className="mt-5 space-y-4">
                            <div className="space-y-2">
                              <Label>Quick Select</Label>
                              <Select
                                value=""
                                onValueChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    toolIds: Array.from(new Set([...current.toolIds, value])),
                                    toolIdsText: Array.from(new Set([...current.toolIds, value])).join(', '),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Attach a tool from Vapi" />
                                </SelectTrigger>
                                <SelectContent>
                                  {toolOptions.map((tool) => (
                                    <SelectItem key={tool.id} value={tool.id}>
                                      {tool.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tool IDs</Label>
                              <Textarea rows={8} value={form.toolIdsText} onChange={(event) => setForm((current) => ({ ...current, toolIdsText: event.target.value, toolIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {form.toolIds.map((toolId) => (
                                <Badge key={toolId} variant="outline" className="cursor-pointer" onClick={() => setForm((current) => {
                                  const next = current.toolIds.filter((id) => id !== toolId);
                                  return { ...current, toolIds: next, toolIdsText: next.join(', ') };
                                })}>
                                  {toolId}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Available Tools</h3>
                          <div className="mt-4 grid gap-3">
                            {toolOptions.length === 0 ? (
                              <p className="text-sm text-slate-500">No Vapi tools returned from the account.</p>
                            ) : (
                              toolOptions.map((tool) => (
                                <button
                                  key={tool.id}
                                  type="button"
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                                  onClick={() =>
                                    setForm((current) => {
                                      const next = Array.from(new Set([...current.toolIds, tool.id]));
                                      return { ...current, toolIds: next, toolIdsText: next.join(', ') };
                                    })
                                  }
                                >
                                  <div className="font-medium text-slate-900">{tool.label}</div>
                                  <div className="text-xs text-slate-500">{tool.id}</div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="analysis" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 lg:col-span-2">
                          <h3 className="text-xl font-semibold text-slate-900">Analysis / Structured Outputs</h3>
                          <Textarea className="mt-4 min-h-[420px] font-mono text-sm" value={form.analysisJson} onChange={(event) => setForm((current) => ({ ...current, analysisJson: event.target.value }))} />
                        </div>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Compliance / Monitors</h3>
                          <Label className="mt-4 block">Compliance JSON</Label>
                          <Textarea className="mt-2 min-h-[180px] font-mono text-sm" value={form.complianceJson} onChange={(event) => setForm((current) => ({ ...current, complianceJson: event.target.value }))} />
                          <Label className="mt-4 block">Monitor JSON</Label>
                          <Textarea className="mt-2 min-h-[180px] font-mono text-sm" value={form.monitorJson} onChange={(event) => setForm((current) => ({ ...current, monitorJson: event.target.value }))} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="mt-0 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Server / Webhook Configuration</h3>
                          <div className="mt-5 space-y-4">
                            <div className="space-y-2">
                              <Label>Server URL</Label>
                              <Input value={form.serverUrl} onChange={(event) => setForm((current) => ({ ...current, serverUrl: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Server JSON</Label>
                              <Textarea className="min-h-[220px] font-mono text-sm" value={form.serverJson} onChange={(event) => setForm((current) => ({ ...current, serverJson: event.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                          <h3 className="text-xl font-semibold text-slate-900">Advanced Configuration</h3>
                          <p className="mt-2 text-sm text-slate-500">Use this section for fields not yet modeled by dedicated controls.</p>
                          <Textarea className="mt-4 min-h-[320px] font-mono text-sm" value={form.advancedJson} onChange={(event) => setForm((current) => ({ ...current, advancedJson: event.target.value }))} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="raw" className="mt-0 space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">Full Assistant JSON</h3>
                            <p className="mt-1 text-sm text-slate-500">This is the escape hatch for any Vapi field not covered by the structured sections.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, fullPatchJson: prettyJson(assistant) }))}>
                            <WandSparkles className="mr-2 h-4 w-4" />
                            Reset To Loaded
                          </Button>
                        </div>
                        <Textarea className="mt-4 min-h-[620px] font-mono text-sm" value={form.fullPatchJson} onChange={(event) => setForm((current) => ({ ...current, fullPatchJson: event.target.value }))} />
                      </div>
                    </TabsContent>
                  </div>
              </div>
            </Tabs>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Structured tabs cover the main Vapi sections, while Raw JSON lets you patch anything else.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={() => void saveStructuredPatch()} disabled={saving || loading}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Structured
                </Button>
                <Button onClick={() => void saveRawPatch()} disabled={saving || loading}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Raw JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
