'use client';
import { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles } from "lucide-react";
import { DataTable } from "@/components/leads/data-table";
import { columns } from "@/components/leads/columns";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Lead } from '@/lib/types';
import { normalizeLeadStatus } from '@/lib/lead-status';

export default function LeadsPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading, error } = useCollection<Lead>(leadsQuery);

  const activeLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => lead.lead_status !== 'merged');
  }, [leads]);

  const stats = useMemo(() => {
    const total = activeLeads.length;
    const contacted = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'contacted').length;
    const demos = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'demo_sent').length;
    const trialStarted = activeLeads.filter((lead) => normalizeLeadStatus(lead.lead_status) === 'trial_started').length;
    const likelyIndependent = activeLeads.filter((lead) => lead.classification === 'likely_independent').length;

    return { total, contacted, demos, trialStarted, likelyIndependent };
  }, [activeLeads]);

  const isLoading = userLoading || leadsLoading;

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
            <Button className="w-fit rounded-full bg-[#415782] px-5 text-white shadow-[0_14px_30px_rgba(47,66,104,0.22)] hover:bg-[#384d75]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active leads</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{isLoading ? '...' : stats.total}</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contacted</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{isLoading ? '...' : stats.contacted}</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Demo sent</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{isLoading ? '...' : stats.demos}</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Trial started</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{isLoading ? '...' : stats.trialStarted}</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Likely independent</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{isLoading ? '...' : stats.likelyIndependent}</p>
            </div>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={activeLeads || []} isLoading={isLoading} />
    </div>
  );
}
