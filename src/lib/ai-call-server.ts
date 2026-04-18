import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { adminDb } from '@/lib/firebase-admin';
import { getRequiredVapiConfig, hasVapiConfig } from '@/lib/env.server';
import {
  createVapiCall,
  getVapiAssistant,
  listVapiAssistants,
  listVapiCalls,
  listVapiPhoneNumbers,
  listVapiTools,
  updateVapiAssistant,
} from '@/lib/vapi';
import { normalizePhone } from '@/lib/whatsapp';

const aiCallCampaignStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'failed'] as const;
const aiCallRecipientStatuses = ['queued', 'scheduled', 'ringing', 'in_progress', 'ended', 'failed', 'skipped'] as const;
const aiCallOutcomes = ['interested', 'not_interested', 'callback_requested', 'voicemail', 'no_answer', 'busy', 'failed', 'unknown'] as const;
const aiCallAssistantStatuses = ['active', 'paused', 'draft'] as const;
const aiCallJobStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;

export const createAICallAssistantSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(1),
  assistantId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  firstMessage: z.string().optional(),
  objective: z.string().optional(),
  language: z.string().optional(),
  voice: z.string().optional(),
  serverUrl: z.string().url().optional(),
  ownerId: z.string().min(1).default('system'),
  status: z.enum(aiCallAssistantStatuses).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateManagedAssistantSchema = z.object({
  assistantId: z.string().min(1),
  name: z.string().min(1),
  firstMessage: z.string().optional().default(''),
  systemPrompt: z.string().min(1),
  modelProvider: z.string().min(1).default('openai'),
  modelName: z.string().min(1).default('gpt-4o'),
  voiceProvider: z.string().min(1).default('vapi'),
  voiceId: z.string().min(1).default('Elliot'),
  voiceSpeed: z.number().min(0.5).max(2).default(1),
  language: z.string().optional().default('en'),
  voicemailDetection: z.string().optional().default('off'),
  maxDurationSeconds: z.number().int().min(30).max(3600).default(600),
  firstMessageMode: z.string().optional().default('assistant-speaks-first'),
  silenceTimeoutSeconds: z.number().min(0).max(10).optional().default(1.5),
  toolIds: z.array(z.string()).optional().default([]),
  serverUrl: z.string().optional().default(''),
});

export const createAICallCampaignSchema = z
  .object({
    name: z.string().min(3),
    description: z.string().optional().default(''),
    leadIds: z.array(z.string()).min(1),
    assistantRefId: z.string().optional(),
    assistantId: z.string().optional(),
    phoneNumberId: z.string().optional(),
    sendMode: z.enum(['manual', 'send_now', 'scheduled']).default('manual'),
    retryEnabled: z.boolean().optional().default(true),
    retryDelayMinutes: z.number().int().min(5).max(7 * 24 * 60).optional().default(1440),
    maxAttempts: z.number().int().min(1).max(10).optional().default(3),
    retryOutcomes: z.array(z.enum(aiCallOutcomes)).optional().default(['no_answer', 'busy', 'voicemail', 'failed']),
    scheduledAt: z.string().datetime().optional(),
    timezone: z.string().min(1).default('Europe/Bucharest'),
    ownerId: z.string().min(1).default('system'),
    segmentSnapshot: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sendMode === 'scheduled' && !value.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduledAt'],
        message: 'Scheduled campaigns require a scheduledAt date.',
      });
    }
  });

type LeadRecord = {
  id: string;
  full_name?: string;
  first_name?: string;
  company_name?: string;
  phone?: string;
  city?: string;
  owner_id?: string;
  lead_status?: string;
  outreach_status?: string;
  do_not_call?: boolean;
  call_consent_status?: string;
};

type AssistantConfig = {
  assistantRefId: string | null;
  assistantId: string;
  phoneNumberId: string;
  name: string;
};

function collectionRef(name: string) {
  return adminDb.collection(name);
}

function safeNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function isTruthy(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
  return false;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function asTimestamp(value: unknown) {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  }
  return null;
}

function statusFromVapi(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'scheduled':
    case 'queued':
      return 'scheduled' as const;
    case 'ringing':
      return 'ringing' as const;
    case 'in-progress':
    case 'in_progress':
      return 'in_progress' as const;
    case 'ended':
      return 'ended' as const;
    case 'failed':
      return 'failed' as const;
    default:
      return 'queued' as const;
  }
}

function inferOutcomeFromReport(payload: Record<string, unknown>) {
  const endedReason = String(payload.endedReason ?? payload.ended_reason ?? '').toLowerCase();
  const transcript = String(
    (payload.artifact as Record<string, unknown> | undefined)?.transcript ??
      payload.transcript ??
      ''
  ).toLowerCase();
  const summary = String(payload.summary ?? payload.analysis ?? '').toLowerCase();
  const combined = `${endedReason} ${summary} ${transcript}`;

  if (combined.includes('callback')) return 'callback_requested' as const;
  if (combined.includes('not interested')) return 'not_interested' as const;
  if (combined.includes('interested')) return 'interested' as const;
  if (combined.includes('voicemail')) return 'voicemail' as const;
  if (combined.includes('no answer')) return 'no_answer' as const;
  if (combined.includes('busy')) return 'busy' as const;
  if (combined.includes('failed') || combined.includes('error')) return 'failed' as const;
  return 'unknown' as const;
}

