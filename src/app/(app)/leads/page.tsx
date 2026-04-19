'use client';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Loader2, PlusCircle, Search, SlidersHorizontal, Sparkles, WandSparkles } from "lucide-react";
import { LeadSpotlightGrid } from "@/components/leads/lead-spotlight-grid";
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Lead } from '@/lib/types';
import { getLeadStatusLabel, normalizeLeadStatus } from '@/lib/lead-status';
import Link from 'next/link';

type ClassificationFilter = 'all' | Lead['classification'];
type StatusFilter = 'all' | 'new' | 'contacted' | 'demo_sent' | 'trial_started';
type MobileFilter = 'all' | 'mobile_only';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All stages' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_sent', label: 'Demo sent' },
  { value: 'trial_started', label: 'Trial started' },
];

const CLASSIFICATION_FILTERS: Array<{ value: ClassificationFilter; label: string }> = [
  { value: 'all', label: 'All lead types' },
  { value: 'likely_independent', label: 'Likely independent' },
  { value: 'possible_independent', label: 'Possible independent' },
  { value: 'agency', label: 'Agency' },
];

const MOBILE_FILTERS: Array<{ value: MobileFilter; label: string }> = [
  { value: 'all', label: 'Toate numerele' },
  { value: 'mobile_only', label: 'Incepe cu 07' },
];

