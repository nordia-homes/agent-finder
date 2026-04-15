'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aiLeadClassificationExplanation, AILeadClassificationExplanationInput } from '@/ai/flows/ai-lead-classification-explanation';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type ScoringExplanationProps = {
  lead: Lead;
};

export function ScoringExplanation({ lead }: ScoringExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setExplanation(null);
    try {
      const input: AILeadClassificationExplanationInput = {
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
      };
      const result = await aiLeadClassificationExplanation(input);
      setExplanation(result);
    } catch (error) {
      console.error('Failed to generate explanation:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate scoring explanation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="text-accent" />
          AI Scoring Analysis
        </CardTitle>
        <CardDescription>Get an AI-powered breakdown of the classification and score.</CardDescription>
      </CardHeader>
      <CardContent>
        {explanation && (
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            <p>{explanation}</p>
          </div>
        )}
        {!explanation && !isLoading && (
           <p className="text-sm text-muted-foreground">Click the button to generate an AI analysis of this lead's score.</p>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating explanation...</span>
          </div>
        )}
        <Button onClick={handleGenerate} disabled={isLoading} className="mt-4 w-full" variant="outline">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {explanation ? 'Regenerate Explanation' : 'Generate Explanation'}
        </Button>
      </CardContent>
    </Card>
  );
}
