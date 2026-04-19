'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, Sparkles } from 'lucide-react';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { LeadSpotlightGrid } from '@/components/leads/lead-spotlight-grid';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Lead } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';

export default function ArchivedLeadsPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const archivedLeads = useMemo(() => {
    return (leads ?? [])
      .filter((lead) => Boolean(lead.archived_at) || normalizeLeadStatus(lead.lead_status) === 'merged')
      .sort((a, b) => {
        const aTime =
          a.archived_at && typeof a.archived_at.toDate === 'function'
            ? a.archived_at.toDate().getTime()
            : 0;
        const bTime =
          b.archived_at && typeof b.archived_at.toDate === 'function'
            ? b.archived_at.toDate().getTime()
            : 0;
        return bTime - aTime;
      });
  }, [leads]);

  const mergedCount = useMemo(
    () => archivedLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'merged').length,
    [archivedLeads]
  );
  const manualArchiveCount = Math.max(0, archivedLeads.length - mergedCount);

  const isLoading = userLoading || leadsLoading;

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Lead archive
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Archived Leads</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                  Review leads that were archived manually or removed from the active pipeline through merge flows.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-fit rounded-full border-[#d6e0ed] bg-white/90 px-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
              <Link href="/leads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leads
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-[26px] border border-[#dbe3ef] bg-[linear-gradient(135deg,_rgba(244,248,253,0.98),_rgba(232,240,251,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Archived leads</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : archivedLeads.length}</p>
              <p className="mt-2 text-sm text-slate-500">Total records kept outside the active pipeline.</p>
            </div>
            <div className="relative overflow-hidden rounded-[26px] border border-[#dce5ef] bg-[linear-gradient(135deg,_rgba(245,251,247,0.98),_rgba(233,246,238,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Manual archive</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : manualArchiveCount}</p>
              <p className="mt-2 text-sm text-slate-500">Leads intentionally hidden from the active workspace.</p>
            </div>
            <div className="relative overflow-hidden rounded-[26px] border border-[#e1e0ef] bg-[linear-gradient(135deg,_rgba(248,246,252,0.98),_rgba(238,235,248,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(33,51,84,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Merged archive</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-900">{isLoading ? '...' : mergedCount}</p>
              <p className="mt-2 text-sm text-slate-500">Leads archived because they were merged into another record.</p>
            </div>
          </div>
        </div>
      </div>

      {!isLoading && archivedLeads.length === 0 ? (
        <div className="rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] px-8 py-12 text-center shadow-[0_18px_48px_rgba(37,55,88,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb] text-[#5f7399]">
            <Archive className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">No archived leads yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667691]">
            Once you archive leads manually or merge duplicates, they will show up here for historical reference.
          </p>
        </div>
      ) : (
        <LeadSpotlightGrid leads={archivedLeads} isLoading={isLoading} />
      )}
    </div>
  );
}
