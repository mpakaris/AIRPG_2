'use server';

/**
 * @fileOverview Local LLM version of player command interpreter
 * Uses Docker-hosted LLM for fast, cost-free command interpretation
 */

import { z } from 'zod';
import { callLocalLLM } from '@/ai/local-llm-client';

// Input schema (same as API version)
const InterpretPlayerCommandInputSchema = z.object({
  gameDescription: z.string().describe('A description of the game including story, goals, and rules.'),
  gameState: z.string().describe('The current state of the game, including player location, inventory, and flags.'),
  playerCommand: z.string().describe('The command entered by the player.'),
  availableCommands: z.array(z.string()).describe('A list of available game commands.'),
});
export type InterpretPlayerCommandInput = z.infer<typeof InterpretPlayerCommandInputSchema>;

// Output schema (same as API version)
const InterpretPlayerCommandOutputSchema = z.object({
  responseToPlayer: z.string().describe('A drafted response to the player.'),
  commandToExecute: z.string().describe('The command to execute based on the player input.'),
});
export type InterpretPlayerCommandOutput = z.infer<typeof InterpretPlayerCommandOutputSchema>;

/**
 * Build the system prompt for command interpretation
 */
function buildSystemPrompt(): string {
  return `You are a command interpreter for a text-based RPG game. Your ONLY purpose is to convert natural language player input into valid game commands.

**CRITICAL: YOU MUST RESPOND WITH ONLY JSON - NO OTHER TEXT!**

Output must be valid JSON with these exact fields:
- "responseToPlayer": string (brief message to player)
- "commandToExecute": string (the game command)

Example valid response:
{"responseToPlayer": "Looking at the door", "commandToExecute": "examine door"}

**COMMAND INTERPRETATION RULES:**

1. Multi-object commands are valid:
   - "read X with Y" → "read X with Y"
   - "use X on Y" → "use X on Y"
   - "open X with Y" → "open X with Y"

2. Check/Look commands:
   - "check X" → "examine X"
   - "look at X" → "examine X"

3. Take commands:
   - "grab X" → "take X"
   - "pick up X" → "take X"

4. If input is invalid/conversational:
   - Set commandToExecute to "invalid"
   - Provide helpful responseToPlayer

Remember: Output ONLY valid JSON, nothing else!`;
}

/**
 * Build the user prompt with game context
 */
function buildUserPrompt(input: InterpretPlayerCommandInput): string {
  const commandList = input.availableCommands.join(', ');

  return `Available command verbs: ${commandList}

Player input: "${input.playerCommand}"

Convert this to a game command. Respond with ONLY this JSON format (no other text):
{"responseToPlayer": "message", "commandToExecute": "command"}`;
}

/**
 * Interpret player command using local LLM
 */
export async function interpretPlayerCommandLocal(
  input: InterpretPlayerCommandInput
): Promise<InterpretPlayerCommandOutput> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  let attempts = 0;
  const maxAttempts = 3;
  const delay = 1000; // 1 second

  while (attempts < maxAttempts) {
    try {
      const result = await callLocalLLM(
        systemPrompt,
        userPrompt,
        InterpretPlayerCommandOutputSchema
      );
      return result;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error('Local LLM call failed after multiple retries:', error);
        throw new Error('The local AI is currently unavailable. Please check Docker container.');
      }
      console.log(`Local LLM call failed, retrying in ${delay / 1000}s... (Attempt ${attempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should be unreachable
  throw new Error('Local LLM call failed after multiple retries.');
}
