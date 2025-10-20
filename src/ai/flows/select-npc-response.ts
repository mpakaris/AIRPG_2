
'use server';

/**
 * @fileOverview Selects an appropriate NPC response from a predefined list based on player input.
 * This is used for "scripted" NPCs who are critical to the plot.
 *
 * - selectNpcResponse - A function that selects an NPC response.
 * - SelectNpcResponseInput - The input type for the selectNpcResponse function.
 * - SelectNpcResponseOutput - The return type for the selectNpcResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const CannedResponseSchema = z.object({
  topic: z.string().describe('The topic or category of this response (e.g., greeting, mystery, saxophonist, insult, default).'),
  response: z.string().describe('The pre-written response text for this topic.'),
  keywords: z.string().optional().describe('A comma-separated list of keywords that trigger this response.'),
});

const SelectNpcResponseInputSchema = z.object({
  playerInput: z.string().describe('The player input/message to the NPC.'),
  npcName: z.string().describe('The name of the NPC.'),
  cannedResponses: z.array(CannedResponseSchema).describe('A list of pre-written responses the NPC can give.'),
});
export type SelectNpcResponseInput = z.infer<typeof SelectNpcResponseInputSchema>;

const SelectNpcResponseOutputSchema = z.object({
  topic: z.string().describe('The topic of the selected response.'),
});
export type SelectNpcResponseOutput = z.infer<typeof SelectNpcResponseOutputSchema>;

export async function selectNpcResponse(input: SelectNpcResponseInput): Promise<{ output: SelectNpcResponseOutput, usage: TokenUsage }> {
  return selectNpcResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'selectNpcResponsePrompt',
  input: {schema: SelectNpcResponseInputSchema},
  output: {schema: SelectNpcResponseOutputSchema},
  prompt: `You are a game master AI. Your job is to select the most appropriate response for an NPC based on the player's input by matching their intent to a specific topic. This NPC has a scripted dialogue.

Player Input: "{{playerInput}}"

Available Responses for {{npcName}}:
{{#each cannedResponses}}
- Topic: "{{topic}}", Keywords for this topic: "{{keywords}}", NPC's Response: "{{response}}"
{{/each}}

Your Task:
1.  Analyze the player's input to understand their core question or statement (their "intent").
2.  Review the 'Keywords' for each 'Topic'. The keywords are clues to the topic's theme.
3.  Choose the 'Topic' whose 'Keywords' most closely match the player's intent. The match should be based on meaning, not just exact word matches.
4.  If the player's input seems insulting, rude, or inappropriate, always choose the 'insult' topic.
5.  If the player input is a simple greeting like "hello," "hi," "good morning," or asks "how are you," choose the 'greeting' topic.
6.  If no other topic is a good match for the player's intent, you MUST choose the 'default' topic. This is your fallback. Do not try to force a fit with an irrelevant topic.

Your entire output must be a single, valid JSON object containing only the chosen topic.
`,
});

const selectNpcResponseFlow = ai.defineFlow(
  {
    name: 'selectNpcResponseFlow',
    inputSchema: SelectNpcResponseInputSchema,
  },
  async input => {
     let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000; // 1 second

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
          throw new Error("The AI is currently unavailable. Please try again in a moment.");
        }
        console.log(`AI call failed, retrying in ${delay / 1000}s... (Attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
     // This part should be unreachable, but it satisfies TypeScript's need for a return path.
    throw new Error("AI call failed after multiple retries.");
  }
);
