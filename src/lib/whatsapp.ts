export const whatsappTemplateStatuses = [
  'draft',
  'submitted',
  'pending_approval',
  'approved',
  'rejected',
  'paused',
  'archived',
] as const;

export const whatsappCampaignStatuses = [
  'draft',
  'scheduled',
  'active',
  'paused',
  'completed',
  'failed',
] as const;

export const whatsappAutomationStatuses = ['active', 'paused', 'draft'] as const;

export const whatsappRecipientStatuses = [
  'queued',
  'sent',
  'delivered',
  'seen',
  'replied',
  'failed',
  'skipped',
] as const;

export const whatsappJobStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;

export const whatsappTriggerTypes = [
  'manual',
  'scheduled',
  'lead_status_changed',
  'reply_missing',
  'demo_booked',
] as const;

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export function extractTemplateVariables(bodyText: string) {
  const matches = bodyText.match(/{{\d+}}/g) ?? [];
  return Array.from(new Set(matches)).map((token) => ({
    key: token,
    index: Number(token.replace(/[{}]/g, '')),
  }));
}

export function mapInfobipTemplateStatus(status?: string) {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case 'APPROVED':
      return 'approved';
    case 'PENDING':
    case 'IN_REVIEW':
      return 'pending_approval';
    case 'REJECTED':
      return 'rejected';
    case 'PAUSED':
      return 'paused';
    case 'SUBMITTED':
      return 'submitted';
    default:
      return 'draft';
  }
}

export function sessionWindowCloseDate(lastInboundAt?: Date | null) {
  if (!lastInboundAt) return null;
  return new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000);
}
