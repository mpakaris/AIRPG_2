
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
  promptContext: z.string().describe('The persona and instructions for the AI narrator.'),
  gameSpecifications: z.string().describe('The overall specifications and rules of the game.'),
  gameState: z.string().describe('A detailed summary of the current state of the game, including chapter goal, player location, inventory, visible objects and their states (e.g., locked/unlocked), and NPCs present.'),
  playerCommand: z.string().describe('The command or action the player wants to perform.'),
  availableCommands: z.string().describe('A list of available commands in the game.'),
});
export type GuidePlayerWithNarratorInput = z.infer<typeof GuidePlayerWithNarratorInputSchema>;

const GuidePlayerWithNarratorOutputSchema = z.object({
  agentResponse: z.string().describe("The AI narrator's response to the player, guiding them and providing feedback."),
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
  prompt: `{{promptContext}}

Here are the game specifications:
{{gameSpecifications}}

Here is the current game state:
{{gameState}}

The player's command is:
"{{playerCommand}}"

Available Commands:
{{availableCommands}}

As the AI narrator, respond to the player with a helpful message (1-2 sentences). Your primary job is to guide them toward the chapter goal.
- Analyze the game state and the player's command in relation to the goal.
- If the command is logical and moves the game forward, encourage it.
- If the command is illogical, unproductive, or based on incorrect information, gently steer them back on track. For example, if they try to use an item they don't have, or interact with something that isn't there.
- Use the detailed game state to provide specific, context-aware advice. For example, if an object is unlocked, encourage the player to examine it to find the next clue.

Based on the player's intent and the game state, determine the most logical command for the game engine to execute. It must be a valid command from the available list.
- If the player's command is illogical or cannot be mapped to a valid command, set the 'commandToExecute' to 'invalid'.
- If the player's intent is to interact with a person, the command should be 'talk to <npc name>'.
- If the player's intent is to 'look at', 'open', 'browse through', 'check', 'look inside', 'read article', 'watch video', or any other direct object interaction, the final command should be the most direct version (e.g., 'read article', 'watch video', 'examine <object>').
- If the player's command is observational (e.g. "check the room", "look for hints", "what do I see?"), the command should be 'look around'.
- If the player is just making conversation or the command is unclear, 'look around' is a safe default unless the action is clearly invalid.
- If the game state indicates the player is already interacting with an object, extract the most direct command from the player's input (e.g. if the player says "I want to watch the video", the commandToExecute should be "watch video").


Your response must include:
1.  A helpful, in-character response from you, the AI narrator.
2.  A potentially revised command to align more effectively with the game's goals.
3.  The final command to execute.

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
