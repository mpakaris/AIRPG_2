
'use server';

/**
 * @fileOverview Selects an appropriate NPC response from a predefined list based on player input.
 *
 * - selectNpcResponse - A function that selects an NPC response.
 * - SelectNpcResponseInput - The input type for the selectNpcResponse function.
 * - SelectNpcResponseOutput - The return type for the selectNpcResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CannedResponseSchema = z.object({
  topic: z.string().describe('The topic or category of this response (e.g., greeting, mystery, saxophonist, insult, default).'),
  response: z.string().describe('The pre-written response text for this topic.'),
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

export async function selectNpcResponse(input: SelectNpcResponseInput): Promise<SelectNpcResponseOutput> {
  return selectNpcResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'selectNpcResponsePrompt',
  input: {schema: SelectNpcResponseInputSchema},
  output: {schema: SelectNpcResponseOutputSchema},
  prompt: `You are a game master AI. Your job is to select the most appropriate response for an NPC based on the player's input.

You will be given the player's input and a list of available responses, each with a 'topic'. You must choose the topic that best fits the player's input.

Player Input: "{{playerInput}}"

Available Responses for {{npcName}}:
{{#each cannedResponses}}
- Topic: "{{topic}}", Response: "{{response}}"
{{/each}}

Analyze the player's input and select the single best response 'topic'.

- If the player is being insulting, rude, or inappropriate, choose the 'insult' topic.
- If the player is asking about the man who just left or a mystery, choose 'mystery'.
- If the player asks about music, a musician, or a saxophone, choose 'saxophonist'.
- If the player's input is vague or doesn't match any other topic, choose 'default'.
- If the player asks a question that leads to the main clue, choose 'clue'.
- If the player says hello or asks a simple question, choose 'greeting'.

You must only output the chosen topic.
`,
});

const selectNpcResponseFlow = ai.defineFlow(
  {
    name: 'selectNpcResponseFlow',
    inputSchema: SelectNpcResponseInputSchema,
    outputSchema: SelectNpcResponseOutputSchema,
  },
  async input => {
     let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        const {output} = await prompt(input);
        return output!;
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