function inferNextStepChannel(outcome: string) {
  switch (outcome) {
    case 'interested':
      return 'whatsapp' as const;
    case 'callback_requested':
      return 'email' as const;
    case 'voicemail':
    case 'no_answer':
    case 'busy':
    case 'failed':
      return 'manual' as const;
    default:
      return null;
  }
}

function extractCallArtifacts(payload: Record<string, unknown>) {
  const artifact = (payload.artifact as Record<string, unknown> | undefined) ?? {};
  const recording = (artifact.recording as Record<string, unknown> | undefined) ?? {};
  return {
    transcript: String(artifact.transcript ?? payload.transcript ?? ''),
    messages: Array.isArray(artifact.messages) ? (artifact.messages as Record<string, unknown>[]) : [],
    recordingUrl:
      typeof recording.url === 'string'
        ? recording.url
        : typeof recording.recordingUrl === 'string'
        ? recording.recordingUrl
        : null,
    stereoRecordingUrl:
      typeof recording.stereoUrl === 'string'
        ? recording.stereoUrl
        : typeof recording.stereoRecordingUrl === 'string'
        ? recording.stereoRecordingUrl
        : null,
  };
}

function extractCost(payload: Record<string, unknown>) {
  const costs = Array.isArray(payload.costs) ? (payload.costs as Array<Record<string, unknown>>) : [];
  return costs.reduce((sum, item) => sum + safeNumber(item.cost), 0);
}

async function resolveAssistantConfig(input: {
  assistantRefId?: string;
  assistantId?: string;
  phoneNumberId?: string;
}) {
  if (input.assistantRefId) {
    const assistantSnap = await collectionRef('ai_call_assistants').doc(input.assistantRefId).get();
    if (!assistantSnap.exists) {
      throw new Error('Selected AI call assistant profile does not exist.');
    }

    const assistant = assistantSnap.data()!;
    return {
      assistantRefId: assistantSnap.id,
      assistantId: String(assistant.assistantId ?? ''),
      phoneNumberId: String(assistant.phoneNumberId ?? ''),
      name: String(assistant.name ?? 'Assistant'),
    } satisfies AssistantConfig;
  }

  const vapiConfig = getRequiredVapiConfig();
  const assistantId = input.assistantId || vapiConfig.defaultAssistantId;
  const phoneNumberId = input.phoneNumberId || vapiConfig.defaultPhoneNumberId;

  if (!assistantId || !phoneNumberId) {
    throw new Error('An assistantId and phoneNumberId are required. Configure them or add a saved AI call assistant profile.');
  }

  return {
    assistantRefId: null,
    assistantId,
    phoneNumberId,
    name: 'Default Vapi Assistant',
  } satisfies AssistantConfig;
}

async function loadLeads(leadIds: string[]) {
  const snapshots = await Promise.all(leadIds.map((leadId) => collectionRef('leads').doc(leadId).get()));
  return snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as LeadRecord));
}

function isLeadCallable(lead: LeadRecord) {
  return Boolean(lead.phone && !lead.do_not_call && lead.call_consent_status !== 'revoked');
}

async function recalculateCampaignAggregates(campaignId: string) {
  const recipientsSnap = await collectionRef('ai_call_campaign_recipients').where('campaignId', '==', campaignId).get();
  const recipients = recipientsSnap.docs.map((doc) => doc.data());

  const counts = {
    leadCount: recipients.length,
    queuedCount: 0,
    ringingCount: 0,
    inProgressCount: 0,
    answeredCount: 0,
    completedCount: 0,
    failedCount: 0,
    voicemailCount: 0,
    interestedCount: 0,
    notInterestedCount: 0,
    callbackRequestedCount: 0,
    noAnswerCount: 0,
    busyCount: 0,
  };

  for (const recipient of recipients) {
    switch (recipient.status) {
      case 'queued':
      case 'scheduled':
        counts.queuedCount += 1;
        break;
      case 'ringing':
        counts.ringingCount += 1;
        break;
      case 'in_progress':
        counts.inProgressCount += 1;
        counts.answeredCount += 1;
        break;
      case 'ended':
        counts.completedCount += 1;
        if (recipient.answeredAt) counts.answeredCount += 1;
        break;
      case 'failed':
        counts.failedCount += 1;
        break;
      default:
        break;
    }

    switch (recipient.outcome) {
      case 'voicemail':
        counts.voicemailCount += 1;
        break;
      case 'interested':
        counts.interestedCount += 1;
        break;
      case 'not_interested':
        counts.notInterestedCount += 1;
        break;
      case 'callback_requested':
        counts.callbackRequestedCount += 1;
        break;
      case 'no_answer':
        counts.noAnswerCount += 1;
        break;
      case 'busy':
        counts.busyCount += 1;
        break;
      case 'failed':
        counts.failedCount += 1;
        break;
      default:
        break;
    }
  }

  const nextStatus =
    counts.inProgressCount > 0 || counts.ringingCount > 0
      ? 'active'
      : counts.queuedCount > 0
      ? 'scheduled'
      : counts.failedCount === counts.leadCount && counts.leadCount > 0
      ? 'failed'
      : counts.completedCount + counts.failedCount >= counts.leadCount && counts.leadCount > 0
      ? 'completed'
      : 'draft';

  await collectionRef('ai_call_campaigns').doc(campaignId).set(
    {
      ...counts,
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ...counts, status: nextStatus };
}

async function logActivity(lead: LeadRecord, description: string) {
  await collectionRef('activities').add({
    lead_id: lead.id,
    lead_name: lead.full_name || lead.company_name || 'Lead',
    event_type: 'status_changed',
    channel: 'system',
    description,
    timestamp: FieldValue.serverTimestamp(),
    user_id: 'system',
    user_name: 'AI Call Automation',
    user_avatar: '',
  });
}

async function storeAIEvent(input: {
  type: string;
  campaignId?: string | null;
  recipientId?: string | null;
  leadId?: string | null;
  vapiCallId?: string | null;
  payload: Record<string, unknown>;
  source?: 'vapi_webhook' | 'system' | 'user';
}) {
  await collectionRef('ai_call_events').add({
    type: input.type,
    campaignId: input.campaignId ?? null,
    recipientId: input.recipientId ?? null,
    leadId: input.leadId ?? null,
    vapiCallId: input.vapiCallId ?? null,
    eventAt: FieldValue.serverTimestamp(),
    payload: input.payload,
    source: input.source ?? 'system',
  });
}

async function createTaskForLead(input: {
  lead: LeadRecord;
  type: 'call' | 'follow_up' | 'demo' | 'review' | 'reply_check';
  daysFromNow?: number;
}) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (input.daysFromNow ?? 1));
  dueDate.setHours(9, 0, 0, 0);

  await collectionRef('tasks').add({
    lead_id: input.lead.id,
    lead_name: input.lead.full_name || input.lead.company_name || 'Lead',
    owner_id: input.lead.owner_id || 'system',
    type: input.type,
    due_date: Timestamp.fromDate(dueDate),
    is_overdue: false,
    completed: false,
    completed_at: null,
    created_at: FieldValue.serverTimestamp(),
  });
}

