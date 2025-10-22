
'use server';

/**
 * @fileOverview DEPRECATED - This flow is no longer used. It has been replaced by `generate-npc-chatter.ts` for freeform dialogue
 * and `select-npc-response.ts` for scripted dialogue.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNpcResponseInputSchema = z.object({
  playerInput: z.string().describe('The player input/message to the NPC.'),
  npcName: z.string().describe('The name of the NPC.'),
  npcDescription: z.string().describe('The description of the NPC, including their personality and main message/clue.'),
  locationDescription: z.string().describe('The description of the current location.'),
  gameState: z.string().describe('The current game state, including relevant flags and items.'),
});
export type GenerateNpcResponseInput = z.infer<typeof GenerateNpcResponseInputSchema>;

const GenerateNpcResponseOutputSchema = z.object({
  npcResponse: z.string().describe('The AI-generated response from the NPC.'),
});
export type GenerateNpcResponseOutput = z.infer<typeof GenerateNpcResponseOutputSchema>;

export async function generateNpcResponse(input: GenerateNpcResponseInput): Promise<GenerateNpcResponseOutput> {
  return generateNpcResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNpcResponsePrompt',
  input: {schema: GenerateNpcResponseInputSchema},
  output: {schema: GenerateNpcResponseOutputSchema},
  prompt: `This prompt is deprecated.`,
});

const generateNpcResponseFlow = ai.defineFlow(
  {
    name: 'generateNpcResponseFlow',
    inputSchema: GenerateNpcResponseInputSchema,
    outputSchema: GenerateNpcResponseOutputSchema,
  },
  async input => {
    return {
      npcResponse: 'This AI flow is deprecated and should not be used.',
    };
  }
);
