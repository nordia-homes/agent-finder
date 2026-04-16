'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { startCustomScrapeJob } from '@/app/(app)/intake/actions';


const scrapeFormSchema = z.object({
  startUrl: z.string().url('Please enter a valid URL.'),
  source: z.string().min(1, 'Source is required.'),
  maxPages: z.coerce.number().positive().optional(),
  maxListingsForImport: z.coerce.number().positive().optional(),
});

type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;

export function StartScrapeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: {
      startUrl: 'https://www.imobiliare.ro/agentii/bucuresti',
      source: 'manual_custom',
    },
  });

  const onSubmit = async (data: ScrapeFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await startCustomScrapeJob(data);

      if (!result.success) {
        throw new Error(result.error);
      }
      
      const resultData = result.data as { jobId: string };

      toast({
        title: 'Custom Scrape Job Queued',
        description: `Successfully started custom scrape job with ID: ${resultData.jobId}`,
      });
      
      setOpen(false);
      form.reset();

    } catch (error) {
      console.error("Error starting custom scrape job:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ 
        title: "Scrape Job Failed", 
        description: `The scraping service encountered an error: ${errorMessage}`, 
        variant: "destructive"
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Custom Scrape</DialogTitle>
          <DialogDescription>
            Queue a new custom scraping job. The default Imobiliare scraping runs automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="startUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/agent-list" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., custom_source" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Pages</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} value={field.value ?? ''} onChange={event => field.onChange(+event.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="maxListingsForImport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Listings</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150" {...field} value={field.value ?? ''} onChange={event => field.onChange(+event.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Scrape
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
