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
import { Sparkles, BrainCircuit, Users, Newspaper, Link as LinkIcon } from 'lucide-react';
import { aiLeadEnrichment, type AILeadEnrichmentOutput } from '@/ai/flows/ai-lead-enrichment';
import type { Lead } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import Link from 'next/link';

interface AIEnrichmentDialogProps {
  lead: Lead;
  children: React.ReactNode;
}

const LoadingState = () => (
    <div className="space-y-6">
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Rezumat</h4>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        </div>
         <Separator />
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Profile Social Media</h4>
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
         <Separator />
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Newspaper className="h-4 w-4" /> Știri Recente</h4>
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="text-center py-8">
        <p className="text-muted-foreground">Nu am putut găsi informații suplimentare pentru acest lead.</p>
    </div>
);

const DisplayData = ({ data }: { data: AILeadEnrichmentOutput }) => {
    const hasData = data.summary || data.socialMedia?.length > 0 || data.recentNews?.length > 0;
    
    if (!hasData) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-6">
            {data.summary && (
                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Rezumat</h4>
                    <p className="text-sm text-muted-foreground">{data.summary}</p>
                </div>
            )}
            {data.socialMedia?.length > 0 && (
                <>
                <Separator />
                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Profile Social Media</h4>
                    <ul className="space-y-2">
                        {data.socialMedia.map((profile) => (
                            <li key={profile.url} className="text-sm">
                                <a href={profile.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                   <LinkIcon className="h-4 w-4" /> <span>{profile.platform}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                </>
            )}
            {data.recentNews?.length > 0 && (
                <>
                <Separator />
                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Newspaper className="h-4 w-4" /> Știri Recente</h4>
                     <ul className="space-y-3">
                        {data.recentNews.map((news) => (
                            <li key={news.url} className="text-sm">
                                <a href={news.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{news.title}</a>
                                <p className="text-xs text-muted-foreground mt-1">{news.snippet}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                </>
            )}
        </div>
    )
};


export function AIEnrichmentDialog({ lead, children }: AIEnrichmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<AILeadEnrichmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !data) { // Only fetch if opening and no data yet
      setIsLoading(true);
      setError(null);
      try {
        const result = await aiLeadEnrichment({
            name: lead.full_name || lead.company_name,
        });
        setData(result);
      } catch (e) {
        console.error("Failed to generate AI enrichment:", e);
        setError("Serviciul de analiză AI nu a putut procesa cererea. Vă rugăm să încercați din nou mai târziu.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-accent" />
            Îmbogățire Date cu AI
          </DialogTitle>
          <DialogDescription>
            AI-ul analizează surse publice pentru a găsi informații suplimentare despre <strong>{lead.full_name || lead.company_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none py-4 max-h-[60vh] overflow-y-auto">
          {isLoading && <LoadingState />}
          {error && <p className="text-destructive">{error}</p>}
          {data && !isLoading && <DisplayData data={data} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
