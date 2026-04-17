import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { adminDb } from '@/lib/firebase-admin';
import { getRequiredInfobipConfig, hasInfobipConfig } from '@/lib/env.server';
import { sendInfobipTemplate, sendInfobipTextMessage } from '@/lib/infobip';
import { extractTemplateVariables, normalizePhone, sessionWindowCloseDate } from '@/lib/whatsapp';

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(3)
    .transform((value) => value.toLowerCase().replace(/[^a-z0-9_]+/g, '_')),
  language: z.string().min(2).default('en'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  headerType: z.enum(['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'NONE']).default('NONE'),
  headerText: z.string().optional().default(''),
  headerMediaUrl: z.string().optional().default(''),
  bodyText: z.string().min(1),
  footerText: z.string().optional().default(''),
  sampleValues: z.array(z.string()).optional().default([]),
  variables: z.array(z.object({
    key: z.string().min(1),
    index: z.number().int().min(1),
    label: z.string().min(1),
    sample: z.string().min(1),
    sourceField: z.string().optional(),
  })).optional().default([]),
  buttons: z
    .array(
      z.object({
        type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
        text: z.string().min(1),
        url: z.string().optional(),
        payload: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  createdBy: z.string().min(1).default('system'),
}).superRefine((value, ctx) => {
  if (value.headerType === 'TEXT' && value.headerText.trim().length > 60) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Header text must stay within 60 characters.', path: ['headerText'] });
  }

  if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(value.headerType) && !value.headerMediaUrl.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Media headers require a media URL.', path: ['headerMediaUrl'] });
  }

  if (value.footerText.trim().length > 60) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Footer text must stay within 60 characters.', path: ['footerText'] });
  }

  if (value.buttons.length > 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'WhatsApp templates support up to 3 buttons.', path: ['buttons'] });
  }

  value.buttons.forEach((button, index) => {
    if (button.text.trim().length > 25) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Button text must stay within 25 characters.', path: ['buttons', index, 'text'] });
    }
    if (button.type === 'URL' && !button.url?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Website buttons require a URL.', path: ['buttons', index, 'url'] });
    }
    if (button.type === 'URL' && button.url?.trim() && !/^https?:\/\//i.test(button.url.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Website button URLs must start with http:// or https://.', path: ['buttons', index, 'url'] });
    }
    if (button.type !== 'URL' && !button.payload?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quick reply and phone buttons require a payload value.', path: ['buttons', index, 'payload'] });
    }
  });
});

export const createCampaignSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(1),
  templateId: z.string().min(1),
  leadIds: z.array(z.string()).min(1),
  sendMode: z.enum(['manual', 'send_now', 'scheduled', 'automation']).default('manual'),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().min(1).default('Europe/Bucharest'),
  ownerId: z.string().min(1).default('system'),
});

export const createAutomationSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(1),
  templateId: z.string().min(1),
  triggerType: z.enum(['manual', 'scheduled', 'lead_status_changed', 'reply_missing', 'demo_booked']),
  triggerConfig: z.record(z.string(), z.unknown()).optional().default({}),
  delayMinutes: z.number().int().min(0).optional(),
  schedule: z.string().optional(),
  timezone: z.string().min(1).default('Europe/Bucharest'),
  filters: z.record(z.string(), z.unknown()).optional().default({}),
  stopConditions: z.record(z.string(), z.unknown()).optional().default({}),
  ownerId: z.string().min(1).default('system'),
});

export const sendMessageSchema = z.object({
  leadId: z.string().min(1),
  conversationId: z.string().optional(),
  text: z.string().min(1).max(4096),
});

type LeadRecord = {
  id: string;
  phone?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  city?: string;
  email?: string;
  owner_id?: string;
};

function collectionRef(name: string) {
  return adminDb.collection(name);
}