const PAGE_SIZE_OPTIONS = ['4', '6', '8', '12'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function evaluateLeadProfile(input: {
  full_name: string;
  company_name: string;
  city: string;
  county: string;
  phone: string;
  email: string;
  website: string;
  business_type: string;
  description: string;
}) {
  const combined = [
    input.full_name,
    input.company_name,
    input.business_type,
    input.description,
    input.website,
  ]
    .join(' ')
    .toLowerCase();

  const agencySignals = [
    'imobiliare',
    'real estate',
    'agency',
    'agencie',
    'broker',
    'team',
    'grup',
    'group',
    'franchise',
    'office',
  ];
  const independentSignals = [
    'independent',
    'consultant',
    'consultant imobiliar',
    'advisor',
    'broker independent',
    'agent',
    'pfa',
    'freelance',
  ];

  const hasAgencySignal = agencySignals.some((signal) => combined.includes(signal));
  const hasIndependentSignal = independentSignals.some((signal) => combined.includes(signal));
  const hasPersonalName = input.full_name.trim().split(' ').filter(Boolean).length >= 2;
  const hasWebsite = Boolean(input.website.trim());
  const hasDirectContact = Boolean(input.phone.trim() || input.email.trim());
  const singleCityActivity = Boolean(input.city.trim() && !input.county.trim());

  let score = 45;
  if (hasPersonalName) score += 12;
  if (hasIndependentSignal) score += 18;
  if (hasAgencySignal) score -= 24;
  if (hasWebsite) score += 4;
  if (hasDirectContact) score += 6;
  if (singleCityActivity) score += 4;
  if (input.company_name.trim() && !hasPersonalName) score -= 6;

  score = Math.max(0, Math.min(100, score));

  let classification: Lead['classification'] = 'possible_independent';
  if (score >= 75 && !hasAgencySignal) {
    classification = 'likely_independent';
  } else if (score < 45 || hasAgencySignal) {
    classification = 'agency';
  }

  return {
    score,
    classification,
    flags: {
      hasIndependentPhrase: hasIndependentSignal,
      isPersonalNameDetected: hasPersonalName,
      hasSoloBusinessIndicators: combined.includes('pfa') || combined.includes('freelance'),
      isSingleCityActivity: singleCityActivity,
      noLargeBrandDetected: !hasAgencySignal,
      hasSoloOperatorSignals: hasIndependentSignal || hasPersonalName,
      hasLargeAgencyBrand: hasAgencySignal,
      hasMultipleOfficeLocations: combined.includes('office') || combined.includes('locations'),
      hasTeamWording: combined.includes('team'),
      hasFranchiseOrCorporateWording:
        combined.includes('franchise') || combined.includes('corporate') || combined.includes('group'),
    },
  };
}

function getLeadCreatedAtMs(createdAt: Lead['created_at'] | null | undefined) {
  if (!createdAt || typeof createdAt.toDate !== 'function') {
    return 0;
  }

  try {
    return createdAt.toDate().getTime();
  } catch {
    return 0;
  }
}

export default function LeadsPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('6');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [newLead, setNewLead] = useState({
    full_name: '',
    company_name: '',
    city: '',
    county: '',
    phone: '',
    email: '',
    website: '',
    business_type: '',
    description: '',
  });

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading, error } = useCollection<Lead>(leadsQuery);

  const activeLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => lead.lead_status !== 'merged' && !lead.archived_at);
  }, [leads]);

  const stats = useMemo(() => {
    const total = activeLeads.length;
    const contacted = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'contacted').length;
    const demos = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'demo_sent').length;
    const trialStarted = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'trial_started').length;
    return { total, contacted, demos, trialStarted };
  }, [activeLeads]);

  const cityFilters = useMemo(() => {
    const cities = Array.from(
      new Set(
        activeLeads
          .map((lead) => lead.city?.trim())
          .filter((city): city is string => Boolean(city))
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['all', ...cities];
  }, [activeLeads]);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const spotlightLeads = useMemo(() => {
    return [...activeLeads]
      .filter((lead) => {
        const normalizedStatus = normalizeLeadStatus(lead.lead_status);
        const score = lead.independent_score ?? 0;
        const searchableText = [
          lead.full_name,
          lead.company_name,
          lead.email,
          lead.phone,
          lead.city,
          lead.county,
          lead.website,
          getLeadStatusLabel(normalizedStatus),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch =
          !deferredSearchQuery || searchableText.includes(deferredSearchQuery);
        const matchesStatus =
          statusFilter === 'all' || normalizedStatus === statusFilter;
        const matchesClassification =
          classificationFilter === 'all' || lead.classification === classificationFilter;
        const matchesCity =
          cityFilter === 'all' || (lead.city?.trim() ?? '') === cityFilter;
        const normalizedPhone = (lead.phone ?? '').replace(/\s+/g, '');
        const matchesMobile =
          mobileFilter === 'all' || normalizedPhone.startsWith('07');

        return (
          matchesSearch &&
          matchesStatus &&
          matchesClassification &&
          matchesCity &&
          matchesMobile
        );
      })
      .sort((a, b) => {
        const scoreDelta = (b.independent_score ?? 0) - (a.independent_score ?? 0);
        if (scoreDelta !== 0) return scoreDelta;
        const listingDelta = (b.active_listings_count ?? 0) - (a.active_listings_count ?? 0);
        if (listingDelta !== 0) return listingDelta;
        return getLeadCreatedAtMs(b.created_at) - getLeadCreatedAtMs(a.created_at);
      });
  }, [activeLeads, cityFilter, classificationFilter, deferredSearchQuery, mobileFilter, statusFilter]);

  const activeFilterCount = [
    searchQuery.trim() ? 'search' : null,
    statusFilter !== 'all' ? 'status' : null,
    classificationFilter !== 'all' ? 'classification' : null,
    cityFilter !== 'all' ? 'city' : null,
    mobileFilter !== 'all' ? 'mobile' : null,
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(spotlightLeads.length / Number(pageSize)));
  const paginatedLeads = useMemo(() => {
    const size = Number(pageSize);
    const startIndex = (currentPage - 1) * size;
    return spotlightLeads.slice(startIndex, startIndex + size);
  }, [currentPage, pageSize, spotlightLeads]);

  const paginationRange = useMemo(() => {
    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, classificationFilter, cityFilter, mobileFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const isLoading = userLoading || leadsLoading;

  const handleLeadFieldChange = (field: keyof typeof newLead, value: string) => {
    setNewLead((current) => ({ ...current, [field]: value }));
  };

  const resetLeadForm = () => {
    setNewLead({
      full_name: '',
      company_name: '',
      city: '',
      county: '',
      phone: '',
      email: '',
      website: '',
      business_type: '',
      description: '',
    });
  };

  const handleAddLead = async () => {
    if (!firestore || !user) {
      toast({
        title: "Error",
        description: "You need to be signed in with Firestore available to add a lead.",
        variant: "destructive",
      });
      return;
    }

    const trimmedLead = {
      full_name: newLead.full_name.trim(),
      company_name: newLead.company_name.trim(),
      city: newLead.city.trim(),
      county: newLead.county.trim(),
      phone: newLead.phone.trim(),
      email: newLead.email.trim(),
      website: newLead.website.trim(),
      business_type: newLead.business_type.trim(),
      description: newLead.description.trim(),
    };

    if (!trimmedLead.full_name && !trimmedLead.company_name) {
      toast({
        title: "Missing lead name",
        description: "Add at least a full name or a company name before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedLead.phone && !trimmedLead.email && !trimmedLead.website) {
      toast({
        title: "Missing contact signal",
        description: "Add at least one contact method: phone, email, or website.",
        variant: "destructive",
      });
      return;
    }

    const digitsOnlyPhone = trimmedLead.phone.replace(/\D/g, '');
    if (trimmedLead.phone && digitsOnlyPhone.length < 8) {
      toast({
        title: "Phone looks incomplete",
        description: "Please add a more complete phone number before saving the lead.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedLead.email && !EMAIL_REGEX.test(trimmedLead.email)) {
      toast({
        title: "Invalid email",
        description: "Please use a valid email format.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedLead.website && !WEBSITE_REGEX.test(trimmedLead.website)) {
      toast({
        title: "Invalid website",
        description: "Use a valid domain or URL for the website field.",
        variant: "destructive",
      });
      return;
    }

    const normalizedWebsite = normalizeWebsite(trimmedLead.website);
    const evaluatedProfile = evaluateLeadProfile({
      ...trimmedLead,
      website: normalizedWebsite,
    });

    setIsSubmittingLead(true);

    try {
      await addDoc(collection(firestore, 'leads'), {
        full_name: trimmedLead.full_name,
        first_name: trimmedLead.full_name.split(' ').filter(Boolean)[0] ?? '',
        last_name: trimmedLead.full_name.split(' ').slice(1).join(' '),
        company_name: trimmedLead.company_name,
        business_type: trimmedLead.business_type,
        city: trimmedLead.city,
        county: trimmedLead.county,
        phone: trimmedLead.phone,
        email: trimmedLead.email,
        website: normalizedWebsite,
        source: 'manual',
        source_url: '',
        active_listings_count: 0,
        independent_score: evaluatedProfile.score,
        description: trimmedLead.description,
        classification: evaluatedProfile.classification,
        lead_status: 'new',
        outreach_status: 'not_started',
        owner_id: user.uid,
        created_at: serverTimestamp(),
        last_contact_at: null,
        uses_other_crm: null,
        other_crm_name: null,
        accepted_demo_on_whatsapp: null,
        demo_sent_at: null,
        last_ai_call_outcome: null,
        ai_call_summary: null,
        ai_call_transcript: null,
        ai_call_last_synced_at: null,
        archived_at: null,
        archived_reason: null,
        ...evaluatedProfile.flags,
      });

      toast({
        title: "Lead added",
        description: `${trimmedLead.company_name || trimmedLead.full_name} is now in your leads list with an initial ${evaluatedProfile.classification.replace('_', ' ')} classification.`,
      });
      resetLeadForm();
      setIsAddLeadOpen(false);
    } catch (error) {
      console.error('Failed to add lead:', error);
      toast({
        title: "Error",
        description: "Failed to add the lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Lead workspace
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Leads</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                  Review lead quality, spot the strongest accounts, and move the right opportunities into outreach.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="w-fit rounded-full border-[#d6e0ed] bg-white/90 px-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
                <Link href="/leads/archived">
                  Archived Leads
                </Link>
              </Button>
              <Button
                className="w-fit rounded-full bg-[#415782] px-5 text-white shadow-[0_14px_30px_rgba(47,66,104,0.22)] hover:bg-[#384d75]"
                onClick={() => setIsAddLeadOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-[26px] border border-[#dbe3ef] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_36%),linear-gradient(135deg,_rgba(244,248,253,0.98),_rgba(232,240,251,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <div className="absolute right-[-16px] top-[-16px] h-20 w-20 rounded-full bg-[rgba(126,152,194,0.16)] blur-2xl" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Active leads</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : stats.total}</p>
              <p className="mt-2 text-sm text-slate-500">Current records inside the lead workspace.</p>
            </div>
            <div className="relative overflow-hidden rounded-[26px] border border-[#dce5ef] bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.88),_transparent_34%),linear-gradient(135deg,_rgba(245,251,247,0.98),_rgba(233,246,238,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <div className="absolute left-[-18px] top-6 h-16 w-16 rounded-full bg-[rgba(112,186,145,0.15)] blur-2xl" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Contacted</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : stats.contacted}</p>
              <p className="mt-2 text-sm text-slate-500">Leads already moved beyond fresh intake.</p>
            </div>
            <div className="relative overflow-hidden rounded-[26px] border border-[#e1e0ef] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_34%),linear-gradient(135deg,_rgba(248,246,252,0.98),_rgba(238,235,248,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <div className="absolute right-0 top-0 h-24 w-24 bg-[radial-gradient(circle,_rgba(142,127,190,0.16),_transparent_58%)]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Demo sent</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : stats.demos}</p>
              <p className="mt-2 text-sm text-slate-500">Leads who accepted the demo handoff.</p>
            </div>
            <div className="relative overflow-hidden rounded-[26px] border border-[#dbe2ef] bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.88),_transparent_34%),linear-gradient(135deg,_rgba(244,247,253,0.98),_rgba(227,236,250,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <div className="absolute bottom-[-10px] right-6 h-16 w-16 rounded-full bg-[rgba(97,127,182,0.14)] blur-2xl" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Trial started</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : stats.trialStarted}</p>
              <p className="mt-2 text-sm text-slate-500">Accounts that have reached product evaluation.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(241,246,253,0.98)_62%,_rgba(248,251,255,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(86,121,180,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(165,188,225,0.16),_transparent_34%)]" />
        <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-[rgba(124,152,201,0.12)] blur-3xl" />
        <div className="absolute bottom-6 right-10 h-28 w-28 rounded-full bg-[rgba(177,198,233,0.14)] blur-3xl" />
        <div className="relative space-y-0">
          <div className="flex flex-col gap-3 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#59709b] shadow-[0_12px_28px_rgba(33,51,84,0.08)]">
                <WandSparkles className="h-3.5 w-3.5" />
                Smart filters
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#152033]">
                  Find the right lead faster
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667691]">
                  A cleaner command bar for search, stage, lead type, and locality, built to scan fast without clutter.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#5c6f90]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/92 px-4 py-2 shadow-[0_12px_30px_rgba(33,51,84,0.08)] backdrop-blur-sm">
                <SlidersHorizontal className="h-4 w-4" />
                <span>{activeFilterCount === 0 ? 'No active filters' : `${activeFilterCount} active filters`}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/92 px-4 py-2 shadow-[0_12px_30px_rgba(33,51,84,0.08)] backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Showing</span>
                <span className="text-base font-semibold text-[#152033]">{isLoading ? '...' : paginatedLeads.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-b-[32px] rounded-t-none border border-t-0 border-white/80 bg-[linear-gradient(145deg,_rgba(255,255,255,0.9),_rgba(245,249,255,0.82))] p-5 shadow-[0_20px_45px_rgba(33,51,84,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7083a8]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by lead name, company, city, email, phone..."
                  className="h-14 rounded-[22px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(246,249,255,0.96))] pl-12 pr-4 text-sm text-[#152033] shadow-[0_14px_30px_rgba(33,51,84,0.07)] placeholder:text-[#7d8aa3] focus-visible:ring-[#9eb2d5]"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]">
                <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">
                    Pipeline
                  </p>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                      {STATUS_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">
                    Lead type
                  </p>
                  <Select
                    value={classificationFilter}
                    onValueChange={(value) => setClassificationFilter(value as ClassificationFilter)}
                  >
                    <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                      <SelectValue placeholder="All lead types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                      {CLASSIFICATION_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">
                    Localitate
                  </p>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                      <SelectValue placeholder="Toate localitatile" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 rounded-[18px] border-[#d6e0ed] bg-white/95">
                      {cityFilters.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city === 'all' ? 'Toate localitatile' : city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">
                    Numar mobil
                  </p>
                  <Select value={mobileFilter} onValueChange={(value) => setMobileFilter(value as MobileFilter)}>
                    <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                      <SelectValue placeholder="Toate numerele" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                      {MOBILE_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeFilterCount > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#e0e7f1] pt-4">
                  <p className="text-sm text-[#667691]">
                    Refine the list with a few signals, then jump straight into the best leads.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setClassificationFilter('all');
                      setCityFilter('all');
                      setMobileFilter('all');
                    }}
                    className="rounded-full border border-white/90 bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5d7398] shadow-[0_10px_22px_rgba(33,51,84,0.06)] transition-colors hover:border-[#b9c9e1] hover:text-[#1d2d49]"
                  >
                    Reset all
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <LeadSpotlightGrid leads={paginatedLeads} isLoading={isLoading} />

      {!isLoading && spotlightLeads.length > 0 ? (
        <div className="rounded-[28px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] px-5 py-4 shadow-[0_18px_40px_rgba(33,51,84,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-[#667691]">
                Page <span className="font-semibold text-[#152033]">{currentPage}</span> of <span className="font-semibold text-[#152033]">{totalPages}</span>
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#667691]">Leads per page</span>
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="h-10 w-[120px] rounded-full border-[#d6e0ed] bg-white/90 px-4 text-sm shadow-[0_10px_20px_rgba(33,51,84,0.05)] focus:ring-[#9eb2d5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option} leads
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-[#d6e0ed] bg-white/90"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {paginationRange.map((page, index) => {
                const previousPage = paginationRange[index - 1];
                const showGap = previousPage && page - previousPage > 1;

                return (
                  <div key={page} className="flex items-center gap-2">
                    {showGap ? <span className="px-1 text-sm text-[#7d8aa3]">...</span> : null}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 min-w-10 rounded-full px-4 text-sm font-medium transition-all ${
                        currentPage === page
                          ? 'bg-[#152033] text-white shadow-[0_12px_24px_rgba(21,32,51,0.18)]'
                          : 'border border-[#d6e0ed] bg-white/90 text-[#526684] hover:border-[#b9c9e1] hover:text-[#1d2d49]'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-[#d6e0ed] bg-white/90"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(245,248,253,0.99))] p-0 shadow-[0_30px_80px_rgba(33,51,84,0.18)]">
          <div className="p-6 sm:p-7">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#152033]">
                Add a new lead
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-[#667691]">
                Create a lead manually and drop it straight into your premium lead workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Full name</p>
                <Input
                  value={newLead.full_name}
                  onChange={(event) => handleLeadFieldChange('full_name', event.target.value)}
                  placeholder="e.g. Andrei Popescu"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Company name</p>
                <Input
                  value={newLead.company_name}
                  onChange={(event) => handleLeadFieldChange('company_name', event.target.value)}
                  placeholder="e.g. Atlas Realty"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Phone</p>
                <Input
                  value={newLead.phone}
                  onChange={(event) => handleLeadFieldChange('phone', event.target.value)}
                  placeholder="e.g. 07..."
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Email</p>
                <Input
                  value={newLead.email}
                  onChange={(event) => handleLeadFieldChange('email', event.target.value)}
                  placeholder="e.g. office@company.ro"
                  type="email"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">City</p>
                <Input
                  value={newLead.city}
                  onChange={(event) => handleLeadFieldChange('city', event.target.value)}
                  placeholder="e.g. Brasov"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">County</p>
                <Input
                  value={newLead.county}
                  onChange={(event) => handleLeadFieldChange('county', event.target.value)}
                  placeholder="e.g. Brasov"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Website</p>
                <Input
                  value={newLead.website}
                  onChange={(event) => handleLeadFieldChange('website', event.target.value)}
                  placeholder="e.g. https://..."
                  type="url"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Business type</p>
                <Input
                  value={newLead.business_type}
                  onChange={(event) => handleLeadFieldChange('business_type', event.target.value)}
                  placeholder="e.g. Real estate"
                  className="h-11 rounded-[16px] border-[#d6e0ed] bg-white/92"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Notes</p>
                <Textarea
                  value={newLead.description}
                  onChange={(event) => handleLeadFieldChange('description', event.target.value)}
                  placeholder="Add context, notes, or what makes this lead interesting..."
                  className="min-h-[120px] rounded-[18px] border-[#d6e0ed] bg-white/92"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#d6e0ed] bg-white/90"
                onClick={() => {
                  setIsAddLeadOpen(false);
                  resetLeadForm();
                }}
                disabled={isSubmittingLead}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#152033] px-5 text-white shadow-[0_14px_30px_rgba(21,32,51,0.18)] hover:bg-[#101827]"
                onClick={handleAddLead}
                disabled={isSubmittingLead}
              >
                {isSubmittingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Save lead
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
