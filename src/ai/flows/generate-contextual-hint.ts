'use server';

/**
 * @fileOverview AI flow for generating contextual hints based on player's progress
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema
const GenerateContextualHintInputSchema = z.object({
  chapterGoal: z.string().describe('The overall goal of the chapter'),
  currentStepDescription: z.string().describe('Description of the current step the player should complete'),
  baseHint: z.string().describe('The base hint for this step from the happy path'),
  detailedHint: z.string().optional().describe('Optional detailed hint for this step'),
  playerQuestion: z.string().optional().describe('Optional specific question the player asked (e.g., "I don\'t know how to open the box")'),
  gameContext: z.string().describe('Current game state context (location, inventory, recent actions)'),
  completedSteps: z.array(z.string()).describe('List of steps the player has already completed'),
});

export type GenerateContextualHintInput = z.infer<typeof GenerateContextualHintInputSchema>;

// Define the output schema
const GenerateContextualHintOutputSchema = z.object({
  hint: z.string().describe('The contextual hint to show the player - should be helpful but not give away the entire solution'),
});

export type GenerateContextualHintOutput = z.infer<typeof GenerateContextualHintOutputSchema>;

// Define the exported function that calls the flow
export async function generateContextualHint(input: GenerateContextualHintInput): Promise<GenerateContextualHintOutput> {
  return generateContextualHintFlow(input);
}

// Define the prompt
const generateContextualHintPrompt = ai.definePrompt({
  name: 'generateContextualHintPrompt',
  input: { schema: GenerateContextualHintInputSchema },
  output: { schema: GenerateContextualHintOutputSchema },
  prompt: `You are a helpful game narrator providing hints to a player in a text-based adventure game.

**Chapter Goal:** {{chapterGoal}}

**Player's Current Objective:** {{currentStepDescription}}

**Base Hint:** {{baseHint}}
{{#if detailedHint}}**Detailed Hint:** {{detailedHint}}{{/if}}

**Player's Progress:**
{{#if completedSteps.length}}
Completed steps:
{{#each completedSteps}}
- {{this}}
{{/each}}
{{else}}
The player has just started this chapter.
{{/if}}

**Current Game Context:** {{gameContext}}

{{#if playerQuestion}}
**Player's Question:** "{{playerQuestion}}"
{{/if}}

**Your Task:**
Generate a helpful hint for the player that:
1. Guides them toward the NEXT step only (don't spoil future steps)
2. Is encouraging and maintains immersion
3. Gives direction without solving the puzzle completely
4. {{#if playerQuestion}}Addresses their specific question if they asked one{{else}}Provides a nudge in the right direction{{/if}}
5. References their current context (location, items they have, etc.)

**Hint Guidelines:**
- Start generic, become more specific only if the player seems truly stuck
- Use the base hint as your foundation
- If a detailed hint is provided, use it for players who ask specific questions
- Never explicitly tell them "press button" or "use item X on Y" - suggest exploration instead
- Keep the tone consistent with the game's narrator voice
- Keep the hint to 2-3 sentences maximum

Output your hint as valid JSON.
`,
});

// Define the Genkit flow
const generateContextualHintFlow = ai.defineFlow(
  {
    name: 'generateContextualHintFlow',
    inputSchema: GenerateContextualHintInputSchema,
    outputSchema: GenerateContextualHintOutputSchema,
  },
  async (input) => {
    const result = await generateContextualHintPrompt(input);
    return result.output;
  }
);
