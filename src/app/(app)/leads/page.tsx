'use client';
import { useMemo } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/leads/data-table";
import { columns } from "@/components/leads/columns";
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Lead } from '@/lib/types';

export default function LeadsPage() {
  const firestore = useFirestore();

  const leadsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'leads');
  }, [firestore]);

  const { data: leads, loading, error } = useCollection<Lead>(leadsQuery);

  return (
    <div>
      <PageHeader title="Leads" description="Manage your approved real estate agent leads.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={leads || []} />
    </div>
  );
}
