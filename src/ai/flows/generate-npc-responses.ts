'use server';

/**
 * @fileOverview Generates NPC responses based on player input and game context.
 *
 * - generateNpcResponse - A function that generates NPC responses.
 * - GenerateNpcResponseInput - The input type for the generateNpcResponse function.
 * - GenerateNpcResponseOutput - The return type for the generateNpcResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNpcResponseInputSchema = z.object({
  playerInput: z.string().describe('The player input/message to the NPC.'),
  npcName: z.string().describe('The name of the NPC.'),
  npcDescription: z.string().describe('The description of the NPC, including their main message/clue.'),
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
  prompt: `You are the game master for a text-based RPG. A player is interacting with an NPC.

  NPC Name: {{npcName}}
  NPC Description: {{npcDescription}}
  Location Description: {{locationDescription}}
  Game State: {{gameState}}
  Player Input: {{playerInput}}

  As the game master, generate a response from the NPC that is in character, provides subtle clues or hints related to the NPC's main message, and guides the player towards solving the puzzle. Avoid revealing too much information directly.

  NPC Response:`,
});

const generateNpcResponseFlow = ai.defineFlow(
  {
    name: 'generateNpcResponseFlow',
    inputSchema: GenerateNpcResponseInputSchema,
    outputSchema: GenerateNpcResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      npcResponse: output?.npcResponse ?? 'The NPC remains silent.',
    };
  }
);
