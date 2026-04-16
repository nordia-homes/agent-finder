'use server';

import { z } from 'zod';

const scrapeFormSchema = z.object({
  startUrl: z.string().url('Please enter a valid URL.'),
  source: z.string().min(1, 'Source is required.'),
  maxPages: z.number().min(1, 'Please specify at least 1 page.').optional(),
  maxListingsForImport: z.number().min(1, 'Please specify at least 1 listing.').optional(),
});
type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;

const SCRAPE_URL = 'https://playwright-scraper-507405936606.europe-west1.run.app/start-custom-scrape';

export async function startCustomScrapeJob(data: ScrapeFormValues) {
  try {
    const response = await fetch(SCRAPE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Scraping API returned an error: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in startCustomScrapeJob server action:", error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred during the scrape job request.' };
  }
}