async function updateLeadForOutcome(lead: LeadRecord, outcome: string, finalAttemptReached: boolean) {
  const leadUpdates: Record<string, unknown> = {
    last_contact_at: FieldValue.serverTimestamp(),
  };

  if (outcome === 'interested') {
    leadUpdates.lead_status = 'qualified';
    leadUpdates.outreach_status = 'completed';
    await createTaskForLead({ lead, type: 'follow_up', daysFromNow: 1 });
    await logActivity(lead, 'AI call marked this lead interested. Recommended next step: WhatsApp follow-up.');
  } else if (outcome === 'callback_requested') {
    leadUpdates.lead_status = 'contacted';
    leadUpdates.outreach_status = 'completed';
    await createTaskForLead({ lead, type: 'call', daysFromNow: 1 });
    await logActivity(lead, 'AI call requested a callback. Recommended next step: email confirmation and manual callback.');
  } else if (outcome === 'not_interested') {
    leadUpdates.lead_status = 'closed_lost';
    leadUpdates.outreach_status = 'completed';
    await logActivity(lead, 'AI call marked this lead not interested.');
  } else if (['voicemail', 'no_answer', 'busy', 'failed'].includes(outcome)) {
    leadUpdates.outreach_status = finalAttemptReached ? 'completed' : 'in_sequence';
    if (finalAttemptReached) {
      await createTaskForLead({ lead, type: 'follow_up', daysFromNow: 2 });
      await logActivity(lead, `AI call ended with ${outcome.replace(/_/g, ' ')} after the final retry. Manual review recommended.`);
    } else {
      await logActivity(lead, `AI call ended with ${outcome.replace(/_/g, ' ')}. A retry remains eligible.`);
    }
  } else {
    leadUpdates.outreach_status = 'completed';
    await logActivity(lead, `AI call completed with outcome "${outcome.replace(/_/g, ' ')}".`);
  }

  await collectionRef('leads').doc(lead.id).set(leadUpdates, { merge: true });
}

async function cancelPendingJobsForCampaign(campaignId: string) {
  const jobsSnap = await collectionRef('ai_call_scheduled_jobs')
    .where('campaignId', '==', campaignId)
    .where('status', '==', 'pending')
    .get();

  for (const jobDoc of jobsSnap.docs) {
    await jobDoc.ref.update({
      status: 'cancelled',
      error: 'Cancelled because the campaign was paused.',
    });
  }
}

async function scheduleRecipientRetry(input: {
  campaignId: string;
  recipientId: string;
  leadId: string;
  timezone: string;
  retryDelayMinutes: number;
}) {
  const runAt = addMinutes(new Date(), input.retryDelayMinutes);
  await collectionRef('ai_call_scheduled_jobs').add({
    jobType: 'recipient_retry',
    status: 'pending',
    campaignId: input.campaignId,
    recipientId: input.recipientId,
    leadId: input.leadId,
    runAt: Timestamp.fromDate(runAt),
    timezone: input.timezone,
    payload: {
      campaignId: input.campaignId,
      recipientId: input.recipientId,
      leadId: input.leadId,
    },
    lastAttemptAt: null,
    attemptCount: 0,
    error: null,
  });
}

