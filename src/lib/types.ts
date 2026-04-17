import type { Timestamp } from 'firebase/firestore';

export type Lead = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  company_name: string;
  business_type: string;
  city: string;
  county: string;
  phone: string;
  email: string;
  website: string;
  source: string;
  source_url: string;
  active_listings_count: number;
  independent_score: number;
  description?: string;
  classification: 'likely_independent' | 'possible_independent' | 'agency';
  lead_status: 'new' | 'reviewed' | 'qualified' | 'contacted' | 'replied' | 'demo_booked' | 'closed_won' | 'closed_lost' | 'not_relevant' | 'merged';
  outreach_status: 'not_started' | 'in_sequence' | 'paused' | 'completed' | 'replied' | 'bounced';
  owner_id: string;
  created_at: Timestamp;
  last_contact_at: Timestamp | null;
  hasIndependentPhrase: boolean;
  isPersonalNameDetected: boolean;
  hasSoloBusinessIndicators: boolean;
  isSingleCityActivity: boolean;
  noLargeBrandDetected: boolean;
  hasSoloOperatorSignals: boolean;
  hasLargeAgencyBrand: boolean;
  hasMultipleOfficeLocations: boolean;
  hasTeamWording: boolean;
  hasFranchiseOrCorporateWording: boolean;
  merged_into?: string | null;
};

export type UserProfile = {
  uid: string;
  name: string;
  avatar: string;
  email: string;
};

export type Activity = {
  id: string;
  lead_id: string;
  lead_name: string;
  event_type: 'email_sent' | 'note_added' | 'status_changed' | 'task_created';
  channel: 'email' | 'system' | 'task';
  description: string;
  timestamp: Timestamp;
  user_id: string;
  user_name: string;
  user_avatar: string;
};

export type Task = {
  id: string;
  lead_id: string;
  lead_name: string;
  owner_id: string;
  type: 'call' | 'follow_up' | 'demo' | 'review' | 'reply_check';
  due_date: Timestamp;
  is_overdue: boolean;
  completed: boolean;
  completed_at: Timestamp | null;
  created_at: Timestamp;
};

export type Campaign = {
  id: string;
  name: string;
  description: string;
  channel: 'email' | 'whatsapp' | 'ai_call';
  status: 'draft' | 'active' | 'paused' | 'completed';
  owner_id: string;
  created_at: Timestamp;
  lead_ids: string[];
};

export type WhatsAppTemplateStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'paused'
  | 'archived';

export type WhatsAppCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed';

export type WhatsAppAutomationStatus = 'active' | 'paused' | 'draft';

export type WhatsAppRecipientStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'replied'
  | 'failed'
  | 'skipped';

export type WhatsAppMessageDirection = 'inbound' | 'outbound';
export type WhatsAppMessageType = 'template' | 'free_form';
export type WhatsAppJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type WhatsAppTriggerType =
  | 'manual'
  | 'scheduled'
  | 'lead_status_changed'
  | 'reply_missing'
  | 'demo_booked';

export type WhatsAppTemplateButton = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  payload?: string;
};

export type WhatsAppTemplateVariable = {
  key: string;
  index: number;
  label: string;
  sample: string;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: WhatsAppTemplateStatus;
  sender: string;
  headerType: 'TEXT' | 'NONE';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variables: WhatsAppTemplateVariable[];
  buttons: WhatsAppTemplateButton[];
  structure?: Record<string, unknown>;
  infobipTemplateId?: string | null;
  rejectionReason?: string | null;
  lastSyncedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
};

export type WhatsAppCampaign = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  templateName: string;
  templateLanguage: string;
  sender: string;
  status: WhatsAppCampaignStatus;
  sendMode: 'manual' | 'send_now' | 'scheduled' | 'automation';
  scheduledAt?: Timestamp | null;
  timezone: string;
  segmentSnapshot?: string | null;
  leadIds: string[];
  leadCount: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  seenCount: number;
  replyCount: number;
  failedCount: number;
  lastDispatchedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
};

