
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
  gameState: z.string().describe('A detailed summary of the current state of the game, including chapter goal, player location, inventory, visible objects, and NPCs present.'),
  playerCommand: z.string().describe('The command or action the player wants to perform.'),
  availableCommands: z.string().describe('A list of available commands in the game.'),
});
export type GuidePlayerWithNarratorInput = z.infer<typeof GuidePlayerWithNarratorInputSchema>;

const GuidePlayerWithNarratorOutputSchema = z.object({
  agentResponse: z.string().describe("The AI narrator's response to the player, guiding them and providing feedback."),
  commandToExecute: z.string().describe('The command that engine should execute based on the player input and game state.'),
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

You are the AI narrator. Your primary job is to interpret the player's raw text input and map it to a valid, executable game command from the list provided. You must also provide a helpful, in-character response to guide the player.

**Game & Player State:**
{{gameState}}

**Player's Input:**
"{{playerCommand}}"

**Available Commands:**
{{availableCommands}}

**Your Task:**

1.  **Analyze Intent:** Understand what the player is trying to do.
2.  **Select Command:** Choose the *best* matching command from the \`Available Commands\` list.
    *   If the player says "look at the book," the command is \`examine brown notebook\`.
    *   If the player says "pick up the card," the command is \`take business card\`.
    *   If the player says "chat with the coffee guy," the command is \`talk to barista\`.
    *   If the player wants to provide a password, the command is \`password <object> <phrase>\`. For example: "password for notebook 'JUSTICE FOR SILAS BLOOM'".
    *   If the player wants to move, the command is \`go <direction or location>\`.
    *   If the input is conversational, observational ("what do i see?"), or doesn't map to a clear action, the command is \`look around\`.
    *   If the action is illogical, impossible, violent, or destructive (e.g., "smash the notebook," "fly to the moon," "attack the barista"), you MUST set the \`commandToExecute\` to "invalid".
3.  **Provide Guidance:** Write a brief, in-character response (1-2 sentences) that gives the player a gentle hint or confirms their action, guiding them toward the chapter goal.

**Example 1 (Valid Command):**
*Player Input:* "I want to see what that newspaper says."
*Your Response:* { "agentResponse": "Good idea, Burt. Sometimes the headlines hide the real story.", "commandToExecute": "examine newspaper" }

**Example 2 (Invalid Command):**
*Player Input:* "I smash the coffee machine."
*Your Response:* { "agentResponse": "Easy there, Macklin. Let's not cause a scene. Vandalism won't get us any closer to solving this case.", "commandToExecute": "invalid" }

Your entire output must be a single, valid JSON object matching the output schema.
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
