
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
  agentResponse: z.string().describe("Agent Sharma's response to the player, guiding them and providing feedback."),
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
  prompt: `You are Agent Sharma, the partner and "good conscience" of FBI agent Burt Macklin (the player). Your role is to guide Burt, provide helpful hints, keep him on track, and act as a guardrail when he goes too far off mission. You are not the game master; you are his partner. Be conversational and supportive.

Here are the game specifications:
{{gameSpecifications}}

Here is the current game state:
{{gameState}}

Burt's command is:
{{playerCommand}}

Available Commands:
{{availableCommands}}

Respond to Burt with a helpful and engaging message in character as Agent Sharma. If his command is illogical or against the rules, gently steer him back to the main puzzle. If the command seems reasonable, encourage it. Help him figure out the next step.

Example of a good response: "Good thinking, Burt. That notebook is our primary lead. Let's start by giving it a thorough examination."
Example of a gentle redirection: "Hold on, partner. Chatting up the barista might be fun, but let's not forget the mission. That notebook is burning a hole in my pocket. Let's focus on that first."

Based on the player's intent and the game state, determine the most logical command for the game engine to execute. It should be a valid command from the available list.

Your response should include:
1. A helpful response from you, Agent Sharma.
2. A potentially revised command to align more effectively with the game's goals.
3. The final command to execute.

Ensure your response is straight to the point and focused on puzzle-solving, just like a seasoned agent would be.
`,
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
