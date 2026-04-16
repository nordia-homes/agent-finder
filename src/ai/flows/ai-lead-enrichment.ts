'use server';
/**
 * @fileOverview A Genkit flow that enriches lead data using AI.
 *
 * - aiLeadEnrichment - A function that fetches additional public information about a lead.
 * - AILeadEnrichmentInput - The input type for the aiLeadEnrichment function.
 * - AILeadEnrichmentOutput - The return type for the aiLeadEnrichment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AILeadEnrichmentInputSchema = z.object({
  name: z.string().describe('The full name of the person or company to research.'),
});
export type AILeadEnrichmentInput = z.infer<typeof AILeadEnrichmentInputSchema>;

const AILeadEnrichmentOutputSchema = z.object({
  summary: z.string().describe("A brief summary of the lead's professional activity, company, and role."),
  socialMedia: z
    .array(
      z.object({
        platform: z.string().describe('The social media platform (e.g., LinkedIn, Twitter, Facebook).'),
        url: z.string().url().describe('The URL to the social media profile.'),
      })
    )
    .describe('A list of social media profiles found for the lead.'),
  recentNews: z
    .array(
      z.object({
        title: z.string().describe('The title of the news article or mention.'),
        url: z.string().url().describe('The URL to the news source.'),
        snippet: z.string().describe('A brief snippet or summary of the news.'),
      })
    )
    .describe('A list of recent news articles or mentions related to the lead.'),
});
export type AILeadEnrichmentOutput = z.infer<typeof AILeadEnrichmentOutputSchema>;

const prompt = ai.definePrompt({
  name: 'aiLeadEnrichmentPrompt',
  input: { schema: AILeadEnrichmentInputSchema },
  output: { schema: AILeadEnrichmentOutputSchema },
  prompt: `You are a professional business intelligence analyst. Your task is to research a given lead (a person or a company) and enrich their profile with publicly available information.

Search the web for information about: {{{name}}}.

Compile a concise summary, find their social media profiles (prioritize LinkedIn), and list any recent news or relevant articles. Return the information in the specified JSON format. If you cannot find certain information, return an empty array for that field.

Lead Name: {{{name}}}
`,
});

export async function aiLeadEnrichment(input: AILeadEnrichmentInput): Promise<AILeadEnrichmentOutput> {
  return aiLeadEnrichmentFlow(input);
}

const aiLeadEnrichmentFlow = ai.defineFlow(
  {
    name: 'aiLeadEnrichmentFlow',
    inputSchema: AILeadEnrichmentInputSchema,
    outputSchema: AILeadEnrichmentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