export async function listAICallDashboardData() {
  const vapiConfig = hasVapiConfig() ? getRequiredVapiConfig() : null;
  const [assistants, campaigns, recipients, events, jobs, leads, remoteAssistants, remotePhoneNumbers, remoteTools, remoteCalls] = await Promise.all([
    collectionRef('ai_call_assistants').orderBy('updatedAt', 'desc').limit(20).get(),
    collectionRef('ai_call_campaigns').orderBy('updatedAt', 'desc').limit(20).get(),
    collectionRef('ai_call_campaign_recipients').orderBy('queuedAt', 'desc').limit(60).get(),
    collectionRef('ai_call_events').orderBy('eventAt', 'desc').limit(20).get(),
    collectionRef('ai_call_scheduled_jobs').orderBy('runAt', 'asc').limit(20).get(),
    collectionRef('leads').limit(250).get(),
    hasVapiConfig() ? listVapiAssistants().catch(() => []) : Promise.resolve([]),
    hasVapiConfig() ? listVapiPhoneNumbers().catch(() => []) : Promise.resolve([]),
    hasVapiConfig() ? listVapiTools().catch(() => []) : Promise.resolve([]),
    hasVapiConfig() ? listVapiCalls().catch(() => []) : Promise.resolve([]),
  ]);

  const assistantData = assistants.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const campaignData = campaigns.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const recipientData = recipients.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const eventData = events.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const jobData = jobs.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const leadData = leads.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));

  const recentWebhook = eventData.find((event) => event.source === 'vapi_webhook');
  const activeCampaigns = campaignData.filter((campaign) => campaign.status === 'active').length;
  const attentionCampaigns = campaignData.filter((campaign) => safeNumber(campaign.failedCount) > 0).length;

  return {
    health: {
      vapiConfigured: hasVapiConfig(),
      defaultAssistantConfigured: Boolean(vapiConfig?.defaultAssistantId),
      defaultPhoneNumberConfigured: Boolean(vapiConfig?.defaultPhoneNumberId),
      webhookActive: Boolean(recentWebhook),
      assistantProfilesAvailable: assistantData.length > 0,
      campaignsNeedAttention: attentionCampaigns > 0,
      activeCampaigns,
    },
    assistants: assistantData,
    campaigns: campaignData,
    recipients: recipientData,
    leads: leadData,
    events: eventData,
    scheduledJobs: jobData,
    workspace: {
      assistants: remoteAssistants,
      phoneNumbers: remotePhoneNumbers,
      tools: remoteTools,
      calls: remoteCalls,
    },
  };
}

export async function listAICallCampaigns() {
  const snapshot = await collectionRef('ai_call_campaigns').orderBy('updatedAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getAICallCampaign(campaignId: string) {
  const [campaignSnap, recipientsSnap] = await Promise.all([
    collectionRef('ai_call_campaigns').doc(campaignId).get(),
    collectionRef('ai_call_campaign_recipients').where('campaignId', '==', campaignId).get(),
  ]);

  if (!campaignSnap.exists) {
    throw new Error('AI call campaign not found.');
  }

  const recipientDocs = recipientsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const leadIds = recipientDocs.map((recipient) => String(recipient.leadId ?? ''));
  const leadSnaps = await Promise.all(leadIds.map((leadId) => collectionRef('leads').doc(leadId).get()));
  const leadMap = Object.fromEntries(
    leadSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, { id: snap.id, ...snap.data() }])
  );

  return {
    campaign: { id: campaignSnap.id, ...campaignSnap.data() },
    recipients: recipientDocs,
    leads: leadMap,
  };
}

export async function getLeadAICallData(leadId: string) {
  const [recipientsSnap, assistantsSnap] = await Promise.all([
    collectionRef('ai_call_campaign_recipients').where('leadId', '==', leadId).get(),
    collectionRef('ai_call_assistants').orderBy('updatedAt', 'desc').limit(20).get(),
  ]);

  const recipients = recipientsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const campaignIds = recipients.map((recipient) => String(recipient.campaignId ?? ''));
  const campaignSnaps = await Promise.all(campaignIds.map((campaignId) => collectionRef('ai_call_campaigns').doc(campaignId).get()));
  const campaigns = Object.fromEntries(
    campaignSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, { id: snap.id, ...snap.data() }])
  );

  return {
    recipients,
    campaigns,
    assistants: assistantsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
}

export async function getManagedAssistant(assistantId: string) {
  return getVapiAssistant(assistantId);
}

export async function updateManagedAssistant(payload: unknown) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'assistantId' in payload &&
    'patch' in payload &&
    typeof (payload as { assistantId?: unknown }).assistantId === 'string' &&
    typeof (payload as { patch?: unknown }).patch === 'object'
  ) {
    const data = payload as { assistantId: string; patch: Record<string, unknown> };
    const updated = await updateVapiAssistant(data.assistantId, data.patch);
    await storeAIEvent({
      type: 'managed_assistant_updated',
      payload: { assistantId: data.assistantId, mode: 'raw-patch' },
    });
    return updated;
  }

  const data = updateManagedAssistantSchema.parse(payload);

  const updatePayload: Record<string, unknown> = {
    name: data.name,
    firstMessage: data.firstMessage,
    firstMessageMode: data.firstMessageMode,
    voicemailDetection: data.voicemailDetection,
    maxDurationSeconds: data.maxDurationSeconds,
    model: {
      provider: data.modelProvider,
      model: data.modelName,
      messages: [
        {
          role: 'system',
          content: data.systemPrompt,
        },
      ],
      toolIds: data.toolIds,
    },
    voice: {
      provider: data.voiceProvider,
      voiceId: data.voiceId,
      speed: data.voiceSpeed,
    },
    transcriber: {
      language: data.language,
      endUtteranceSilenceThreshold: data.silenceTimeoutSeconds,
    },
  };

  if (data.serverUrl) {
    updatePayload.server = {
      url: data.serverUrl,
    };
  }

  const updated = await updateVapiAssistant(data.assistantId, updatePayload);
  await storeAIEvent({
    type: 'managed_assistant_updated',
    payload: { assistantId: data.assistantId, name: data.name },
  });
  return updated;
}

