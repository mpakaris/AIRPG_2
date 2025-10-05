
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
  gameState: z.string().describe('A detailed summary of the current state of the apgame, including chapter goal, player location, inventory, visible objects, and NPCs present.'),
  playerCommand: z.string().describe('The command or action the player wants to perform.'),
  availableCommands: z.string().describe('A list of available commands in the game. This might be a global list or a smaller, context-specific list for an interaction.'),
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
2.  **Select Command:** Choose the *best* matching command from the 'Available Commands' list.
    *   If the player says "look at the book," the command is 'examine brown notebook'.
    *   If the player says "pick up the card," the command is 'take business card'.
    *   If the player says "chat with the coffee guy," the command is 'talk to barista'.
    *   If the player wants to provide a password, the command is 'password <object> <phrase>'. For example: "password for notebook 'JUSTICE FOR SILAS BLOOM'".
    *   If the player wants to move, the command is 'go <direction or location>'.
    *   If the player just says "look" or "look around", the command is 'look around'.
    *   If the player wants to 'look behind' an object, the command is 'look behind <object>'.
    *   If the input is a conversational question (e.g., "are there clues here?", "what now?"), does not map to a clear action, or is an illogical/impossible action, you MUST set the 'commandToExecute' to "invalid".
3.  **Provide Guidance:** Write a brief, in-character response (1-2 sentences) that gives the player a gentle hint or confirms their action, guiding them toward the chapter goal. If the command is invalid, your response should explain why or gently nudge the player back on track (e.g., "I don't think breaking things will help us, Burt." or "I don't see any clues on the floor, Macklin. Let's focus on the objects in the room.").

**Example 1 (Valid Command):**
*Player Input:* "I want to see what that newspaper says."
*Your Response:* { "agentResponse": "Good idea, Burt. Sometimes the headlines hide the real story.", "commandToExecute": "examine newspaper" }

**Example 2 (Invalid Action):**
*Player Input:* "I smash the coffee machine."
*Your Response:* { "agentResponse": "Easy there, Macklin. Let's not cause a scene. Vandalism won't get us any closer to solving this case.", "commandToExecute": "invalid coffee machine" }

**Example 3 (Conversational Question):**
*Player Input:* "Do I see any clues here?"
*Your Response:* { "agentResponse": "I don't see anything obvious just lying around, Burt. We should probably examine the objects in the room more closely.", "commandToExecute": "invalid" }

**Example 4 (Password):**
*Player Input:* "password for the notebook is 'JUSTICE FOR SILAS BLOOM'"
*Your Response:* { "agentResponse": "Let's see if that works, Burt.", "commandToExecute": "password brown notebook JUSTICE FOR SILAS BLOOM" }


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
