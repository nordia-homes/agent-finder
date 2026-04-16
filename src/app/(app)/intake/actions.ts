'use server';

import { z } from 'zod';

const scrapeFormSchema = z.object({
  city: z.string().min(1, 'City is required.'),
  source: z.string().min(1, 'Source is required.'),
});
type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;

const SCRAPE_URL = 'https://playwright-scraper-507405936606.europe-west1.run.app/scrape-agents';

export async function startScrapeJob(data: ScrapeFormValues) {
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
    console.error("Error in startScrapeJob server action:", error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred during the scrape job request.' };
  }
}
