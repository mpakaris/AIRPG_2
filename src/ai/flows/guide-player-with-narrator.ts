
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
  visibleEntityDetails: z.string().optional().describe('Author notes for visible entities - provides guidance on puzzle mechanics, target redirects, and item relationships. Format: "EntityName (author notes)". Use these hints to make smarter interpretations when player targets indirect objects (e.g., "use pliers on hard hat" → check if hard hat has notes about zip-ties, interpret as "use pliers on zip-ties").'),
});
export type GuidePlayerWithNarratorInput = z.infer<typeof GuidePlayerWithNarratorInputSchema>;

const GuidePlayerWithNarratorOutputSchema = z.object({
  agentResponse: z.string().optional().nullable().describe("System response for command confirmation or error messages. Should be null for normal actions - the Narrator handles descriptive responses. Only provide messages for: (1) Invalid/extreme actions, (2) System errors, (3) Command confirmations when needed."),
  commandToExecute: z.string().describe('The command that engine should execute based on the player input and game state.'),
  reasoning: z.string().describe("A brief, step-by-step explanation of how you arrived at this command, starting from the player's input."),
});
export type GuidePlayerWithNarratorOutput = z.infer<typeof GuidePlayerWithNarratorOutputSchema>;

export async function guidePlayerWithNarrator(input: GuidePlayerWithNarratorInput): Promise<{ output: GuidePlayerWithNarratorOutput, usage: TokenUsage }> {
  return generatePlayerWithNarratorFlow(input);
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

{{#if visibleEntityDetails}}
**Entity Details & Author Guidance:**
{{visibleEntityDetails}}

**CRITICAL RULES FOR AUTHOR NOTES:**
1. **USE ONLY for redirects** - When player says "use X on Y", check if Y's notes suggest a different target
2. **NEVER block natural commands** - If player says "take hard hat", output "take hard hat" (let engine handle "secured" errors)
3. **NEVER substitute examine** - If player says "take X", don't interpret as "examine X" even if X is locked/secured
4. **Example redirect**: "use pliers on hard hat" + note says "secured with zip-ties" → "use pliers on zip-ties" ✅
5. **Example NO redirect**: "take hard hat" → "take hard hat" (not "examine hard hat") ✅
{{/if}}

**Player's Input:**
"{{playerCommand}}"

**Available Game Commands:**
{{availableCommands}}

**CRITICAL NAVIGATION RULES:**
When outputting "go" commands, ALWAYS use the exact NAME of the location/object from the visible lists above.
NEVER construct IDs like "loc_xxx" or "loc_side_alley".
Examples:
- Player: "go to side alley" → commandToExecute: "go side alley" ✅
- Player: "go to bus stop" → commandToExecute: "go bus stop" ✅
- WRONG: "go loc_side_alley" ❌
- WRONG: "go loc_bus_stop" ❌

Your entire output must be a single, valid JSON object matching the output schema.
`,
});

const generatePlayerWithNarratorFlow = ai.defineFlow(
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
