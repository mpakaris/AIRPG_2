
'use server';
/**
 * @fileOverview An AI flow that generates a narrative story from game logs.
 *
 * - generateStoryFromLogs - A function that takes game context and message logs and returns a prose story.
 * - GenerateStoryFromLogsInput - The input type for the function.
 * - GenerateStoryFromLogsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const MessageLogSchema = z.object({
  senderName: z.string(),
  content: z.string(),
});

const GenerateStoryFromLogsInputSchema = z.object({
  storyStyleGuide: z.string().describe("The style guide and rules for the AI storyteller."),
  gameDescription: z.string().describe("The overall description and premise of the game."),
  chapterTitle: z.string().describe("The title of the chapter the story is for."),
  storyGenerationDetails: z.string().optional().describe("Specific guidelines or context for generating the story for this particular chapter."),
  messageLogs: z.array(MessageLogSchema).describe("An array of message logs from the player's playthrough of the chapter."),
});
export type GenerateStoryFromLogsInput = z.infer<typeof GenerateStoryFromLogsInputSchema>;

const GenerateStoryFromLogsOutputSchema = z.object({
  story: z.string().describe("The generated narrative story in prose, written according to the provided style guide."),
});
export type GenerateStoryFromLogsOutput = z.infer<typeof GenerateStoryFromLogsOutputSchema>;

export async function generateStoryFromLogs(input: GenerateStoryFromLogsInput): Promise<{ output: GenerateStoryFromLogsOutput, usage: TokenUsage }> {
  return generateStoryFromLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryFromLogsPrompt',
  input: {schema: GenerateStoryFromLogsInputSchema},
  output: {schema: GenerateStoryFromLogsOutputSchema},
  prompt: `
{{{storyStyleGuide}}}

**Game Premise:**
{{gameDescription}}

**Chapter Title:**
{{chapterTitle}}

{{#if storyGenerationDetails}}
**Chapter-Specific Context:**
{{storyGenerationDetails}}
{{/if}}

**Game Log (in order of events):**
{{#each messageLogs}}
- **{{senderName}}**: "{{content}}"
{{/each}}

Based on the premise and the provided log, write the story for the chapter "{{chapterTitle}}".
`,
});

const generateStoryFromLogsFlow = ai.defineFlow(
  {
    name: 'generateStoryFromLogsFlow',
    inputSchema: GenerateStoryFromLogsInputSchema,
  },
  async input => {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000;

    while (attempts < maxAttempts) {
      try {
        const { output, usage } = await prompt(input);
        if (!output) {
          throw new Error("AI output was null or undefined.");
        }
        return { 
          output, 
          usage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          }
        };
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("AI call failed after multiple retries:", error);
          throw new Error("The AI is currently unavailable to write the story. Please try again in a moment.");
        }
        console.log(`AI story generation failed, retrying in ${delay / 1000}s... (Attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("AI call failed after multiple retries.");
  }
);
