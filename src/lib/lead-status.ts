export const PIPELINE_LEAD_STATUSES = [
  'new',
  'contacted',
  'demo_sent',
  'trial_waiting',
  'trial_started',
] as const;

export const LEAD_STATUS_DROPDOWN_STATUSES = [
  'won',
  'lost',
  'not_interested',
  'pause_lead',
] as const;

export const LEAD_STATUS_OPTIONS = [
  ...PIPELINE_LEAD_STATUSES,
  ...LEAD_STATUS_DROPDOWN_STATUSES,
] as const;

export type CanonicalLeadStatus = (typeof LEAD_STATUS_OPTIONS)[number] | 'merged';

const LEGACY_LEAD_STATUS_MAP: Record<string, CanonicalLeadStatus> = {
  reviewed: 'new',
  qualified: 'contacted',
  replied: 'contacted',
  demo_booked: 'demo_sent',
  closed_won: 'won',
  closed_lost: 'lost',
  not_relevant: 'not_interested',
};

export const LEAD_STATUS_LABELS: Record<CanonicalLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  demo_sent: 'Demo sent',
  trial_waiting: 'Trial waiting',
  trial_started: 'Trial started',
  won: 'Won',
  lost: 'Lost',
  not_interested: 'Not interested',
  pause_lead: 'Pause lead',
  merged: 'Merged',
};

export const LEAD_STATUS_BADGE_STYLES: Record<CanonicalLeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-violet-100 text-violet-800 border-violet-200',
  demo_sent: 'bg-teal-100 text-teal-800 border-teal-200',
  trial_waiting: 'bg-amber-100 text-amber-900 border-amber-200',
  trial_started: 'bg-sky-100 text-sky-800 border-sky-200',
  won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  lost: 'bg-rose-100 text-rose-800 border-rose-200',
  not_interested: 'bg-stone-100 text-stone-800 border-stone-200',
  pause_lead: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  merged: 'bg-zinc-100 text-zinc-800 border-zinc-200',
};

export function normalizeLeadStatus(value?: string | null): CanonicalLeadStatus {
  if (!value) return 'new';
  if (value in LEGACY_LEAD_STATUS_MAP) {
    return LEGACY_LEAD_STATUS_MAP[value];
  }

  if ((LEAD_STATUS_OPTIONS as readonly string[]).includes(value)) {
    return value as CanonicalLeadStatus;
  }

  if (value === 'merged') {
    return 'merged';
  }

  return 'new';
}

export function getLeadStatusLabel(value?: string | null) {
  return LEAD_STATUS_LABELS[normalizeLeadStatus(value)];
}

export function isTerminalLeadStatus(value?: string | null) {
  const normalized = normalizeLeadStatus(value);
  return (
    normalized === 'won' ||
    normalized === 'lost' ||
    normalized === 'not_interested' ||
    normalized === 'pause_lead' ||
    normalized === 'merged'
  );
}