export type WhatsAppCampaignRecipient = {
  id: string;
  campaignId: string;
  leadId: string;
  phone: string;
  templateParams: string[];
  status: WhatsAppRecipientStatus;
  infobipMessageId?: string | null;
  failureReason?: string | null;
  attemptCount: number;
  queuedAt?: Timestamp | null;
  sentAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
  seenAt?: Timestamp | null;
  repliedAt?: Timestamp | null;
  lastEventAt?: Timestamp | null;
};

export type WhatsAppMessage = {
  id: string;
  leadId: string;
  campaignId?: string | null;
  conversationId: string;
  direction: WhatsAppMessageDirection;
  messageType: WhatsAppMessageType;
  templateId?: string | null;
  templateName?: string | null;
  contentPreview: string;
  rawPayload?: Record<string, unknown>;
  status: WhatsAppRecipientStatus;
  infobipMessageId?: string | null;
  inReplyTo?: string | null;
  sentAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
  seenAt?: Timestamp | null;
  createdAt: Timestamp;
};

export type WhatsAppConversation = {
  id: string;
  leadId: string;
  phone: string;
  lastInboundAt?: Timestamp | null;
  lastOutboundAt?: Timestamp | null;
  lastMessagePreview: string;
  sessionWindowClosesAt?: Timestamp | null;
  unreadCount: number;
  status: 'active' | 'inactive';
};

export type WhatsAppEvent = {
  id: string;
  type: string;
  leadId?: string | null;
  campaignId?: string | null;
  messageId?: string | null;
  eventAt: Timestamp;
  payload: Record<string, unknown>;
  source: 'infobip_webhook' | 'system' | 'user';
};

export type WhatsAppAutomation = {
  id: string;
  name: string;
  description: string;
  status: WhatsAppAutomationStatus;
  triggerType: WhatsAppTriggerType;
  triggerConfig: Record<string, unknown>;
  templateId: string;
  sender: string;
  delayMinutes?: number | null;
  schedule?: string | null;
  timezone: string;
  filters: Record<string, unknown>;
  stopConditions: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
};

export type WhatsAppScheduledJob = {
  id: string;
  jobType: 'campaign_dispatch' | 'automation_dispatch';
  status: WhatsAppJobStatus;
  campaignId?: string | null;
  automationId?: string | null;
  leadId?: string | null;
  runAt: Timestamp;
  timezone: string;
  payload: Record<string, unknown>;
  lastAttemptAt?: Timestamp | null;
  attemptCount: number;
  error?: string | null;
};

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type Import = {
  id: string;
  full_name?: string;
  company_name?: string;
  address?: string;
  city?: string;
  city_line?: string;
  county?: string;
  phone?: string;
  phone_prefix?: string;
  phone_status?: 'found' | 'missing' | 'not_found' | 'click_failed' | 'challenge_detected' | 'partial_visible';
  email?: string;
  website?: string;
  image_url?: string;
  description?: string;
  source?: string;
  source_url?: string;
  active_listings_count?: number;
  sales_count?: number;
  rent_count?: number;
  sales_price_from?: number;
  sales_price_to?: number;
  rent_price_from?: number;
  rent_price_to?: number;
  independent_score?: number;
  classification?: 'likely_independent' | 'possible_independent' | 'agency';
  review_status: 'pending_review' | 'approved' | 'rejected' | 'duplicate';
  importedAt: string;
  listed_since?: string;
  jobId?: string;
  pageNumber?: number;
  pageUrl?: string;
  seller_id?: string;
};

export type ScrapeJob = {
    id: string;
    status: 'running' | 'completed' | 'failed';
    source: string;
    startUrl: string;
    pagesProcessed: number;
    totalImported: number;
    currentPageNumber: number;
    currentPageUrl: string;
    nextPageUrl: string;
    error: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    finishedAt: Timestamp | null;
}