export async function createAICallAssistant(payload: unknown) {
  const data = createAICallAssistantSchema.parse(payload);
  const now = FieldValue.serverTimestamp();
  const docRef = await collectionRef('ai_call_assistants').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return { id: docRef.id };
}

export async function createAICallCampaign(payload: unknown) {
  const data = createAICallCampaignSchema.parse(payload);
  const assistant = await resolveAssistantConfig(data);
  const leads = await loadLeads(data.leadIds);
  const validLeads = leads.filter(isLeadCallable);

  if (validLeads.length === 0) {
    throw new Error('No selected leads are eligible for AI calling.');
  }

  const status = data.sendMode === 'scheduled' && data.scheduledAt ? 'scheduled' : 'draft';
  const recipientStatus = data.sendMode === 'scheduled' && data.scheduledAt ? 'scheduled' : 'queued';
  const campaignRef = collectionRef('ai_call_campaigns').doc();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  batch.set(campaignRef, {
    channel: 'ai_call',
    name: data.name,
    description: data.description,
    status,
    assistantRefId: assistant.assistantRefId,
    assistantId: assistant.assistantId,
    phoneNumberId: assistant.phoneNumberId,
    sendMode: data.sendMode,
    retryEnabled: data.retryEnabled,
    retryDelayMinutes: data.retryDelayMinutes,
    maxAttempts: data.maxAttempts,
    retryOutcomes: data.retryOutcomes,
    scheduledAt: data.scheduledAt ? Timestamp.fromDate(new Date(data.scheduledAt)) : null,
    timezone: data.timezone,
    ownerId: data.ownerId,
    segmentSnapshot: data.segmentSnapshot ?? null,
    leadIds: validLeads.map((lead) => lead.id),
    leadCount: validLeads.length,
    queuedCount: validLeads.length,
    ringingCount: 0,
    inProgressCount: 0,
    answeredCount: 0,
    completedCount: 0,
    failedCount: 0,
    voicemailCount: 0,
    interestedCount: 0,
    notInterestedCount: 0,
    callbackRequestedCount: 0,
    noAnswerCount: 0,
    busyCount: 0,
    lastDispatchedAt: null,
    lastWebhookAt: null,
    createdAt: now,
    updatedAt: now,
  });

  for (const lead of validLeads) {
    const recipientRef = collectionRef('ai_call_campaign_recipients').doc();
    batch.set(recipientRef, {
      campaignId: campaignRef.id,
      leadId: lead.id,
      phone: normalizePhone(lead.phone!),
      status: recipientStatus,
      outcome: 'unknown',
      assistantId: assistant.assistantId,
      phoneNumberId: assistant.phoneNumberId,
      vapiCallId: null,
      attemptCount: 0,
      failureReason: null,
      queuedAt: now,
      scheduledAt: data.scheduledAt ? Timestamp.fromDate(new Date(data.scheduledAt)) : null,
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      lastEventAt: null,
      durationSeconds: null,
      endedReason: null,
      summary: null,
      transcript: null,
      messages: [],
      recordingUrl: null,
      stereoRecordingUrl: null,
      cost: null,
      customer: {
        number: normalizePhone(lead.phone!),
        name: lead.full_name || lead.company_name || lead.id,
      },
      metadata: {
        campaignId: campaignRef.id,
        recipientId: recipientRef.id,
        leadId: lead.id,
        ownerId: data.ownerId,
        retryEligible: data.retryEnabled,
      },
      nextStepChannel: null,
    });
  }

  if (status === 'scheduled' && data.scheduledAt) {
    const jobRef = collectionRef('ai_call_scheduled_jobs').doc();
    batch.set(jobRef, {
      jobType: 'campaign_dispatch',
      status: 'pending',
      campaignId: campaignRef.id,
      recipientId: null,
      leadId: null,
      runAt: Timestamp.fromDate(new Date(data.scheduledAt)),
      timezone: data.timezone,
      payload: { campaignId: campaignRef.id },
      lastAttemptAt: null,
      attemptCount: 0,
      error: null,
    });
  }

  await batch.commit();

  await storeAIEvent({
    type: 'campaign_created',
    campaignId: campaignRef.id,
    payload: { leadCount: validLeads.length, sendMode: data.sendMode },
  });

  if (data.sendMode === 'send_now') {
    await dispatchAICallCampaign(campaignRef.id);
  }

  return { id: campaignRef.id };
}

