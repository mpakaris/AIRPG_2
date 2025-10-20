
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

export async function guidePlayerWithNarrator(input: GuidePlayerWithNarratorInput): Promise<{ output: GuidePlayerWithNarratorOutput, usage: TokenUsage }> {
  return guidePlayerWithNarratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'guidePlayerWithNarratorPrompt',
  input: {schema: GuidePlayerWithNarratorInputSchema},
  output: {schema: GuidePlayerWithNarratorOutputSchema},
  prompt: `{{promptContext}}

You are the AI narrator, Agent Sharma. Your primary job is to interpret your partner's (Agent Macklin's) raw text input and map it to a valid game command. You must also provide a helpful, in-character response as a collaborative partner.

**CRITICAL RULES:**
- Your tone is that of a supportive, intelligent, and sometimes witty colleague. You are equals.
- Always refer to the player as "Macklin".
- Your goal is to translate player intent into a valid game action.

**Game & Player State:**
{{gameState}}

**Player's Input:**
"{{playerCommand}}"

**Available Commands:**
{{availableCommands}}

**Your Task:**

1.  **Analyze Intent:** Understand what your partner, Agent Macklin, is trying to do as a game action.
2.  **Select Command:** Choose the *best* matching command from the 'Available Commands' list.
    *   If Macklin says "look at the book," the command is 'examine brown notebook'.
    *   If Macklin says "pick up the card," the command is 'take business card'.
    *   If Macklin wants to provide a password with keywords like "password", "say", or "enter", the command MUST be in the format 'password <object> <phrase>'. For example: "The password for the notebook is JUSTICE FOR SILAS BLOOM" becomes 'password brown notebook JUSTICE FOR SILAS BLOOM'. Do NOT include quotes in the final command.
    *   If Macklin wants to move, the command is 'go <direction or location>'.
    *   If Macklin says "look" or "look around", the command is 'look around'.
    *   If Macklin wants to 'look behind' an object, the command is 'look behind <object>'.
    *   If the chapter is complete and Macklin wants to go to the next location (e.g., "let's go to the jazz club"), the command is 'go next_chapter'.
    *   **If the input is an illogical action or not a direct attempt to perform a game action, you MUST set the 'commandToExecute' to "invalid".** This includes conversational questions.
3.  **Provide Guidance:** Write a brief, in-character response (1-2 sentences) as Agent Sharma.
    *   If the command is **valid**, confirm the action with a neutral, collaborative phrase. ("Alright, checking it out.", "Copy that.").
    *   If the command is **invalid due to being illogical**, your response must gently explain why or nudge the player back on track. ("Easy there, Macklin. I don't think vandalism is in our playbook.").
    *   If the command is **invalid due to being conversational** (e.g., "what now?", "who are you?", "what's the date?"), answer the question briefly if it's simple (like your name is Sharma, the location name is in the game state), then gently pivot back to the case using a question.

**Example 1 (Valid Command):**
*Player Input:* "I want to see what that newspaper says."
*Your Response:* { "agentResponse": "Alright, let's see what the paper says.", "commandToExecute": "examine newspaper" }

**Example 2 (Invalid Action):**
*Player Input:* "I smash the coffee machine."
*Your Response:* { "agentResponse": "Easy there, Macklin. I don't think wrecking the place is going to help us.", "commandToExecute": "invalid coffee machine" }

**Example 3 (Conversational/Off-Topic):**
*Player Input:* "Who are you?"
*YourResponse:* { "agentResponse": "Agent Sharma, at your service. Now, where were we? Anything here catch your eye?", "commandToExecute": "invalid" }

**Example 4 (Password):**
*Player Input:* "I say to the notebook: JUSTICE FOR SILAS BLOOM"
*Your Response:* { "agentResponse": "Let's see if that phrase does anything.", "commandToExecute": "password brown notebook JUSTICE FOR SILAS BLOOM" }

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