export async function listWhatsAppDashboardData() {
  const [templates, campaigns, automations, conversations, leads, events, jobs] = await Promise.all([
    collectionRef('whatsapp_templates').orderBy('updatedAt', 'desc').limit(24).get(),
    collectionRef('whatsapp_campaigns').orderBy('updatedAt', 'desc').limit(24).get(),
    collectionRef('whatsapp_automations').orderBy('updatedAt', 'desc').limit(24).get(),
    collectionRef('whatsapp_conversations').orderBy('lastOutboundAt', 'desc').limit(12).get(),
    collectionRef('leads').limit(250).get(),
    collectionRef('whatsapp_events').orderBy('eventAt', 'desc').limit(20).get(),
    collectionRef('whatsapp_scheduled_jobs').orderBy('runAt', 'asc').limit(20).get(),
  ]);

  const templateData = templates.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const campaignData = campaigns.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const automationData = automations.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const conversationData = conversations.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const leadData = leads.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const eventData = events.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
  const jobData = jobs.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));

  const recentWebhookEvent = eventData.find((event) => event.source === 'infobip_webhook');
  const approvedTemplates = templateData.filter((template) => template.status === 'approved');
  const pendingJobs = jobData.filter((job) => job.status === 'pending' || job.status === 'processing');
  const campaignsWithFailures = campaignData.filter((campaign) => Number(campaign.failedCount ?? 0) > 0);

  return {
    health: {
      infobipConfigured: hasInfobipConfig(),
      senderConfigured: hasInfobipConfig(),
      webhookActive: Boolean(recentWebhookEvent),
      approvedTemplatesAvailable: approvedTemplates.length > 0,
      schedulerActive: pendingJobs.length > 0,
      campaignsNeedAttention: campaignsWithFailures.length > 0,
    },
    templates: templateData,
    campaigns: campaignData,
    automations: automationData,
    conversations: conversationData,
    leads: leadData,
    events: eventData,
    scheduledJobs: jobData,
  };
}