export async function dispatchAICallCampaign(campaignId: string) {
  const campaignRef = collectionRef('ai_call_campaigns').doc(campaignId);
  const campaignSnap = await campaignRef.get();

  if (!campaignSnap.exists) {
    throw new Error('AI call campaign not found.');
  }

  const campaign = campaignSnap.data()!;
  if (campaign.status === 'paused') {
    throw new Error('Paused campaigns cannot be dispatched.');
  }
  const recipientsSnap = await collectionRef('ai_call_campaign_recipients')
    .where('campaignId', '==', campaignId)
    .where('status', 'in', ['queued', 'scheduled'])
    .get();

  let startedCount = 0;
  let failedCount = 0;

  for (const recipientDoc of recipientsSnap.docs) {
    const recipient = recipientDoc.data();
    const leadSnap = await collectionRef('leads').doc(String(recipient.leadId)).get();
    const lead = leadSnap.exists ? ({ id: leadSnap.id, ...leadSnap.data() } as LeadRecord) : null;

    if (!lead || !isLeadCallable(lead)) {
      failedCount += 1;
      await recipientDoc.ref.update({
        status: 'skipped',
        failureReason: 'Lead is no longer eligible for AI calling.',
        lastEventAt: FieldValue.serverTimestamp(),
      });
      continue;
    }

    try {
      const scheduledAt = asTimestamp(recipient.scheduledAt)?.toDate();
      const vapiCall = await createVapiCall({
        assistantId: campaign.assistantId,
        phoneNumberId: campaign.phoneNumberId,
        customer: {
          number: recipient.phone,
          name: lead.full_name || lead.company_name || lead.id,
        },
        name: `${campaign.name} - ${lead.full_name || lead.company_name || lead.id}`,
        metadata: {
          campaignId,
          recipientId: recipientDoc.id,
          leadId: lead.id,
          ownerId: campaign.ownerId ?? 'system',
        },
        ...(scheduledAt
          ? {
              schedulePlan: {
                earliestAt: scheduledAt.toISOString(),
              },
            }
          : {}),
      });

      const remoteStatus = statusFromVapi(String(vapiCall.status ?? vapiCall.state ?? 'queued'));
      await recipientDoc.ref.update({
        status: remoteStatus,
        vapiCallId: String(vapiCall.id ?? ''),
        attemptCount: FieldValue.increment(1),
        startedAt: remoteStatus === 'in_progress' ? FieldValue.serverTimestamp() : null,
        lastEventAt: FieldValue.serverTimestamp(),
        failureReason: null,
        metadata: {
          ...(recipient.metadata ?? {}),
          lastDispatchPayload: vapiCall,
        },
      });

      await logActivity(
        lead,
        `AI call campaign "${campaign.name}" launched using assistant ${campaign.assistantId}.`
      );

      startedCount += 1;
    } catch (error) {
      failedCount += 1;
      await recipientDoc.ref.update({
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown Vapi dispatch error',
        attemptCount: FieldValue.increment(1),
        lastEventAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await campaignRef.set(
    {
      status: startedCount > 0 ? 'active' : 'failed',
      lastDispatchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const aggregates = await recalculateCampaignAggregates(campaignId);

  await storeAIEvent({
    type: 'campaign_dispatched',
    campaignId,
    payload: { startedCount, failedCount, aggregates },
  });

  return { campaignId, startedCount, failedCount, aggregates };
}

export async function pauseAICallCampaign(campaignId: string) {
  const campaignRef = collectionRef('ai_call_campaigns').doc(campaignId);
  const snapshot = await campaignRef.get();
  if (!snapshot.exists) {
    throw new Error('AI call campaign not found.');
  }

  await campaignRef.set(
    {
      status: 'paused',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await cancelPendingJobsForCampaign(campaignId);
  await storeAIEvent({ type: 'campaign_paused', campaignId, payload: { campaignId } });
  return { id: campaignId, status: 'paused' };
}

export async function resumeAICallCampaign(campaignId: string) {
  const campaignRef = collectionRef('ai_call_campaigns').doc(campaignId);
  const snapshot = await campaignRef.get();
  if (!snapshot.exists) {
    throw new Error('AI call campaign not found.');
  }

  const campaign = snapshot.data()!;
  const nextStatus = campaign.sendMode === 'scheduled' ? 'scheduled' : 'active';
  await campaignRef.set(
    {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (campaign.sendMode === 'scheduled' && campaign.scheduledAt) {
    await collectionRef('ai_call_scheduled_jobs').add({
      jobType: 'campaign_dispatch',
      status: 'pending',
      campaignId,
      recipientId: null,
      leadId: null,
      runAt: campaign.scheduledAt,
      timezone: campaign.timezone ?? 'Europe/Bucharest',
      payload: { campaignId },
      lastAttemptAt: null,
      attemptCount: 0,
      error: null,
    });
  }

  await storeAIEvent({ type: 'campaign_resumed', campaignId, payload: { campaignId, status: nextStatus } });
  return { id: campaignId, status: nextStatus };
}

export async function retryAICallRecipient(campaignId: string, recipientId: string) {
  const [campaignSnap, recipientSnap] = await Promise.all([
    collectionRef('ai_call_campaigns').doc(campaignId).get(),
    collectionRef('ai_call_campaign_recipients').doc(recipientId).get(),
  ]);

  if (!campaignSnap.exists) {
    throw new Error('AI call campaign not found.');
  }
  if (!recipientSnap.exists) {
    throw new Error('AI call recipient not found.');
  }

  const campaign = campaignSnap.data()!;
  const recipient = recipientSnap.data()!;
  if (safeNumber(recipient.attemptCount) >= safeNumber(campaign.maxAttempts ?? 3)) {
    throw new Error('Recipient already reached the maximum number of attempts.');
  }

  await recipientSnap.ref.set(
    {
      status: 'queued',
      outcome: 'unknown',
      failureReason: null,
      endedAt: null,
      startedAt: null,
      answeredAt: null,
      scheduledAt: null,
      lastEventAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await storeAIEvent({
    type: 'recipient_retry_requested',
    campaignId,
    recipientId,
    leadId: String(recipient.leadId ?? ''),
    vapiCallId: String(recipient.vapiCallId ?? ''),
    payload: { campaignId, recipientId },
  });

  if (campaign.status !== 'paused') {
    await dispatchAICallCampaign(campaignId);
  }

  return { campaignId, recipientId, status: 'queued' };
}

async function findRecipientByCall(call: Record<string, unknown>) {
  const metadata = (call.metadata as Record<string, unknown> | undefined) ?? {};
  const recipientId = typeof metadata.recipientId === 'string' ? metadata.recipientId : '';
  if (recipientId) {
    const recipientSnap = await collectionRef('ai_call_campaign_recipients').doc(recipientId).get();
    if (recipientSnap.exists) {
      return recipientSnap;
    }
  }

  const callId = String(call.id ?? '');
  if (!callId) return null;

  const recipientSnap = await collectionRef('ai_call_campaign_recipients')
    .where('vapiCallId', '==', callId)
    .limit(1)
    .get();

  return recipientSnap.docs[0] ?? null;
}

function safeCompare(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyWebhookRequest(rawBody: string, headers: { signature?: string; authorization?: string; secret?: string }) {
  const config = getRequiredVapiConfig();

  if (config.webhookAuthToken) {
    const expected = `Bearer ${config.webhookAuthToken}`;
    if (headers.authorization && safeCompare(expected, headers.authorization)) {
      return true;
    }
  }

  if (config.webhookSecret && headers.secret && safeCompare(config.webhookSecret, headers.secret)) {
    return true;
  }

  const hmacSecret = config.webhookHmacSecret || config.webhookSecret;
  if (hmacSecret && headers.signature) {
    const expected = createHmac('sha256', hmacSecret).update(rawBody).digest('hex');
    const normalizedSignature = headers.signature.startsWith('sha256=')
      ? headers.signature
      : `sha256=${headers.signature}`;
    const normalizedExpected = `sha256=${expected}`;
    if (safeCompare(normalizedExpected, normalizedSignature)) {
      return true;
    }
  }

  if (!config.webhookAuthToken && !config.webhookSecret && !config.webhookHmacSecret) {
    return true;
  }

  return false;
}

async function handleToolCalls(input: {
  message: Record<string, unknown>;
  campaignId: string;
  recipientId: string;
  lead: LeadRecord | null;
  leadId: string | null;
  recipient: Record<string, unknown>;
}) {
  const toolCallList = Array.isArray(input.message.toolCallList)
    ? (input.message.toolCallList as Array<Record<string, unknown>>)
    : [];
  const results: Array<{ name: string; toolCallId: string; result: string }> = [];

  for (const toolCall of toolCallList) {
    const name = String(toolCall.name ?? '');
    const toolCallId = String(toolCall.id ?? '');
    const parameters = (toolCall.parameters as Record<string, unknown> | undefined) ?? {};

    if (name === 'capture_call_outcome' || name === 'mark_interested' || name === 'request_callback') {
      const explicitOutcome =
        name === 'mark_interested'
          ? 'interested'
          : name === 'request_callback'
          ? 'callback_requested'
          : String(parameters.outcome ?? 'unknown');
      const normalizedOutcome = aiCallOutcomes.includes(explicitOutcome as (typeof aiCallOutcomes)[number])
        ? explicitOutcome
        : 'unknown';

      await collectionRef('ai_call_campaign_recipients').doc(input.recipientId).set(
        {
          outcome: normalizedOutcome,
          summary: String(parameters.summary ?? ''),
          nextStepChannel: inferNextStepChannel(normalizedOutcome),
          metadata: {
            ...(input.recipient.metadata ?? {}),
            toolOutcome: parameters,
          },
        },
        { merge: true }
      );

      results.push({
        name,
        toolCallId,
        result: JSON.stringify({ status: 'captured', outcome: normalizedOutcome }),
      });
    } else if (name === 'mark_do_not_call' && input.leadId) {
      await collectionRef('leads').doc(input.leadId).set(
        {
          do_not_call: true,
          outreach_status: 'completed',
        },
        { merge: true }
      );
      results.push({
        name,
        toolCallId,
        result: JSON.stringify({ status: 'updated', doNotCall: true }),
      });
    } else if (name === 'send_follow_up') {
      results.push({
        name,
        toolCallId,
        result: JSON.stringify({ status: 'accepted', note: 'Follow-up scaffolding recorded server-side.' }),
      });
    } else {
      results.push({
        name,
        toolCallId,
        result: JSON.stringify({ status: 'ignored', reason: 'Tool is not handled by this server yet.' }),
      });
    }
  }

  if (input.lead && toolCallList.length > 0) {
    await logActivity(input.lead, `AI call tool-calls captured ${toolCallList.length} structured call action(s).`);
  }

  return { results };
}

export async function processVapiWebhook(
  rawBody: string,
  headers: { signature?: string; authorization?: string; secret?: string } = {}
) {
  if (!verifyWebhookRequest(rawBody, headers)) {
    throw new Error('Invalid Vapi webhook authentication.');
  }

  const payload = JSON.parse(rawBody) as { message?: Record<string, unknown> };
  const message = payload.message ?? {};
  const type = String(message.type ?? 'unknown');
  const call = (message.call as Record<string, unknown> | undefined) ?? {};
  const recipientDoc = await findRecipientByCall(call);
  const recipient = recipientDoc?.data() ?? null;
  const campaignId = recipient ? String(recipient.campaignId ?? '') : null;
  const leadId = recipient ? String(recipient.leadId ?? '') : null;
  const leadSnap = leadId ? await collectionRef('leads').doc(leadId).get() : null;
  const lead = leadSnap?.exists ? ({ id: leadSnap.id, ...leadSnap.data() } as LeadRecord) : null;

  await storeAIEvent({
    type,
    campaignId,
    recipientId: recipientDoc?.id ?? null,
    leadId,
    vapiCallId: String(call.id ?? ''),
    payload: message,
    source: 'vapi_webhook',
  });

  if (!recipientDoc || !campaignId) {
    return { processed: true, matchedRecipient: false };
  }

  const currentRecipient = recipientDoc.data()!;

  if (type === 'tool-calls') {
    const result = await handleToolCalls({
      message,
      campaignId,
      recipientId: recipientDoc.id,
      lead,
      leadId,
      recipient: currentRecipient,
    });
    return { processed: true, matchedRecipient: true, ...result };
  }

  if (type === 'status-update') {
    const status = statusFromVapi(String(message.status ?? ''));
    await recipientDoc.ref.set(
      {
        status,
        vapiCallId: String(call.id ?? currentRecipient.vapiCallId ?? ''),
        startedAt: status === 'in_progress' ? FieldValue.serverTimestamp() : currentRecipient.startedAt ?? null,
        answeredAt: status === 'in_progress' ? FieldValue.serverTimestamp() : currentRecipient.answeredAt ?? null,
        endedAt: status === 'ended' ? FieldValue.serverTimestamp() : currentRecipient.endedAt ?? null,
        lastEventAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await collectionRef('ai_call_campaigns').doc(campaignId).set(
      {
        lastWebhookAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await recalculateCampaignAggregates(campaignId);
  }

  if (type === 'end-of-call-report') {
    const artifacts = extractCallArtifacts(message);
    const explicitToolOutcome = String((currentRecipient.metadata as Record<string, unknown> | undefined)?.toolOutcome ? ((currentRecipient.metadata as Record<string, unknown>).toolOutcome as Record<string, unknown>).outcome ?? '' : '');
    const outcome = explicitToolOutcome && aiCallOutcomes.includes(explicitToolOutcome as (typeof aiCallOutcomes)[number])
      ? explicitToolOutcome
      : inferOutcomeFromReport(message);
    const endedReason = String(message.endedReason ?? '');
    const campaignSnap = await collectionRef('ai_call_campaigns').doc(campaignId).get();
    const campaign = campaignSnap.data() ?? {};
    const attemptCount = safeNumber(currentRecipient.attemptCount);
    const maxAttempts = safeNumber(campaign.maxAttempts ?? 3);
    const finalAttemptReached = attemptCount >= maxAttempts;
    const nextStepChannel = inferNextStepChannel(outcome);

    await recipientDoc.ref.set(
      {
        status: outcome === 'failed' ? 'failed' : 'ended',
        outcome,
        endedReason,
        endedAt: FieldValue.serverTimestamp(),
        lastEventAt: FieldValue.serverTimestamp(),
        durationSeconds: safeNumber(call.duration ?? call.durationSeconds ?? 0),
        summary: String(message.summary ?? ''),
        transcript: artifacts.transcript,
        messages: artifacts.messages,
        recordingUrl: artifacts.recordingUrl,
        stereoRecordingUrl: artifacts.stereoRecordingUrl,
        cost: extractCost(call),
        vapiCallId: String(call.id ?? currentRecipient.vapiCallId ?? ''),
        nextStepChannel,
      },
      { merge: true }
    );

    await collectionRef('ai_call_campaigns').doc(campaignId).set(
      {
        lastWebhookAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (lead) {
      await updateLeadForOutcome(lead, outcome, finalAttemptReached);
    }

    if (
      isTruthy(campaign.retryEnabled) &&
      !finalAttemptReached &&
      Array.isArray(campaign.retryOutcomes) &&
      campaign.retryOutcomes.includes(outcome)
    ) {
      await scheduleRecipientRetry({
        campaignId,
        recipientId: recipientDoc.id,
        leadId: String(currentRecipient.leadId ?? ''),
        timezone: String(campaign.timezone ?? 'Europe/Bucharest'),
        retryDelayMinutes: safeNumber(campaign.retryDelayMinutes ?? 1440),
      });
    }

    await recalculateCampaignAggregates(campaignId);
  }

  return { processed: true, matchedRecipient: true };
}

export async function dispatchDueAICallJobs() {
  const now = Timestamp.now();
  const jobsSnap = await collectionRef('ai_call_scheduled_jobs')
    .where('status', '==', 'pending')
    .where('runAt', '<=', now)
    .limit(25)
    .get();

  const results: Array<{ id: string; status: string }> = [];

  for (const jobDoc of jobsSnap.docs) {
    const job = jobDoc.data();
    try {
      await jobDoc.ref.update({
        status: 'processing',
        lastAttemptAt: FieldValue.serverTimestamp(),
        attemptCount: FieldValue.increment(1),
      });

      if (job.jobType === 'campaign_dispatch' && job.campaignId) {
        await dispatchAICallCampaign(String(job.campaignId));
      }
      if (job.jobType === 'recipient_retry' && job.campaignId && job.recipientId) {
        await retryAICallRecipient(String(job.campaignId), String(job.recipientId));
      }

      await jobDoc.ref.update({
        status: 'completed',
        error: null,
      });
      results.push({ id: jobDoc.id, status: 'completed' });
    } catch (error) {
      await jobDoc.ref.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown scheduler error',
      });
      results.push({ id: jobDoc.id, status: 'failed' });
    }
  }

  return results;
}
