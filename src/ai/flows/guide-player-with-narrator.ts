
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
import { TokenUsage } from '@/lib/game/types';

const GuidePlayerWithNarratorInputSchema = z.object({
  promptContext: z.string().describe('The persona, rules, and examples for the AI narrator.'),
  gameState: z.string().describe('A detailed summary of the current state of the apgame, including chapter goal, player location, inventory, visible objects, and NPCs present.'),
  playerCommand: z.string().describe('The command or action the player wants to perform.'),
  availableCommands: z.string().describe('A list of available commands in the game. This might be a global list or a smaller, context-specific list for an interaction.'),
  visibleObjectNames: z.array(z.string()).describe('A list of the user-facing names of all objects currently visible to the player.'),
  visibleNpcNames: z.array(z.string()).describe('A list of the user-facing names of all NPCs currently visible to the player.'),
});
export type GuidePlayerWithNarratorInput = z.infer<typeof GuidePlayerWithNarratorInputSchema>;

const GuidePlayerWithNarratorOutputSchema = z.object({
  agentResponse: z.string().describe("The AI narrator's response to the player, guiding them and providing feedback."),
  commandToExecute: z.string().describe('The command that engine should execute based on the player input and game state.'),
});
export type GuidePlayerWithNarratorOutput = z.infer<typeof GuidePlayerWithNarratorOutputSchema>;

export async function guidePlayerWithNarrator(input: GuidePlayerWithNarratorInput): Promise<{ output: GuidePlayerWithNarratorOutput, usage: TokenUsage }> {
  return guidePlayerWithNarratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'guidePlayerWithNarratorPrompt',
  input: {schema: GuidePlayerWithNarratorInputSchema},
  output: {schema: GuidePlayerWithNarratorOutputSchema},
  prompt: `
{{promptContext}}

**Game & Player State:**
{{gameState}}

**Visible Object Names:**
{{#each visibleObjectNames}}
- "{{this}}"
{{/each}}

**Visible NPC Names:**
{{#each visibleNpcNames}}
- "{{this}}"
{{/each}}

**Player's Input:**
"{{playerCommand}}"

**Available Game Commands:**
{{availableCommands}}

Your entire output must be a single, valid JSON object matching the output schema.
`,
});

const guidePlayerWithNarratorFlow = ai.defineFlow(
  {
    name: 'guidePlayerWithNarratorFlow',
    inputSchema: GuidePlayerWithNarratorInputSchema,
    // The flow's output will be a composite object including the AI's structured output and usage stats.
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

    