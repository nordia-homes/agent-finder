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
  classification: 'likely_independent' | 'possible_independent' | 'agency';
  lead_status: 'new' | 'reviewed' | 'qualified' | 'contacted' | 'replied' | 'demo_booked' | 'closed_won' | 'closed_lost' | 'not_relevant';
  outreach_status: 'not_started' | 'in_sequence' | 'paused' | 'completed' | 'replied' | 'bounced';
  owner_id: string;
  created_at: string;
  last_contact_at: string | null;
  owner: User;
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

export type User = {
  id: string;
  name: string;
  avatar: string;
};

export type Activity = {
  id: string;
  lead_name: string;
  event_type: 'email_sent' | 'note_added' | 'status_changed' | 'task_created';
  channel: 'email' | 'system' | 'task';
  description: string;
  timestamp: string;
  user: User;
};

export type Task = {
  id: string;
  lead_name: string;
  type: 'call' | 'follow_up' | 'demo' | 'review' | 'reply_check';
  due_date: string;
  is_overdue: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
