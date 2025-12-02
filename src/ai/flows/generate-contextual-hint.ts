'use server';

/**
 * @fileOverview AI flow for generating contextual hints based on player's progress
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TokenUsage } from '@/lib/game/types';

// Define the input schema
const GenerateContextualHintInputSchema = z.object({
  chapterGoal: z.string().describe('The overall goal of the chapter'),
  currentStepDescription: z.string().describe('Description of the current step the player should complete'),
  baseHint: z.string().describe('The base hint for this step from the happy path'),
  detailedHint: z.string().optional().describe('Optional detailed hint for this step'),
  playerQuestion: z.string().optional().describe('Optional specific question the player asked (e.g., "I don\'t know how to open the box")'),
  gameContext: z.string().describe('Current game state context (location, inventory, recent actions)'),
  completedSteps: z.array(z.string()).describe('List of steps the player has already completed'),
  focusedEntityName: z.string().optional().describe('Name of the entity the player is currently focused on'),
  focusedEntityCapabilities: z.object({
    movable: z.boolean().optional(),
    openable: z.boolean().optional(),
    readable: z.boolean().optional(),
    breakable: z.boolean().optional(),
    takable: z.boolean().optional(),
    usable: z.boolean().optional(),
  }).optional().describe('Entity capabilities (what can be done with it)'),
  focusedEntityHandlers: z.array(z.string()).optional().describe('List of handler names the entity has (onMove, onRead, onExamine, etc.)'),
  mentionedEntityNames: z.array(z.string()).optional().describe('Names of entities mentioned in the player\'s question'),
});

export type GenerateContextualHintInput = z.infer<typeof GenerateContextualHintInputSchema>;

// Define the output schema
const GenerateContextualHintOutputSchema = z.object({
  hint: z.string().describe('The contextual hint to show the player - should be helpful but not give away the entire solution'),
});

export type GenerateContextualHintOutput = z.infer<typeof GenerateContextualHintOutputSchema>;

// Define the exported function that calls the flow
export async function generateContextualHint(input: GenerateContextualHintInput): Promise<{ output: GenerateContextualHintOutput, usage: TokenUsage }> {
  return generateContextualHintFlow(input);
}

// Define the prompt
const generateContextualHintPrompt = ai.definePrompt({
  name: 'generateContextualHintPrompt',
  input: { schema: GenerateContextualHintInputSchema },
  output: { schema: GenerateContextualHintOutputSchema },
  prompt: `You are a helpful game narrator providing hints to a player in a noir-style text-based detective game.

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

{{#if focusedEntityName}}
**Player's Current Focus:** {{focusedEntityName}}
{{/if}}

{{#if playerQuestion}}
**Player's Question:** "{{playerQuestion}}"
{{/if}}

{{#if mentionedEntityNames.length}}
**Entities Player Mentioned:** {{#each mentionedEntityNames}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if focusedEntityCapabilities}}
**Entity Capabilities (What This Entity Can Do):**
{{#if focusedEntityCapabilities.movable}}✓ Can be moved{{/if}}
{{#if focusedEntityCapabilities.openable}}✓ Can be opened{{/if}}
{{#if focusedEntityCapabilities.readable}}✓ Can be read{{/if}}
{{#if focusedEntityCapabilities.breakable}}✓ Can be broken{{/if}}
{{#if focusedEntityCapabilities.takable}}✓ Can be taken{{/if}}
{{#if focusedEntityCapabilities.usable}}✓ Can be used{{/if}}
{{/if}}

{{#if focusedEntityHandlers.length}}
**Entity Handlers (Actions Available):**
{{#each focusedEntityHandlers}}
- {{this}}
{{/each}}
{{/if}}

**CRITICAL PRIORITY RULES:**

1. **TIER 1 (HIGHEST PRIORITY) - Entity-Specific Atmospheric Hints:**
   - If player asked about a SPECIFIC entity OR is focused on one with capabilities/handlers:
     * Generate atmospheric, suggestive hints based on what the entity can do
     * Be noir-style, subtle, and preserve mystery
     * DON'T explicitly list actions - weave them into atmospheric descriptions
     * DON'T spoil what will happen - suggest possibilities

   **Atmospheric Hint Guidelines:**
   - **For movable objects**: "doesn't sit quite right", "could be shifted", "something off about its position", "not flush with the wall"
   - **For readable objects**: "text catches your eye", "worth reading more carefully", "handwriting looks deliberate", "details stand out"
   - **For breakable objects**: "looks fragile", "old mechanisms that might give", "wear and tear shows", "could come apart"
   - **For openable objects**: "seems like it could be accessed", "not quite closed", "latch looks workable", "might reveal something"
   - **Red herrings/flavor**: "Probably just scenery. Then again, in a case like this...", "Nothing special catches your eye"

2. **TIER 2 - General Progression:**
   - Only use if player asks general questions ("what now?", "where do I go?")
   - Use base/detailed hints for overall progress
   - Don't mention specific entities unless player is completely stuck

3. **Response Quality:**
   - 2-3 sentences, noir-style, atmospheric
   - Suggest without instructing
   - Maintain mystery and discovery
   - Vary phrasing naturally

**Examples:**

✅ GOOD (Entity-specific, atmospheric):
"The board doesn't sit flush with the wall. There's something deliberate about how it's angled. Worth taking a closer look, or checking what's written on it."

❌ BAD (Too explicit):
"You can move the chalkboard, read it, or examine it."

✅ GOOD (General progress):
"You haven't talked to everyone here yet. The staff might have seen something."

❌ BAD (Entity-specific when asking general question):
"Read the books on the shelf."

Output your hint as valid JSON.
`,
});

// Define the Genkit flow
const generateContextualHintFlow = ai.defineFlow(
  {
    name: 'generateContextualHintFlow',
    inputSchema: GenerateContextualHintInputSchema,
    // Flow returns both output and usage
  },
  async (input): Promise<{ output: GenerateContextualHintOutput, usage: TokenUsage }> => {
    const { output, usage } = await generateContextualHintPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate hint');
    }
    return {
      output,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
      }
    };
  }
);