export async function createTemplate(payload: unknown) {
  const data = createTemplateSchema.parse(payload);
  const { sender } = getRequiredInfobipConfig();
  const variables = data.variables.length > 0
    ? data.variables
    : extractTemplateVariables(data.bodyText).map((item, index) => ({
        key: item.key,
        index: item.index,
        label: `Variable ${index + 1}`,
        sample: data.sampleValues[index] ?? `Example ${index + 1}`,
      }));

  const now = FieldValue.serverTimestamp();
  const docRef = await collectionRef('whatsapp_templates').add({
    ...data,
    sender,
    status: 'draft',
    variables,
    headerMediaUrl: data.headerMediaUrl || '',
    structure: null,
    infobipTemplateId: null,
    rejectionReason: null,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return { id: docRef.id };
}

export async function updateTemplate(templateId: string, payload: unknown) {
  const data = createTemplateSchema.parse(payload);
  const templateRef = collectionRef('whatsapp_templates').doc(templateId);
  const snapshot = await templateRef.get();

  if (!snapshot.exists) {
    throw new Error('Template not found.');
  }

  const currentTemplate = snapshot.data()!;
  if (currentTemplate.status && currentTemplate.status !== 'draft') {
    throw new Error('Only draft templates can be edited.');
  }

  const variables = data.variables.length > 0
    ? data.variables
    : extractTemplateVariables(data.bodyText).map((item, index) => ({
        key: item.key,
        index: item.index,
        label: `Variable ${index + 1}`,
        sample: data.sampleValues[index] ?? `Example ${index + 1}`,
      }));

  await templateRef.update({
    ...data,
    variables,
    headerMediaUrl: data.headerMediaUrl || '',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: templateId };
}

export async function submitTemplate(templateId: string) {
  const templateRef = collectionRef('whatsapp_templates').doc(templateId);
  const snapshot = await templateRef.get();

  if (!snapshot.exists) {
    throw new Error('Template not found.');
  }

  const template = snapshot.data()!;
  const response = await import('@/lib/infobip').then(({ createInfobipTemplate }) =>
    createInfobipTemplate({
      sender: template.sender,
      name: template.name,
      language: template.language,
      category: template.category,
      bodyText: template.bodyText,
      footerText: template.footerText,
      headerText: template.headerText,
      headerType: template.headerType,
      headerMediaUrl: template.headerMediaUrl,
      examples: (template.variables ?? []).map((variable: { sample: string }) => variable.sample),
      buttons: template.buttons,
    })
  );

  await templateRef.update({
    status: response.approvalStatus,
    infobipTemplateId: response.remoteId,
    structure: response.raw?.structure ?? null,
    rejectionReason: response.raw?.rejectionReason ?? null,
    lastSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return response;
}

export async function syncTemplateStatus(templateId: string) {
  const templateRef = collectionRef('whatsapp_templates').doc(templateId);
  const snapshot = await templateRef.get();
  if (!snapshot.exists) {
    throw new Error('Template not found.');
  }

  const template = snapshot.data()!;
  const templates = await import('@/lib/infobip').then(({ listInfobipTemplates }) =>
    listInfobipTemplates(template.sender)
  );
  const match = templates.find(
    (item) =>
      item.remoteId === template.infobipTemplateId ||
      (item.name === template.name && item.language === template.language)
  );

  if (!match) {
    throw new Error('Template was not found on Infobip.');
  }

  await templateRef.update({
    status: match.status,
    lastSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return match;
}

export async function createCampaign(payload: unknown) {
  const data = createCampaignSchema.parse(payload);
  const templateSnap = await collectionRef('whatsapp_templates').doc(data.templateId).get();
  if (!templateSnap.exists) {
    throw new Error('Selected template does not exist.');
  }

  const template = templateSnap.data()!;
  const leads = await Promise.all(
    data.leadIds.map((leadId) => collectionRef('leads').doc(leadId).get())
  );

  const validLeads = leads
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...snap.data() } as LeadRecord))
    .filter((lead) => Boolean(lead.phone));

  if (validLeads.length === 0) {
    throw new Error('No selected leads have a WhatsApp-capable phone number.');
  }

  const status = data.sendMode === 'scheduled' && data.scheduledAt ? 'scheduled' : 'draft';
  const now = FieldValue.serverTimestamp();
  const campaignRef = collectionRef('whatsapp_campaigns').doc();

  const batch = adminDb.batch();
  batch.set(campaignRef, {
    name: data.name,
    description: data.description,
    templateId: data.templateId,
    templateName: template.name,
    templateLanguage: template.language,
    sender: template.sender,
    status,
    sendMode: data.sendMode,
    scheduledAt: data.scheduledAt ? Timestamp.fromDate(new Date(data.scheduledAt)) : null,
    timezone: data.timezone,
    segmentSnapshot: null,
    leadIds: validLeads.map((lead) => lead.id),
    leadCount: validLeads.length,
    queuedCount: validLeads.length,
    sentCount: 0,
    deliveredCount: 0,
    seenCount: 0,
    replyCount: 0,
    failedCount: 0,
    lastDispatchedAt: null,
    createdAt: now,
    updatedAt: now,
    ownerId: data.ownerId,
  });

  for (const lead of validLeads) {
    const recipientRef = collectionRef('whatsapp_campaign_recipients').doc();
    batch.set(recipientRef, {
      campaignId: campaignRef.id,
      leadId: lead.id,
      phone: normalizePhone(lead.phone!),
      templateParams: resolveTemplateParameters(template.variables ?? [], lead),
      status: 'queued',
      infobipMessageId: null,
      failureReason: null,
      attemptCount: 0,
      queuedAt: now,
      sentAt: null,
      deliveredAt: null,
      seenAt: null,
      repliedAt: null,
      lastEventAt: null,
    });
  }

  if (status === 'scheduled' && data.scheduledAt) {
    const jobRef = collectionRef('whatsapp_scheduled_jobs').doc();
    batch.set(jobRef, {
      jobType: 'campaign_dispatch',
      status: 'pending',
      campaignId: campaignRef.id,
      automationId: null,
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

  if (data.sendMode === 'send_now') {
    await dispatchCampaign(campaignRef.id);
  }

  return { id: campaignRef.id };
}

export async function createAutomation(payload: unknown) {
  const data = createAutomationSchema.parse(payload);
  const templateSnap = await collectionRef('whatsapp_templates').doc(data.templateId).get();
  if (!templateSnap.exists) {
    throw new Error('Template not found for automation.');
  }

  const template = templateSnap.data()!;
  const docRef = await collectionRef('whatsapp_automations').add({
    ...data,
    sender: template.sender,
    status: data.triggerType === 'manual' ? 'draft' : 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id };
}

function resolveTemplateParameters(
  variables: Array<{ key: string; sample: string; sourceField?: string }>,
  lead: LeadRecord
) {
  return variables.map((variable) => {
    if (variable.sourceField) {
      const mappedValue = lead[variable.sourceField as keyof LeadRecord];
      if (mappedValue != null && String(mappedValue).trim()) {
        return String(mappedValue);
      }
    }

    switch (variable.key) {
      case '{{1}}':
        return lead.first_name || lead.full_name || variable.sample;
      case '{{2}}':
        return lead.company_name || variable.sample;
      case '{{3}}':
        return lead.city || variable.sample;
      default:
        return variable.sample;
    }
  });
}

async function upsertConversation(leadId: string, phone: string, preview: string, direction: 'inbound' | 'outbound') {
  const conversationRef = collectionRef('whatsapp_conversations').doc(leadId);
  const now = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    leadId,
    phone,
    lastMessagePreview: preview,
    status: 'active',
  };

  if (direction === 'outbound') {
    update.lastOutboundAt = now;
  } else {
    update.lastInboundAt = now;
    update.unreadCount = FieldValue.increment(1);
    update.sessionWindowClosesAt = sessionWindowCloseDate(new Date());
  }

  await conversationRef.set(update, { merge: true });
  return conversationRef.id;
}

export async function dispatchCampaign(campaignId: string) {
  const campaignRef = collectionRef('whatsapp_campaigns').doc(campaignId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) {
    throw new Error('Campaign not found.');
  }

  const campaign = campaignSnap.data()!;
  const templateSnap = await collectionRef('whatsapp_templates').doc(campaign.templateId).get();
  if (!templateSnap.exists) {
    throw new Error('Template not found for campaign.');
  }

  const template = templateSnap.data()!;
  const recipientsSnap = await collectionRef('whatsapp_campaign_recipients')
    .where('campaignId', '==', campaignId)
    .where('status', '==', 'queued')
    .get();

  let sentCount = 0;
  let failedCount = 0;

  for (const recipientDoc of recipientsSnap.docs) {
    const recipient = recipientDoc.data();
    try {
      const sendResult = await sendInfobipTemplate({
        sender: campaign.sender,
        to: recipient.phone,
        templateName: template.name,
        language: template.language,
        bodyParameters: recipient.templateParams ?? [],
      });

      const leadSnap = await collectionRef('leads').doc(recipient.leadId).get();
      const lead = leadSnap.data() as LeadRecord | undefined;
      const conversationId = await upsertConversation(
        recipient.leadId,
        recipient.phone,
        template.bodyText,
        'outbound'
      );

      await recipientDoc.ref.update({
        status: 'sent',
        infobipMessageId: sendResult.messageId,
        sentAt: FieldValue.serverTimestamp(),
        lastEventAt: FieldValue.serverTimestamp(),
        attemptCount: FieldValue.increment(1),
      });

      await collectionRef('whatsapp_messages').add({
        leadId: recipient.leadId,
        campaignId,
        conversationId,
        direction: 'outbound',
        messageType: 'template',
        templateId: campaign.templateId,
        templateName: template.name,
        contentPreview: template.bodyText,
        rawPayload: sendResult.raw,
        status: 'sent',
        infobipMessageId: sendResult.messageId,
        inReplyTo: null,
        sentAt: FieldValue.serverTimestamp(),
        deliveredAt: null,
        seenAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      await collectionRef('activities').add({
        lead_id: recipient.leadId,
        lead_name: lead?.full_name || lead?.company_name || 'Lead',
        event_type: 'status_changed',
        channel: 'system',
        description: `WhatsApp template "${template.name}" sent.`,
        timestamp: FieldValue.serverTimestamp(),
        user_id: 'system',
        user_name: 'WhatsApp Automation',
        user_avatar: '',
      });

      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      await recipientDoc.ref.update({
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown Infobip error',
        lastEventAt: FieldValue.serverTimestamp(),
        attemptCount: FieldValue.increment(1),
      });
    }
  }

  await campaignRef.update({
    status: sentCount > 0 ? 'active' : 'failed',
    sentCount: FieldValue.increment(sentCount),
    failedCount: FieldValue.increment(failedCount),
    queuedCount: FieldValue.increment(-(sentCount + failedCount)),
    lastDispatchedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { campaignId, sentCount, failedCount };
}

export async function sendFreeFormMessage(payload: unknown) {
  const data = sendMessageSchema.parse(payload);
  const leadSnap = await collectionRef('leads').doc(data.leadId).get();
  if (!leadSnap.exists) {
    throw new Error('Lead not found.');
  }

  const lead = { id: leadSnap.id, ...leadSnap.data() } as LeadRecord;
  if (!lead.phone) {
    throw new Error('Lead does not have a phone number.');
  }

  const { sender } = getRequiredInfobipConfig();
  const conversationId =
    data.conversationId ?? (await upsertConversation(lead.id, normalizePhone(lead.phone), data.text, 'outbound'));

  const result = await sendInfobipTextMessage({
    sender,
    to: normalizePhone(lead.phone),
    text: data.text,
  });

  await collectionRef('whatsapp_messages').add({
    leadId: lead.id,
    campaignId: null,
    conversationId,
    direction: 'outbound',
    messageType: 'free_form',
    templateId: null,
    templateName: null,
    contentPreview: data.text,
    rawPayload: result.raw,
    status: 'sent',
    infobipMessageId: result.messageId,
    inReplyTo: null,
    sentAt: FieldValue.serverTimestamp(),
    deliveredAt: null,
    seenAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { conversationId, messageId: result.messageId };
}

export async function processInboundWebhook(payload: Record<string, unknown>) {
  const results = (payload.results as Array<Record<string, unknown>> | undefined) ?? [];

  for (const result of results) {
    const from = String(result.from ?? '');
    const text = String(
      (result.message as Record<string, unknown> | undefined)?.text ??
        (result.message as Record<string, unknown> | undefined)?.content ??
        ''
    );
    const normalizedPhone = normalizePhone(from);
    const leadSnap = await collectionRef('leads').where('phone', '==', normalizedPhone).limit(1).get();
    const leadDoc = leadSnap.docs[0];
    if (!leadDoc) continue;

    const conversationId = await upsertConversation(leadDoc.id, normalizedPhone, text, 'inbound');
    await collectionRef('whatsapp_messages').add({
      leadId: leadDoc.id,
      campaignId: null,
      conversationId,
      direction: 'inbound',
      messageType: 'free_form',
      templateId: null,
      templateName: null,
      contentPreview: text,
      rawPayload: result,
      status: 'replied',
      infobipMessageId: String(result.messageId ?? ''),
      inReplyTo: null,
      sentAt: null,
      deliveredAt: null,
      seenAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    await collectionRef('whatsapp_events').add({
      type: 'inbound_message',
      leadId: leadDoc.id,
      campaignId: null,
      messageId: String(result.messageId ?? ''),
      eventAt: FieldValue.serverTimestamp(),
      payload: result,
      source: 'infobip_webhook',
    });
  }

  return { processed: results.length };
}

export async function processStatusWebhook(payload: Record<string, unknown>) {
  const results = (payload.results as Array<Record<string, unknown>> | undefined) ?? [];
  let processed = 0;

  for (const result of results) {
    const messageId = String(result.messageId ?? '');
    const statusName = String(
      (result.status as Record<string, unknown> | undefined)?.groupName ??
        (result.status as Record<string, unknown> | undefined)?.name ??
        ''
    ).toLowerCase();
    if (!messageId) continue;

    const messagesSnap = await collectionRef('whatsapp_messages')
      .where('infobipMessageId', '==', messageId)
      .limit(1)
      .get();

    const messageDoc = messagesSnap.docs[0];
    if (!messageDoc) continue;

    const message = messageDoc.data();
    const recipientSnap = await collectionRef('whatsapp_campaign_recipients')
      .where('infobipMessageId', '==', messageId)
      .limit(1)
      .get();
    const recipientDoc = recipientSnap.docs[0];

    const updates: Record<string, unknown> = {
      status:
        statusName.includes('seen')
          ? 'seen'
          : statusName.includes('delivered')
          ? 'delivered'
          : statusName.includes('fail')
          ? 'failed'
          : 'sent',
    };

    if (updates.status === 'delivered') {
      updates.deliveredAt = FieldValue.serverTimestamp();
    }
    if (updates.status === 'seen') {
      updates.seenAt = FieldValue.serverTimestamp();
    }

    await messageDoc.ref.update(updates);

    if (recipientDoc) {
      await recipientDoc.ref.update({
        ...updates,
        lastEventAt: FieldValue.serverTimestamp(),
      });
    }

    if (message.campaignId) {
      const campaignRef = collectionRef('whatsapp_campaigns').doc(message.campaignId);
      await campaignRef.set(
        {
          deliveredCount: updates.status === 'delivered' ? FieldValue.increment(1) : FieldValue.increment(0),
          seenCount: updates.status === 'seen' ? FieldValue.increment(1) : FieldValue.increment(0),
          failedCount: updates.status === 'failed' ? FieldValue.increment(1) : FieldValue.increment(0),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await collectionRef('whatsapp_events').add({
      type: 'delivery_status',
      leadId: message.leadId,
      campaignId: message.campaignId ?? null,
      messageId,
      eventAt: FieldValue.serverTimestamp(),
      payload: result,
      source: 'infobip_webhook',
    });
    processed += 1;
  }

  return { processed };
}

export async function dispatchDueJobs() {
  const now = Timestamp.now();
  const jobsSnap = await collectionRef('whatsapp_scheduled_jobs')
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
        await dispatchCampaign(String(job.campaignId));
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
