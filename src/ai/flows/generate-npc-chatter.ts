
'use server';

/**
 * @fileOverview Generates freeform, in-character dialogue for non-plot-critical NPCs.
 * This flow is for "flavor" characters who should feel alive but have no case-relevant info.
 *
 * - generateNpcChatter - A function that generates an improvised response.
 * - GenerateNpcChatterInput - The input type for the function.
 * - GenerateNpcChatterOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const GenerateNpcChatterInputSchema = z.object({
  playerInput: z.string().describe('The player input/message to the NPC.'),
  npcName: z.string().describe('The name of the NPC.'),
  npcPersona: z.string().describe('A detailed description of the NPC, including their personality, job, mood, and any quirks. This defines how they should talk.'),
  locationDescription: z.string().describe('The description of the current location to provide context.'),
});
export type GenerateNpcChatterInput = z.infer<typeof GenerateNpcChatterInputSchema>;

const GenerateNpcChatterOutputSchema = z.object({
  npcResponse: z.string().describe("The AI-generated, in-character, improvised response from the NPC. This response must not contain any game clues or plot-relevant information."),
});
export type GenerateNpcChatterOutput = z.infer<typeof GenerateNpcChatterOutputSchema>;

export async function generateNpcChatter(input: GenerateNpcChatterInput): Promise<{ output: GenerateNpcChatterOutput, usage: TokenUsage }> {
  return generateNpcChatterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNpcChatterPrompt',
  input: {schema: GenerateNpcChatterInputSchema},
  output: {schema: GenerateNpcChatterOutputSchema},
  prompt: `You are a world-class character actor in a text-based RPG. Your job is to improvise a short, believable line of dialogue for a background character.

**CRITICAL RULES:**
- **DO NOT** provide any clues, hints, or information related to any mystery, case, or main plot.
- **DO NOT** suggest actions, quests, or objectives.
- Your ONLY job is to engage in brief, in-character small talk.
- Keep your response to 1-2 sentences.
- Base your response *entirely* on the provided persona.

**Character Brief:**
- Name: {{npcName}}
- Persona: {{npcPersona}}
- Current Location: {{locationDescription}}

**Player says to your character:**
"{{playerInput}}"

Now, as {{npcName}}, give a short, improvised response based on your persona.
`,
});

const generateNpcChatterFlow = ai.defineFlow(
  {
    name: 'generateNpcChatterFlow',
    inputSchema: GenerateNpcChatterInputSchema,
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
