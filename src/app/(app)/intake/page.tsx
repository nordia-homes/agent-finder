'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Upload } from "lucide-react";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, getDocs, serverTimestamp, writeBatch, doc, query, orderBy, limit } from 'firebase/firestore';
import type { Import, ScrapeJob } from '@/lib/types';
import { DataTable } from '@/components/intake/data-table';
import { columns } from '@/components/intake/columns';
import { IntakeDetailDrawer } from '@/components/intake/intake-detail-drawer';
import { StartScrapeDialog } from '@/components/intake/start-scrape-dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrapeJobStatus } from '@/components/intake/scrape-job-status';

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

export default function IntakePage() {
  const [selectedImport, setSelectedImport] = useState<Import | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const autoImportStartedRef = useRef(false);
  
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const scrapeJobsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'scrape_jobs'), orderBy('createdAt', 'desc'), limit(1));
  }, [firestore, user]);

  const importsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'imports'), orderBy('importedAt', 'desc'));
  }, [firestore, user]);

  const { data: scrapeJobs, loading: jobsLoading } = useCollection<ScrapeJob>(scrapeJobsQuery);
  const { data: imports, loading: importsLoading, error } = useCollection<Import>(importsQuery);

  const latestJob = useMemo(() => scrapeJobs?.[0], [scrapeJobs]);
  const autoImportCandidates = useMemo(
    () =>
      (imports ?? []).filter(
        (imp) => imp.review_status === 'pending_review' && Boolean(normalizePhone(imp.phone))
      ),
    [imports]
  );

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
        owner_id: user.uid,
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

  const bulkImportImportsWithPhone = async (importsToApprove: Import[]) => {
      if (!firestore || !user || importsToApprove.length === 0 || isBulkImporting) return;

      setIsBulkImporting(true);

      try {
        const existingLeadsSnapshot = await getDocs(collection(firestore, 'leads'));
        const existingPhones = new Set(
          existingLeadsSnapshot.docs
            .map((leadDoc) => normalizePhone(leadDoc.data().phone as string | undefined))
            .filter(Boolean)
        );

        const uniqueImports: Import[] = [];
        const skippedDuplicates: Import[] = [];
        const stagedPhones = new Set<string>();

        for (const imp of importsToApprove) {
          const normalizedPhone = normalizePhone(imp.phone);

          if (!normalizedPhone || existingPhones.has(normalizedPhone) || stagedPhones.has(normalizedPhone)) {
            skippedDuplicates.push(imp);
            continue;
          }

          uniqueImports.push(imp);
          stagedPhones.add(normalizedPhone);
        }

        for (let index = 0; index < uniqueImports.length; index += 200) {
          const batch = writeBatch(firestore);
          const chunk = uniqueImports.slice(index, index + 200);

          chunk.forEach((imp) => {
            const newLeadRef = doc(collection(firestore, 'leads'));
            batch.set(newLeadRef, {
              full_name: imp.full_name || '',
              first_name: imp.full_name?.split(' ').filter(Boolean)[0] || '',
              last_name: imp.full_name?.split(' ').slice(1).join(' ') || '',
              company_name: imp.company_name || '',
              business_type: '',
              city: imp.city || '',
              county: imp.county || '',
              phone: imp.phone || '',
              email: imp.email || '',
              website: imp.website || '',
              source: imp.source || '',
              source_url: imp.source_url || '',
              active_listings_count: imp.active_listings_count || 0,
              independent_score: imp.independent_score || 0,
              description: imp.description || '',
              classification: imp.classification || 'possible_independent',
              lead_status: 'new',
              outreach_status: 'not_started',
              created_at: serverTimestamp(),
              last_contact_at: null,
              owner_id: user.uid,
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
              hasIndependentPhrase: false,
              isPersonalNameDetected: Boolean(imp.full_name?.trim()),
              hasSoloBusinessIndicators: false,
              isSingleCityActivity: Boolean(imp.city?.trim() && !imp.county?.trim()),
              noLargeBrandDetected: imp.classification !== 'agency',
              hasSoloOperatorSignals: imp.classification !== 'agency',
              hasLargeAgencyBrand: imp.classification === 'agency',
              hasMultipleOfficeLocations: false,
              hasTeamWording: false,
              hasFranchiseOrCorporateWording: false,
            });

            const importRef = doc(firestore, 'imports', imp.id);
            batch.update(importRef, { review_status: 'approved' });
          });

          await batch.commit();
        }

        if (skippedDuplicates.length > 0) {
          for (let index = 0; index < skippedDuplicates.length; index += 400) {
            const batch = writeBatch(firestore);
            skippedDuplicates.slice(index, index + 400).forEach((imp) => {
              batch.update(doc(firestore, 'imports', imp.id), { review_status: 'duplicate' });
            });
            await batch.commit();
          }
        }

        toast({
          title: "Auto import completed",
          description:
            skippedDuplicates.length > 0
              ? `${uniqueImports.length} leads with phone numbers were added to Leads, and ${skippedDuplicates.length} duplicates were marked.`
              : `${uniqueImports.length} leads with phone numbers were added to Leads.`,
        });
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to auto-import leads with phone numbers.", variant: "destructive" });
      } finally {
        setIsBulkImporting(false);
      }
  };

  useEffect(() => {
    if (
      autoImportStartedRef.current ||
      !firestore ||
      !user ||
      userLoading ||
      importsLoading ||
      autoImportCandidates.length === 0
    ) {
      return;
    }

    autoImportStartedRef.current = true;
    void bulkImportImportsWithPhone(autoImportCandidates);
  }, [autoImportCandidates, firestore, importsLoading, user, userLoading]);


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Intake Queue" 
        description="Review scraped leads before approving them to CRM."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void bulkImportImportsWithPhone(autoImportCandidates)}
            disabled={isBulkImporting || autoImportCandidates.length === 0}
          >
            {isBulkImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import all with phone
          </Button>
          <StartScrapeDialog>
              <Button>
                  <Rocket className="mr-2 h-4 w-4" />
                  Start Custom Scrape
              </Button>
          </StartScrapeDialog>
        </div>
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
