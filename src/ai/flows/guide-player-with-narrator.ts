'use server';
/**
 * @fileOverview An AI game master that guides the player through the game, providing direction and preventing illogical actions.
 *
 * - guidePlayerWithNarrator - A function that guides the player with a narrator.
 * - GuidePlayerWithNarratorInput - The input type for the guidePlayerWithNarrator function.
 * - GuidePlayerWithNarratorOutput - The return type for the guidePlayerWithNarrator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GuidePlayerWithNarratorInputSchema = z.object({
  gameSpecifications: z.string().describe('The overall specifications and rules of the game.'),
  gameState: z.string().describe('The current state of the game, including player location, inventory, and chapter flags.'),
  playerCommand: z.string().describe('The command or action the player wants to perform.'),
  availableCommands: z.string().describe('A list of available commands in the game.'),
});
export type GuidePlayerWithNarratorInput = z.infer<typeof GuidePlayerWithNarratorInputSchema>;

const GuidePlayerWithNarratorOutputSchema = z.object({
  narratorResponse: z.string().describe('The narrator response to the player, guiding them and providing feedback.'),
  revisedCommand: z.string().describe('The revised command after AI consideration.'),
  commandToExecute: z.string().describe('The command that engine should exectute based on the player input and game state.'),
});
export type GuidePlayerWithNarratorOutput = z.infer<typeof GuidePlayerWithNarratorOutputSchema>;

export async function guidePlayerWithNarrator(input: GuidePlayerWithNarratorInput): Promise<GuidePlayerWithNarratorOutput> {
  return guidePlayerWithNarratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'guidePlayerWithNarratorPrompt',
  input: {schema: GuidePlayerWithNarratorInputSchema},
  output: {schema: GuidePlayerWithNarratorOutputSchema},
  prompt: `You are the game master for a text-based RPG. Your role is to guide the player, provide feedback, and ensure they stay focused on solving the game's puzzles.

Here are the game specifications:
{{gameSpecifications}}

Here is the current game state:
{{gameState}}

The player's command is:
{{playerCommand}}

Available Commands:
{{availableCommands}}

Respond to the player with a helpful and engaging message. Ensure that the player command aligns with the game's rules and goals. If the command is illogical or against the rules, gently steer the player back to the main puzzle.

Your response should include:
1. A narrator response to the player, guiding them and providing feedback.
2. A potentially revised command based on AI considerations, to align more effectively with the game's goals.
3. The final command to execute.

Ensure the AI is not overly dramatic or poetic but straight to the point and focused on puzzle-solving.

Output:
Narrator Response: <narrator_response>
Revised Command: <revised_command>
Command to Execute: <command_to_execute>`,
});

const guidePlayerWithNarratorFlow = ai.defineFlow(
  {
    name: 'guidePlayerWithNarratorFlow',
    inputSchema: GuidePlayerWithNarratorInputSchema,
    outputSchema: GuidePlayerWithNarratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
