'use client';
import { useMemo } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/leads/data-table";
import { columns } from "@/components/leads/columns";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Lead } from '@/lib/types';

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

  const isLoading = userLoading || leadsLoading;

  return (
    <div>
      <PageHeader title="Leads" description="Manage your approved real estate agent leads.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={activeLeads || []} isLoading={isLoading} />
    </div>
  );
}
