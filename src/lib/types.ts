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
  lead_status: 'new' | 'reviewed' | 'qualified' | 'contacted' | 'replied' | 'demo_booked' | 'closed_won' | 'closed_lost' | 'not_relevant';
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
  importedAt: Timestamp;
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
