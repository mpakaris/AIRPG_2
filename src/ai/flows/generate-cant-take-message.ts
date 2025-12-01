'use server';

/**
 * @fileOverview Generates creative variations of "you can't take this" without explaining why.
 * This prevents repetitive messages while avoiding story spoilers.
 *
 * - generateCantTakeMessage - A function that generates a creative refusal message.
 * - GenerateCantTakeMessageInput - The input type for the function.
 * - GenerateCantTakeMessageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const GenerateCantTakeMessageInputSchema = z.object({
  itemName: z.string().describe('The name of the item the player tried to take.'),
  locationName: z.string().describe('The current location for context.'),
  gameSetting: z.string().describe("The time and place the game is set in (e.g., 'Modern-day New York City, 2025')."),
});
export type GenerateCantTakeMessageInput = z.infer<typeof GenerateCantTakeMessageInputSchema>;

const GenerateCantTakeMessageOutputSchema = z.object({
  message: z.string().describe('A creative, natural way to tell the player they cannot take this item. Must NOT explain why or reveal story details.'),
});
export type GenerateCantTakeMessageOutput = z.infer<typeof GenerateCantTakeMessageOutputSchema>;

export async function generateCantTakeMessage(input: GenerateCantTakeMessageInput): Promise<{ output: GenerateCantTakeMessageOutput, usage: TokenUsage }> {
  return generateCantTakeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCantTakeMessagePrompt',
  input: {schema: GenerateCantTakeMessageInputSchema},
  output: {schema: GenerateCantTakeMessageOutputSchema},
  prompt: `You are the narrator of a noir-style text-based detective game. The player (Detective Burt) just tried to take an item they cannot take.

**CRITICAL RULES:**
- Generate a vivid, noir-style narration (2-3 sentences) describing their physical attempt and failure
- Describe the effort: the grip, how it feels on their palms, the strain, the futility
- Build dramatic tension, then end with the failure
- DO NOT reveal the actual reason WHY (e.g., "it's bolted", "it's too heavy", "it's chained")
- DO NOT suggest alternatives or give hints
- Use gritty, physical, sensory details (touch, weight, resistance)
- Vary your phrasing to avoid repetition
- Use noir detective narrator voice (hard-boiled, atmospheric, slightly world-weary)

**Game Setting:**
{{gameSetting}}

**Context:**
- Item: {{itemName}}
- Location: {{locationName}}

**Examples of GOOD responses (noir style with physical struggle):**
- "You wrap both hands around it, fingers digging in. Brace your feet. Pull. The damn thing doesn't budge—might as well be welded to the floor. You let go, palms aching."
- "Your fingers grip the edge, knuckles white with effort. You heave—nothing. It stays rooted like it's part of the building itself. You straighten up, shoulders protesting."
- "You test its weight, get a solid grip, lift with your legs. It doesn't even shift. Whatever's keeping it there, it's not going anywhere. You back off, rubbing your hands together."
- "You grab hold, lean your weight into it. The thing feels like it's fused to reality itself. Your palms burn from the effort. Not happening."
- "You hook your fingers underneath, muscles tensing. Pull hard. Nothing. It sits there mocking you, immovable. You release it with a grunt."

**Examples of BAD responses:**
- "The counter is bolted to the floor." ❌ (reveals why)
- "It's too heavy to carry." ❌ (reveals why, not descriptive)
- "That stays where it is." ❌ (boring, no drama)
- "Try examining it instead." ❌ (suggests alternative)

Generate a creative, noir-style narration of the physical attempt and failure. Make it vivid and tactile.
`,
});

const generateCantTakeMessageFlow = ai.defineFlow(
  {
    name: 'generateCantTakeMessageFlow',
    inputSchema: GenerateCantTakeMessageInputSchema,
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
