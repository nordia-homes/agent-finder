'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Rocket, Users, FileClock, CheckCircle2, XCircle, Copy, Star } from "lucide-react";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import type { Import } from '@/lib/types';
import { DataTable } from '@/components/intake/data-table';
import { columns } from '@/components/intake/columns';
import { Card } from '@/components/ui/card';
import { IntakeDetailDrawer } from '@/components/intake/intake-detail-drawer';
import { StartScrapeDialog } from '@/components/intake/start-scrape-dialog';
import { useToast } from '@/hooks/use-toast';

const KpiCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) => (
    <Card className="p-4">
        <div className="flex items-center">
            <div className="p-2 bg-muted rounded-md mr-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                {isLoading ? <div className="h-6 w-10 bg-muted animate-pulse rounded-md" /> : <p className="text-2xl font-bold">{value}</p>}
            </div>
        </div>
    </Card>
)

export default function IntakePage() {
  const [selectedImport, setSelectedImport] = useState<Import | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const importsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'imports');
  }, [firestore]);

  const { data: imports, loading, error } = useCollection<Import>(importsQuery);

  const kpiData = useMemo(() => {
    const data = imports || [];
    return {
        total: data.length,
        pending: data.filter(i => i.review_status === 'pending_review').length,
        likelyIndependent: data.filter(i => i.classification === 'likely_independent').length,
        approved: data.filter(i => i.review_status === 'approved').length,
        rejected: data.filter(i => i.review_status === 'rejected').length,
        duplicate: data.filter(i => i.review_status === 'duplicate').length
    };
  }, [imports]);

  const handleRowClick = (imp: Import) => {
    setSelectedImport(imp);
    setIsDrawerOpen(true);
  };
  
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
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
                Start Scrape
            </Button>
        </StartScrapeDialog>
      </PageHeader>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Imports" value={kpiData.total} icon={Users} isLoading={loading} />
        <KpiCard title="Pending Review" value={kpiData.pending} icon={FileClock} isLoading={loading} />
        <KpiCard title="Likely Independent" value={kpiData.likelyIndependent} icon={Star} isLoading={loading} />
        <KpiCard title="Approved" value={kpiData.approved} icon={CheckCircle2} isLoading={loading} />
        <KpiCard title="Rejected" value={kpiData.rejected} icon={XCircle} isLoading={loading} />
        <KpiCard title="Duplicate" value={kpiData.duplicate} icon={Copy} isLoading={loading} />
      </div>

      <DataTable 
        columns={columns} 
        data={imports || []} 
        onRowClick={handleRowClick}
        isLoading={loading}
      />

      <IntakeDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        selectedImport={selectedImport}
        onApprove={handleApprove}
        onReject={(id) => handleUpdateStatus(id, 'rejected')}
        onMarkDuplicate={(id) => handleUpdateStatus(id, 'duplicate')}
      />
    </div>
  );
}
