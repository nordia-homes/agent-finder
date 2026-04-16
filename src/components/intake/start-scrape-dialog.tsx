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
import { startScrapeJob } from '@/app/(app)/intake/actions';


const scrapeFormSchema = z.object({
  city: z.string().min(1, 'City is required.'),
  source: z.string().min(1, 'Source is required.'),
});

type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;

export function StartScrapeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: {
      city: 'Cluj-Napoca',
      source: 'manual_test',
    },
  });

  const onSubmit = async (data: ScrapeFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await startScrapeJob(data);

      if (!result.success) {
        throw new Error(result.error);
      }
      
      const resultData = result.data as { jobId: string };

      toast({
        title: 'Scrape Job Started',
        description: `Successfully started scraping for ${data.city}. Job ID: ${resultData.jobId}`,
      });
      
      // We don't refresh data here as it can take time for imports to show up.
      // The user can manually refresh or we can implement polling later.
      
      setOpen(false);
      form.reset();

    } catch (error) {
      console.error("Error starting scrape job:", error);
      toast({ 
        title: "Scrape Job Failed", 
        description: "The scraping service encountered an error. This might be a temporary issue. Please try again later.", 
        variant: "destructive"
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Scrape Job</DialogTitle>
          <DialogDescription>
            Enter the details for the new scraping job. Click run when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cluj-Napoca" {...field} />
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
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., manual_test" {...field} />
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
