
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
  gameDescription: z.string().describe("The overall description and premise of the game."),
  chapterTitle: z.string().describe("The title of the chapter the story is for."),
  messageLogs: z.array(MessageLogSchema).describe("An array of message logs from the player's playthrough of the chapter."),
});
export type GenerateStoryFromLogsInput = z.infer<typeof GenerateStoryFromLogsInputSchema>;

const GenerateStoryFromLogsOutputSchema = z.object({
  story: z.string().describe("The generated narrative story in prose, written in the style of a crime noir novel."),
});
export type GenerateStoryFromLogsOutput = z.infer<typeof GenerateStoryFromLogsOutputSchema>;

export async function generateStoryFromLogs(input: GenerateStoryFromLogsInput): Promise<{ output: GenerateStoryFromLogsOutput, usage: TokenUsage }> {
  return generateStoryFromLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryFromLogsPrompt',
  input: {schema: GenerateStoryFromLogsInputSchema},
  output: {schema: GenerateStoryFromLogsOutputSchema},
  prompt: `You are a master storyteller and a brilliant editor. Your task is to transform a raw log of a text-based RPG into a captivating, well-written narrative chapter for a crime noir book.

**Style Guide:**
- Write in the third person, past tense.
- Adopt a classic crime noir tone: gritty, descriptive, with a focus on atmosphere and internal thought. The main character is FBI agent Burt Macklin.
- Aim for a rich, descriptive style. Don't just state what happened; paint a picture. Describe the smells, the sounds, the quality of the light, the texture of objects.
- Expand on the events in the log. Weave them into a cohesive story. Describe the setting in detail, Macklin's observations, his internal monologue, and the flow of conversation.
- Smooth out the "game-like" elements. Instead of "Burt examined the notebook," write something like, "Macklin's eyes fell upon a worn leather notebook resting on the table. It seemed to pulse with forgotten secrets, its leather cover softened by decades of handling."
- Your job is to pick the important moments and dialogue that drive the plot forward and flesh them out. Omit repetitive actions or dead ends, but expand on the crucial scenes.
- Target a length of approximately 1000-1500 words to create a substantial and immersive chapter.
- Format the output as a single block of prose. Do not use markdown, titles, or headings within the story itself.

**Game Premise:**
{{gameDescription}}

**Chapter Title:**
{{chapterTitle}}

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
