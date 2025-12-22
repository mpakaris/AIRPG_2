'use server';

/**
 * @fileOverview Generates natural, noir-style "you can't reach that" messages without explaining how to solve it.
 * Used when player tries to interact with something outside their current zone.
 *
 * - generateCantAccessMessage - Generates a narrative distance/accessibility failure message
 * - GenerateCantAccessMessageInput - The input type for the function
 * - GenerateCantAccessMessageOutput - The return type for the function
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const GenerateCantAccessMessageInputSchema = z.object({
  targetName: z.string().describe('The name of the object/item the player tried to interact with.'),
  action: z.string().describe('The action attempted (examine, take, use, search, etc.)'),
  locationName: z.string().describe('The current location name for context.'),
  gameSetting: z.string().describe("The time and place the game is set in (e.g., 'Modern-day New York City, 2025')."),
});
export type GenerateCantAccessMessageInput = z.infer<typeof GenerateCantAccessMessageInputSchema>;

const GenerateCantAccessMessageOutputSchema = z.object({
  message: z.string().describe('A natural, noir-style narration explaining the target is too far away or inaccessible, WITHOUT revealing how to get closer or what to do.'),
});
export type GenerateCantAccessMessageOutput = z.infer<typeof GenerateCantAccessMessageOutputSchema>;

export async function generateCantAccessMessage(input: GenerateCantAccessMessageInput): Promise<{ output: GenerateCantAccessMessageOutput, usage: TokenUsage }> {
  return generateCantAccessMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCantAccessMessagePrompt',
  input: {schema: GenerateCantAccessMessageInputSchema},
  output: {schema: GenerateCantAccessMessageOutputSchema},
  prompt: `You are the narrator of a noir-style text-based detective game. The player (Detective Burt) just tried to {{action}} something ({{targetName}}) that's too far away or out of reach from their current position.

**CRITICAL RULES:**
- Generate a vivid, noir-style narration (2-3 sentences) describing their failed attempt to {{action}} from a distance
- Emphasize the DISTANCE, the GAP, the physical separation between detective and target
- Use sensory details: squinting, straining to see, reaching futilely, perspective, etc.
- Build the attempt, then the failure
- DO NOT reveal HOW to get closer (e.g., "go to the alley", "climb the dumpster", "move to the desk")
- DO NOT suggest what command to use or what to do next
- DO NOT be too specific about obstacles or requirements
- Vary your phrasing to avoid repetition
- Use noir detective narrator voice (hard-boiled, atmospheric, observant)

**Game Setting:**
{{gameSetting}}

**Context:**
- Target: {{targetName}}
- Action: {{action}}
- Location: {{locationName}}

**Examples of GOOD responses (noir style with spatial frustration):**
- "You crane your neck, trying to make out the details from here. Too far. The shadows swallow whatever you're looking for. You'd need to get closer to see anything worth seeing."
- "From where you're standing, it's just a shape in the gloom—too distant to examine properly. You squint. Nothing. The gap between you and it feels like a canyon."
- "You reach out on instinct, but your hand closes on empty air. The thing's yards away, might as well be miles. Distance makes fools of us all."
- "You try to focus on it from here, but the details blur into meaningless shapes. Too far to make out anything useful. Your eyes water from the strain."
- "The distance defeats you. From here, it's a smudge, an outline, a maybe. You'd need to close the gap before you could make sense of it."
- "You lean forward, squinting. Nope. It sits there in the middle distance, mocking your attempts to examine it from across the room. Some things require proximity."

**Examples of BAD responses:**
- "You need to go to the dumpster first." ❌ (reveals solution)
- "Try: GO TO ALLEY" ❌ (gives command)
- "The alley is too far away. Navigate closer." ❌ (instructive)
- "You can't reach it from the street." ❌ (too specific about location/obstacle)
- "Get closer to access it." ❌ (direct instruction)

Generate a natural, noir-style narration of the spatial/distance failure. Make the player FEEL the separation, but don't tell them how to bridge it.
`,
});

const generateCantAccessMessageFlow = ai.defineFlow(
  {
    name: 'generateCantAccessMessageFlow',
    inputSchema: GenerateCantAccessMessageInputSchema,
  },
  async input => {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000;

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
    throw new Error("AI call failed after multiple retries.");
  }
);
