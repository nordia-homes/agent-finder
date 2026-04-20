'use client';

import { useMemo, useState, useTransition } from 'react';
import { collection } from 'firebase/firestore';
import {
  BellRing,
  Bot,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Workflow,
} from 'lucide-react';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { useAICallDashboard } from '@/hooks/use-ai-call-dashboard';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppDashboard } from '@/hooks/use-whatsapp-dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

type WhatsAppDashboardPayload = {
  health?: {
    infobipConfigured?: boolean;
    webhookActive?: boolean;
    approvedTemplatesAvailable?: boolean;
    schedulerActive?: boolean;
  };
  templates?: Array<{ status?: string }>;
  campaigns?: Array<{ status?: string }>;
};

type AICallDashboardPayload = {
  health?: {
    vapiConfigured?: boolean;
    assistantProfilesAvailable?: boolean;
    activeCampaigns?: number;
  };
  assistants?: Array<unknown>;
  workspace?: {
    assistants?: Array<unknown>;
  };
  campaigns?: Array<{ status?: string }>;
};

type ToggleSetting = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'AF').trim();
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AF';
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'warn' | 'muted';
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium',
        tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-700',
        tone === 'muted' && 'border-slate-200 bg-slate-50 text-slate-600'
      )}
    >
      {label}
    </Badge>
  );
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-[#dbe3ef] bg-white/80 p-4 shadow-[0_14px_30px_rgba(36,52,84,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export default function SettingsPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [notes, setNotes] = useState(
    'Keep this workspace focused on commercial execution: clean intake, fast outreach, and clear ownership across follow-ups.'
  );
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    role: 'Workspace admin',
    timezone: 'Europe/Bucharest',
  });
  const [toggles, setToggles] = useState<ToggleSetting[]>([
    {
      id: 'dailyDigest',
      label: 'Daily activity digest',
      description: 'Show a compact operational summary when the team opens the workspace.',
      enabled: true,
    },
    {
      id: 'leadAlerts',
      label: 'Lead reply alerts',
      description: 'Highlight inbound activity that needs a human follow-up quickly.',
      enabled: true,
    },
    {
      id: 'automationGuardrails',
      label: 'Automation guardrails',
      description: 'Keep channel health checks visible before campaigns are launched.',
      enabled: true,
    },
    {
      id: 'compactMetrics',
      label: 'Compact KPI mode',
      description: 'Prefer tighter metric blocks and shorter summaries across ops pages.',
      enabled: false,
    },
  ]);

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const tasksQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'tasks');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: tasks, loading: tasksLoading } = useCollection<Task>(tasksQuery);
  const {
    data: whatsappDashboard,
    loading: whatsappLoading,
    refresh: refreshWhatsApp,
    error: whatsappError,
  } = useWhatsAppDashboard<WhatsAppDashboardPayload>();
  const {
    data: aiDashboard,
    loading: aiLoading,
    refresh: refreshAI,
    error: aiError,
  } = useAICallDashboard<AICallDashboardPayload>();

  const isLoading = userLoading || leadsLoading || tasksLoading;
  const activeLeadCount = (leads || []).filter((lead) => !lead.archived_at).length;
  const openTasks = (tasks || []).filter((task) => !task.completed).length;
  const completedTasks = (tasks || []).filter((task) => task.completed).length;
  const savedAssistantCount = aiDashboard?.assistants?.length ?? 0;
  const remoteAssistantCount = aiDashboard?.workspace?.assistants?.length ?? 0;
  const assistantProfilesAvailable = Boolean(aiDashboard?.health?.assistantProfilesAvailable);

  const whatsappReadyChecks = [
    Boolean(whatsappDashboard?.health?.infobipConfigured),
    Boolean(whatsappDashboard?.health?.webhookActive),
    Boolean(whatsappDashboard?.health?.approvedTemplatesAvailable),
    Boolean(whatsappDashboard?.health?.schedulerActive),
  ];

  const aiReadyChecks = [
    Boolean(aiDashboard?.health?.vapiConfigured),
    assistantProfilesAvailable,
    typeof aiDashboard?.health?.activeCampaigns === 'number',
  ];

  const readinessScore = Math.round(
    ((whatsappReadyChecks.filter(Boolean).length + aiReadyChecks.filter(Boolean).length) /
      (whatsappReadyChecks.length + aiReadyChecks.length || 1)) *
      100
  );

  const recommendedActions = [
    !whatsappDashboard?.health?.approvedTemplatesAvailable ? 'Approve at least one WhatsApp template for live follow-up.' : null,
    !whatsappDashboard?.health?.webhookActive ? 'Validate inbound and status webhooks so conversation timelines stay current.' : null,
    !assistantProfilesAvailable ? 'Create or sync a Vapi assistant before launching AI call campaigns.' : null,
    openTasks > 25 ? 'Open task load is high. Consider triage rules or owner rebalancing.' : null,
  ].filter(Boolean) as string[];

  function handleToggleChange(id: string, enabled: boolean) {
    setToggles((current) =>
      current.map((toggle) => (toggle.id === id ? { ...toggle, enabled } : toggle))
    );
  }

  function handleSavePreferences() {
    startSaving(() => {
      toast({
        title: 'Settings saved locally',
        description: 'Your operator preferences and workspace notes were updated for this session.',
      });
    });
  }

  async function handleRefreshHealth() {
    await Promise.all([refreshWhatsApp(), refreshAI()]);
    toast({
      title: 'Channel health refreshed',
      description: 'Settings now reflect the latest WhatsApp and AI call backend status.',
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-[#dbe3ef] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(240,246,255,0.95)_52%,_rgba(247,250,255,0.98)_100%)] p-6 shadow-[0_24px_60px_rgba(36,52,84,0.10)] md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d5dfec] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-[#5c7198]" />
              Settings
            </div>
            <div>
              <h1 className="font-headline text-4xl tracking-[-0.05em] text-slate-900">Workspace control center</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Tune how the team operates, monitor channel readiness, and keep the CRM workspace clean enough for fast daily execution.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-full" onClick={() => void handleRefreshHealth()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh health
            </Button>
            <Button className="rounded-full" onClick={handleSavePreferences} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Save preferences
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Readiness"
            value={`${readinessScore}%`}
            helper="Overall channel and workspace setup confidence."
          />
          <MetricTile
            label="Leads"
            value={isLoading ? '...' : activeLeadCount.toString()}
            helper="Active lead records currently available to the team."
          />
          <MetricTile
            label="Open tasks"
            value={isLoading ? '...' : openTasks.toString()}
            helper={`${completedTasks} tasks completed so far.`}
          />
          <MetricTile
            label="Channels"
            value={`${Number(Boolean(whatsappDashboard?.health?.infobipConfigured)) + Number(Boolean(aiDashboard?.health?.vapiConfigured))}/2`}
            helper="Primary outbound systems connected in production."
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="rounded-[30px] border-[#dbe3ef] bg-white/90 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="font-headline text-[1.8rem] tracking-[-0.04em] text-slate-900">Profile & workspace identity</CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep the visible operator identity aligned with the person actually running the CRM and commercial channels.
                </CardDescription>
              </div>
              <StatusBadge label={user ? 'Authenticated' : 'Signed out'} tone={user ? 'good' : 'warn'} />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 rounded-[28px] border border-[#e2e8f2] bg-[linear-gradient(180deg,_rgba(247,250,255,0.96),_rgba(255,255,255,0.96))] p-5 md:flex-row md:items-center">
                <Avatar className="h-16 w-16 border border-[#d7deea]">
                  <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'User avatar'} />
                  <AvatarFallback className="bg-[#eef3fb] text-lg font-semibold text-[#586d94]">
                    {getInitials(user?.displayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">{user?.displayName || 'Workspace operator'}</p>
                  <p className="text-sm text-slate-500">{user?.email || 'No user email available'}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <StatusBadge label={profile.role} tone="muted" />
                    <StatusBadge label={profile.timezone} tone="muted" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                    placeholder="Add operator name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Add operator email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role label</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={profile.timezone}
                    onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspaceNotes">Workspace note</Label>
                <Textarea
                  id="workspaceNotes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#dbe3ef] bg-white/90 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader>
              <CardTitle className="font-headline text-[1.8rem] tracking-[-0.04em] text-slate-900">Operating preferences</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
                Light operator controls for how this workspace should behave while the team is triaging, following up, and launching outbound motions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {toggles.map((toggle) => (
                <div
                  key={toggle.id}
                  className="flex items-start justify-between gap-4 rounded-[24px] border border-[#e2e8f2] bg-[linear-gradient(180deg,_rgba(249,251,255,0.95),_rgba(255,255,255,0.95))] p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{toggle.label}</p>
                    <p className="text-sm leading-6 text-slate-500">{toggle.description}</p>
                  </div>
                  <Switch checked={toggle.enabled} onCheckedChange={(checked) => handleToggleChange(toggle.id, checked)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[30px] border-[#dbe3ef] bg-white/90 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader>
              <CardTitle className="font-headline text-[1.8rem] tracking-[-0.04em] text-slate-900">Channel health</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
                Live readiness across WhatsApp and AI calls, so the team sees configuration gaps before they become delivery problems.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[24px] border border-[#e2e8f2] bg-[linear-gradient(180deg,_rgba(245,250,255,0.96),_rgba(255,255,255,0.98))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#eef3fb] p-3 text-[#5d7098]">
                      <Workflow className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Workspace readiness</p>
                      <p className="text-sm text-slate-500">A simple score based on channel health checks.</p>
                    </div>
                  </div>
                  <StatusBadge
                    label={readinessScore >= 80 ? 'Strong' : readinessScore >= 50 ? 'Partial' : 'Needs work'}
                    tone={readinessScore >= 80 ? 'good' : readinessScore >= 50 ? 'warn' : 'muted'}
                  />
                </div>
                <div className="mt-4">
                  <Progress value={readinessScore} className="h-3 rounded-full bg-[#e7eef9]" />
                  <p className="mt-3 text-sm text-slate-500">{readinessScore}% of baseline production checks currently pass.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-[#e2e8f2] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-[#5d7098]" />
                      <p className="font-medium text-slate-900">WhatsApp</p>
                    </div>
                    <StatusBadge
                      label={
                        whatsappLoading
                          ? 'Checking'
                          : whatsappDashboard?.health?.infobipConfigured
                          ? 'Configured'
                          : 'Not configured'
                      }
                      tone={
                        whatsappLoading
                          ? 'muted'
                          : whatsappDashboard?.health?.infobipConfigured
                          ? 'good'
                          : 'warn'
                      }
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge label={whatsappDashboard?.health?.webhookActive ? 'Webhook live' : 'Webhook silent'} tone={whatsappDashboard?.health?.webhookActive ? 'good' : 'warn'} />
                    <StatusBadge label={whatsappDashboard?.health?.approvedTemplatesAvailable ? 'Templates ready' : 'No approved templates'} tone={whatsappDashboard?.health?.approvedTemplatesAvailable ? 'good' : 'warn'} />
                    <StatusBadge label={whatsappDashboard?.health?.schedulerActive ? 'Scheduler active' : 'Scheduler idle'} tone={whatsappDashboard?.health?.schedulerActive ? 'good' : 'muted'} />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    {whatsappError
                      ? `WhatsApp health could not be loaded: ${whatsappError}`
                      : `${whatsappDashboard?.templates?.length ?? 0} templates and ${whatsappDashboard?.campaigns?.length ?? 0} campaigns are visible from the dashboard feed.`}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#e2e8f2] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-[#5d7098]" />
                      <p className="font-medium text-slate-900">AI calls</p>
                    </div>
                    <StatusBadge
                      label={
                        aiLoading
                          ? 'Checking'
                          : aiDashboard?.health?.vapiConfigured
                          ? 'Configured'
                          : 'Not configured'
                      }
                      tone={aiLoading ? 'muted' : aiDashboard?.health?.vapiConfigured ? 'good' : 'warn'}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge label={assistantProfilesAvailable ? 'Assistants ready' : 'No assistants'} tone={assistantProfilesAvailable ? 'good' : 'warn'} />
                    <StatusBadge label={`${aiDashboard?.health?.activeCampaigns ?? 0} active campaigns`} tone="muted" />
                    <StatusBadge label={`${savedAssistantCount} saved profiles`} tone="muted" />
                    <StatusBadge label={`${remoteAssistantCount} Vapi assistants`} tone="muted" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    {aiError
                      ? `AI call health could not be loaded: ${aiError}`
                      : `${aiDashboard?.campaigns?.length ?? 0} AI call campaigns are available for review. Settings currently sees ${remoteAssistantCount} assistant${remoteAssistantCount === 1 ? '' : 's'} from Vapi and ${savedAssistantCount} saved profile${savedAssistantCount === 1 ? '' : 's'} in Firestore.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#dbe3ef] bg-white/90 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader>
              <CardTitle className="font-headline text-[1.8rem] tracking-[-0.04em] text-slate-900">Workspace system map</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
                Quick reference for the environment this app is currently running against.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-[#e2e8f2] p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-[#5d7098]" />
                  <div>
                    <p className="font-medium text-slate-900">Firebase project</p>
                    <p className="text-sm text-slate-500">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Unavailable in client env'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-[#e2e8f2] p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-[#5d7098]" />
                  <div>
                    <p className="font-medium text-slate-900">Auth domain</p>
                    <p className="text-sm text-slate-500">{process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Unavailable in client env'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-[#e2e8f2] p-4">
                <div className="flex items-center gap-3">
                  <BellRing className="h-5 w-5 text-[#5d7098]" />
                  <div>
                    <p className="font-medium text-slate-900">Storage bucket</p>
                    <p className="text-sm text-slate-500">{process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'Unavailable in client env'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#dbe3ef] bg-white/90 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
            <CardHeader>
              <CardTitle className="font-headline text-[1.8rem] tracking-[-0.04em] text-slate-900">Recommended next actions</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-500">
                Focus areas that will improve day-to-day execution quality the fastest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedActions.length === 0 ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Core channel checks look healthy. The workspace is ready for routine daily operation.
                </div>
              ) : (
                recommendedActions.map((action) => (
                  <div key={action} className="flex items-start gap-3 rounded-[24px] border border-[#e2e8f2] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#5d7098]" />
                    <p className="text-sm leading-6 text-slate-600">{action}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[26px] border border-[#dbe3ef] bg-white/90 p-5 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <div className="flex items-center gap-3">
            <UserCircle2 className="h-5 w-5 text-[#5d7098]" />
            <p className="font-medium text-slate-900">User session</p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{user ? 'Active' : 'Idle'}</p>
          <p className="mt-2 text-sm text-slate-500">Authentication status for the current workspace operator.</p>
        </div>

        <div className="rounded-[26px] border border-[#dbe3ef] bg-white/90 p-5 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <div className="flex items-center gap-3">
            <Workflow className="h-5 w-5 text-[#5d7098]" />
            <p className="font-medium text-slate-900">Execution load</p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{openTasks}</p>
          <p className="mt-2 text-sm text-slate-500">Open tasks still waiting for a human or automated action.</p>
        </div>

        <div className="rounded-[26px] border border-[#dbe3ef] bg-white/90 p-5 shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-[#5d7098]" />
            <p className="font-medium text-slate-900">Pipeline footprint</p>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{activeLeadCount}</p>
          <p className="mt-2 text-sm text-slate-500">Lead records currently shaping the commercial pipeline.</p>
        </div>
      </section>
    </div>
  );
}
