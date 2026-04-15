'use server';
/**
 * @fileOverview A Genkit flow that generates an AI-powered explanation for a lead's independent classification and score.
 *
 * - aiLeadClassificationExplanation - A function that generates the explanation.
 * - AILeadClassificationExplanationInput - The input type for the aiLeadClassificationExplanation function.
 * - AILeadClassificationExplanationOutput - The return type for the aiLeadClassificationExplanation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AILeadClassificationExplanationInputSchema = z.object({
  fullName: z.string().describe('The full name of the lead.').nullable(),
  companyName: z.string().nullable().describe('The company name associated with the lead.').nullable(),
  businessType: z.string().nullable().describe('The business type of the lead.').nullable(),
  city: z.string().nullable().describe('The city where the lead operates.').nullable(),
  county: z.string().nullable().describe('The county where the lead operates.').nullable(),
  activeListingsCount: z.number().nullable().describe('The number of active listings the lead has.').nullable(),
  independentScore: z.number().describe('The independent score of the lead (0-100).'),
  classification: z.enum(['likely_independent', 'possible_independent', 'agency']).describe('The classification of the lead.'),
  hasIndependentPhrase: z.boolean().describe('True if the lead info contains phrases like "agent independent".'),
  isPersonalNameDetected: z.boolean().describe('True if a personal name is detected for the lead.'),
  hasSoloBusinessIndicators: z.boolean().describe('True if solo business indicators (e.g., PFA) are detected.'),
  isSingleCityActivity: z.boolean().describe('True if the lead operates only in a single city.'),
  noLargeBrandDetected: z.boolean().describe('True if no known large agency brand is detected.'),
  hasSoloOperatorSignals: z.boolean().describe('True if solo operator signals are detected.'),
  hasLargeAgencyBrand: z.boolean().describe('True if a known large agency brand is detected.'),
  hasMultipleOfficeLocations: z.boolean().describe('True if multiple office locations are detected for the lead.'),
  hasTeamWording: z.boolean().describe('True if team wording is detected in the lead info.'),
  hasFranchiseOrCorporateWording: z.boolean().describe('True if franchise or corporate wording is detected.')
});
export type AILeadClassificationExplanationInput = z.infer<typeof AILeadClassificationExplanationInputSchema>;

const AILeadClassificationExplanationOutputSchema = z.string().describe('A detailed explanation for the lead\'s independent classification and score.');
export type AILeadClassificationExplanationOutput = z.infer<typeof AILeadClassificationExplanationOutputSchema>;

const prompt = ai.definePrompt({
  name: 'aiLeadClassificationExplanationPrompt',
  input: { schema: AILeadClassificationExplanationInputSchema },
  output: { schema: AILeadClassificationExplanationOutputSchema },
  prompt: `You are an AI assistant specialized in analyzing real estate agent leads to determine their independence.
Given the following lead's data, provide a concise explanation for its independent classification ({{{classification}}}) and score ({{{independentScore}}}/100).
Highlight key positive and negative indicators that contributed to this assessment.

Lead Data:
- Independent Score: {{{independentScore}}}/100
- Classification: {{{classification}}}
{{#if fullName}}- Full Name: {{{fullName}}}{{/if}}
{{#if companyName}}- Company Name: {{{companyName}}}{{/if}}
{{#if businessType}}- Business Type: {{{businessType}}}{{/if}}
{{#if city}}- City: {{{city}}}{{/if}}
{{#if county}}- County: {{{county}}}{{/if}}
{{#if activeListingsCount}}- Active Listings Count: {{{activeListingsCount}}}{{/if}}

Indicators:
- Contains "agent independent" phrase: {{#if hasIndependentPhrase}}Yes{{else}}No{{/if}}
- Personal name detected: {{#if isPersonalNameDetected}}Yes{{else}}No{{/if}}
- Solo business indicators (e.g., PFA): {{#if hasSoloBusinessIndicators}}Yes{{else}}No{{/if}}
- Single-city activity: {{#if isSingleCityActivity}}Yes{{else}}No{{/if}}
- No large brand detected: {{#if noLargeBrandDetected}}Yes{{else}}No{{/if}}
- Solo operator signals: {{#if hasSoloOperatorSignals}}Yes{{else}}No{{/if}}
- Large agency brand detected: {{#if hasLargeAgencyBrand}}Yes{{else}}No{{/if}}
- Multiple office locations: {{#if hasMultipleOfficeLocations}}Yes{{else}}No{{/if}}
- Team wording detected: {{#if hasTeamWording}}Yes{{else}}No{{/if}}
- Franchise/corporate wording detected: {{#if hasFranchiseOrCorporateWording}}Yes{{else}}No{{/if}}

Provide your explanation in a clear, easy-to-read paragraph format.
Start with a summary of the classification and score, then elaborate on the positive and negative factors.`
});

export async function aiLeadClassificationExplanation(input: AILeadClassificationExplanationInput): Promise<AILeadClassificationExplanationOutput> {
  return aiLeadClassificationExplanationFlow(input);
}

const aiLeadClassificationExplanationFlow = ai.defineFlow(
  {
    name: 'aiLeadClassificationExplanationFlow',
    inputSchema: AILeadClassificationExplanationInputSchema,
    outputSchema: AILeadClassificationExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
