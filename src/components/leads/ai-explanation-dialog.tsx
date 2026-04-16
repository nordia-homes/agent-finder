'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, HelpCircle } from 'lucide-react';
import { aiLeadClassificationExplanation } from '@/ai/flows/ai-lead-classification-explanation';
import type { Lead } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface AIExplanationDialogProps {
  lead: Lead;
}

export function AIExplanationDialog({ lead }: AIExplanationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !explanation) {
      setIsLoading(true);
      try {
        const result = await aiLeadClassificationExplanation({
            fullName: lead.full_name,
            companyName: lead.company_name,
            businessType: lead.business_type,
            city: lead.city,
            county: lead.county,
            activeListingsCount: lead.active_listings_count,
            independentScore: lead.independent_score,
            classification: lead.classification,
            hasIndependentPhrase: lead.hasIndependentPhrase,
            isPersonalNameDetected: lead.isPersonalNameDetected,
            hasSoloBusinessIndicators: lead.hasSoloBusinessIndicators,
            isSingleCityActivity: lead.isSingleCityActivity,
            noLargeBrandDetected: lead.noLargeBrandDetected,
            hasSoloOperatorSignals: lead.hasSoloOperatorSignals,
            hasLargeAgencyBrand: lead.hasLargeAgencyBrand,
            hasMultipleOfficeLocations: lead.hasMultipleOfficeLocations,
            hasTeamWording: lead.hasTeamWording,
            hasFranchiseOrCorporateWording: lead.hasFranchiseOrCorporateWording,
        });
        setExplanation(result);
      } catch (error) {
        console.error("Failed to generate AI explanation:", error);
        setExplanation("Sorry, I couldn't generate an explanation at this time.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-auto p-1 text-white/70 hover:text-white hover:bg-white/10">
          <HelpCircle className="h-3 w-3" />
          Why?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Scoring Analysis
          </DialogTitle>
          <DialogDescription>
            This explanation is AI-generated and provides insights into the lead's score of {lead.independent_score}.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none py-4">
          {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <p>{explanation}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
