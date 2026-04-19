'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  MapPin,
  Phone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/types';
import {
  LEAD_STATUS_BADGE_STYLES,
  getLeadStatusLabel,
  normalizeLeadStatus,
} from '@/lib/lead-status';

interface LeadSpotlightGridProps {
  leads: Lead[];
  isLoading?: boolean;
}

const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'border-emerald-200/80 bg-emerald-100/80 text-emerald-900',
  possible_independent: 'border-amber-200/80 bg-amber-100/80 text-amber-900',
  agency: 'border-rose-200/80 bg-rose-100/80 text-rose-900',
};

function getScoreStyle(score: number) {
  if (score >= 80) {
    return {
      pill: 'border-emerald-200 bg-emerald-100 text-emerald-900',
      bar: 'from-emerald-400 via-teal-400 to-cyan-400',
      glow: 'bg-emerald-300/40',
      label: 'Strong fit',
    };
  }

  if (score >= 55) {
    return {
      pill: 'border-amber-200 bg-amber-100 text-amber-900',
      bar: 'from-amber-400 via-orange-400 to-yellow-300',
      glow: 'bg-amber-300/40',
      label: 'Promising fit',
    };
  }

  return {
    pill: 'border-rose-200 bg-rose-100 text-rose-900',
    bar: 'from-rose-400 via-fuchsia-400 to-orange-300',
    glow: 'bg-rose-300/40',
    label: 'Needs review',
  };
}

function LeadCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[#dbe3ef] bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(241,246,253,0.98))] p-6 shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
      <div className="space-y-5 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-full bg-slate-200" />
              <div className="h-3 w-40 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="h-8 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-16 rounded-2xl bg-white/80" />
          <div className="h-16 rounded-2xl bg-white/80" />
        </div>
        <div className="h-24 rounded-[24px] bg-white/80" />
      </div>
    </div>
  );
}

function formatLeadCreatedAt(createdAt: Lead['created_at'] | null | undefined) {
  if (!createdAt || typeof createdAt.toDate !== 'function') {
    return 'Added just now';
  }

  try {
    return `Added ${format(createdAt.toDate(), 'MMM d, yyyy')}`;
  } catch {
    return 'Added just now';
  }
}

export function LeadSpotlightGrid({ leads, isLoading }: LeadSpotlightGridProps) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d8aa3]">
            Spotlight
          </p>
          <div className="h-8 w-72 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <LeadCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (!leads.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d8aa3]">
            Spotlight
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#152033]">
            All leads, in a sharper view
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-[#667691]">
          Browse the full lead list in a more premium layout, with score, readiness, and core contact signals visible at a glance.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {leads.map((lead) => {
          const name = lead.full_name || lead.company_name || 'Unknown lead';
          const normalizedStatus = normalizeLeadStatus(lead.lead_status);
          const score = lead.independent_score ?? 0;
          const scoreStyle = getScoreStyle(score);
          const createdAtLabel = formatLeadCreatedAt(lead.created_at);
          const initials = name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join('')
            .toUpperCase();

          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="group relative overflow-hidden rounded-[30px] border border-[#dbe3ef] bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(241,246,253,0.98))] p-6 shadow-[0_20px_48px_rgba(33,51,84,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#c4d5eb] hover:shadow-[0_28px_72px_rgba(33,51,84,0.14)]"
            >
              <div className={cn('absolute right-8 top-8 h-24 w-24 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-90', scoreStyle.glow)} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%)]" />

              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border border-white/70 bg-[linear-gradient(145deg,_#eff5ff,_#dce7fb)] shadow-[0_12px_24px_rgba(65,87,130,0.18)]">
                      <AvatarFallback className="rounded-2xl bg-transparent text-base font-semibold text-[#415782]">
                        {initials || 'L'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-semibold tracking-[-0.04em] text-[#152033]">
                          {name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                            classificationStyles[lead.classification]
                          )}
                        >
                          {lead.classification.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-[#667691]">
                        {lead.company_name || lead.email || 'No company or email added yet'}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[#415782] shadow-[0_10px_24px_rgba(33,51,84,0.08)]">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">Priority</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">
                          Independent score
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#152033]">
                          {score}
                        </p>
                      </div>
                      <div className={cn('rounded-full border px-3 py-1 text-xs font-semibold', scoreStyle.pill)}>
                        <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                        {scoreStyle.label}
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-[#e7edf6]">
                      <div
                        className={cn('h-2 rounded-full bg-gradient-to-r transition-all duration-500', scoreStyle.bar)}
                        style={{ width: `${Math.min(Math.max(score, 8), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(145deg,_rgba(255,255,255,0.88),_rgba(236,244,255,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">
                      Pipeline status
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          LEAD_STATUS_BADGE_STYLES[normalizedStatus],
                          'rounded-full border px-3 py-1 text-xs font-medium'
                        )}
                      >
                        {getLeadStatusLabel(normalizedStatus)}
                      </Badge>
                      <span className="text-sm text-[#5f6f8c]">
                        {lead.active_listings_count ?? 0} active listings
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#5f6f8c]">
                      <CalendarDays className="h-4 w-4 text-[#7b8fb6]" />
                      {createdAtLabel}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#dce5f2] bg-[linear-gradient(145deg,_rgba(244,248,254,0.96),_rgba(255,255,255,0.9))] p-4">
                  <div className="grid gap-3 text-sm text-[#465775] sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1.2fr)]">
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-3">
                      <MapPin className="h-4 w-4 text-[#6f86af]" />
                      <span className="truncate">{[lead.city, lead.county].filter(Boolean).join(', ') || 'Location pending'}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/80 px-3 py-3">
                      <Phone className="h-4 w-4 text-[#6f86af]" />
                      <span className="min-w-0 whitespace-nowrap text-ellipsis overflow-hidden sm:overflow-visible">
                        {lead.phone || 'Phone missing'}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/80 px-3 py-3">
                      <Building2 className="h-4 w-4 text-[#6f86af]" />
                      <span className="truncate">
                        {getLeadStatusLabel(normalizedStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e2eaf5] pt-4">
                    <p className="text-sm text-[#667691]">
                      Open the full profile to continue outreach, notes, and next actions.
                    </p>
                    <div className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#152033] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 group-hover:translate-x-0.5">
                      View lead
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
