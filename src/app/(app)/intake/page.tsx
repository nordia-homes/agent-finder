'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, writeBatch, doc, query, orderBy, limit } from 'firebase/firestore';
import type { Import, ScrapeJob } from '@/lib/types';
import { DataTable } from '@/components/intake/data-table';
import { columns } from '@/components/intake/columns';
import { IntakeDetailDrawer } from '@/components/intake/intake-detail-drawer';
import { StartScrapeDialog } from '@/components/intake/start-scrape-dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrapeJobStatus } from '@/components/intake/scrape-job-status';

export default function IntakePage() {
  const [selectedImport, setSelectedImport] = useState<Import | null>(null);
  
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const scrapeJobsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'scrape_jobs'), orderBy('createdAt', 'desc'), limit(1));
  }, [firestore, user]);

  const importsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'imports');
  }, [firestore, user]);

  const { data: scrapeJobs, loading: jobsLoading } = useCollection<ScrapeJob>(scrapeJobsQuery);
  const { data: imports, loading: importsLoading, error } = useCollection<Import>(importsQuery);

  const latestJob = useMemo(() => scrapeJobs?.[0], [scrapeJobs]);

  const handleRowClick = (imp: Import) => {
    setSelectedImport(imp);
  };
  
  const handleDrawerClose = () => {
    setSelectedImport(null);
  }
  
  const handleUpdateStatus = async (importId: string, status: Import['review_status']) => {
      if (!firestore) return;
      const importRef = doc(firestore, 'imports', importId);
      try {
          await writeBatch(firestore).update(importRef, { review_status: status }).commit();
          toast({ title: "Success", description: `Import status updated to ${status}.` });
          handleDrawerClose();
      } catch (e) {
          console.error(e);
          toast({ title: "Error", description: "Failed to update import status.", variant: "destructive" });
      }
  };

  const handleApprove = async (imp: Import) => {
      if (!firestore || !user) return;
      
      const batch = writeBatch(firestore);

      // 1. Create new lead
      const newLeadRef = doc(collection(firestore, 'leads'));
      batch.set(newLeadRef, {
        full_name: imp.full_name || null,
        company_name: imp.company_name || null,
        city: imp.city || null,
        county: imp.county || null,
        phone: imp.phone || null,
        email: imp.email || null,
        website: imp.website || null,
        description: imp.description || null,
        source: imp.source || null,
        source_url: imp.source_url || null,
        active_listings_count: imp.active_listings_count || 0,
        independent_score: imp.independent_score || 0,
        classification: imp.classification || null,
        lead_status: 'new',
        outreach_status: 'not_started',
        created_at: serverTimestamp(),
        last_contact_at: null,
        owner_id: user.uid
      });

      // 2. Update import status
      const importRef = doc(firestore, 'imports', imp.id);
      batch.update(importRef, { review_status: 'approved' });

      try {
        await batch.commit();
        toast({ title: "Success", description: `${imp.company_name || imp.full_name} has been approved and added to leads.` });
        handleDrawerClose();
      } catch(e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to approve lead.", variant: "destructive" });
      }
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Intake Queue" 
        description="Review scraped leads before approving them to CRM."
      >
        <StartScrapeDialog>
            <Button>
                <Rocket className="mr-2 h-4 w-4" />
                Start Custom Scrape
            </Button>
        </StartScrapeDialog>
      </PageHeader>
      
      <ScrapeJobStatus job={latestJob} totalImports={imports?.length} isLoading={userLoading || jobsLoading} />
      
      <DataTable 
        columns={columns} 
        data={imports || []} 
        onRowClick={handleRowClick}
        isLoading={userLoading || importsLoading}
      />

      <IntakeDetailDrawer
        open={!!selectedImport}
        onOpenChange={(isOpen) => !isOpen && handleDrawerClose()}
        selectedImport={selectedImport}
        onApprove={handleApprove}
        onReject={(id) => handleUpdateStatus(id, 'rejected')}
        onMarkDuplicate={(id) => handleUpdateStatus(id, 'duplicate')}
      />
    </div>
  );
}
