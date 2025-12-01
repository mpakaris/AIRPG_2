'use server';

/**
 * @fileOverview Contextual NPC Conversation Flow
 *
 * Handles Type 1 (critical) NPC conversations with:
 * - Full conversation context via self-summarization
 * - Semantic reveal conditions for secrets
 * - Natural, non-repetitive dialogue
 *
 * The LLM returns TWO outputs:
 * 1. npcResponse - What the NPC says to the player
 * 2. conversationSummary - Ultra-compact summary for next turn (saves tokens)
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { TokenUsage } from '@/lib/game/types';

const RevealConditionSchema = z.object({
  type: z.enum(['TOPIC_MENTIONS', 'KEYWORDS', 'FLAG_SET']).describe('Type of condition to check'),
  topic: z.string().optional().describe('Topic that must be mentioned (for TOPIC_MENTIONS)'),
  minCount: z.number().optional().describe('Minimum mentions required (for TOPIC_MENTIONS)'),
  keywords: z.array(z.string()).optional().describe('Keywords to detect (for KEYWORDS)'),
  flag: z.string().optional().describe('Flag that must be set (for FLAG_SET)')
});

const ContextualNpcConversationInputSchema = z.object({
  playerInput: z.string().describe('The player\'s current question or statement'),
  npcName: z.string().describe('The name of the NPC'),
  npcPersona: z.string().describe('Personality and background of the NPC'),

  generalKnowledge: z.array(z.string()).describe('General facts the NPC knows and can share freely'),
  topicKnowledge: z.array(z.string()).describe('Specific knowledge about the topic/secret the NPC has'),

  secretInfo: z.string().describe('The critical information this NPC will eventually reveal'),
  revealConditionsMet: z.boolean().describe('Whether the conditions to reveal the secret have been met'),

  conversationSummary: z.string().optional().describe('Compact summary of previous conversation (empty string if first interaction)'),
  interactionCount: z.number().describe('Number of times player has talked to this NPC'),
  maxInteractions: z.number().describe('Maximum allowed interactions'),

  isCompleted: z.boolean().describe('Whether this NPC has already revealed their secret'),
  completedPersonality: z.string().optional().describe('How NPC behaves after completing their mission')
});

export type ContextualNpcConversationInput = z.infer<typeof ContextualNpcConversationInputSchema>;

const ContextualNpcConversationOutputSchema = z.object({
  npcResponse: z.string().describe('The NPC\'s natural response to the player'),
  conversationSummary: z.string().describe('Ultra-compact summary of conversation so far (no filler words, only key facts). Max 200 characters. Example: "Player asked about Silas 2x. Shared: regular, musician, quiet. Not revealed: business card."'),
  shouldReveal: z.boolean().describe('Whether the NPC revealed the secret in this response'),
  isInsult: z.boolean().describe('Whether the player input was insulting, rude, or disrespectful')
});

export type ContextualNpcConversationOutput = z.infer<typeof ContextualNpcConversationOutputSchema>;

export async function contextualNpcConversation(
  input: ContextualNpcConversationInput
): Promise<{ output: ContextualNpcConversationOutput; usage: TokenUsage }> {
  return contextualNpcConversationFlow(input);
}

const contextualNpcConversationPrompt = ai.definePrompt({
  name: 'contextualNpcConversationPrompt',
  input: { schema: ContextualNpcConversationInputSchema },
  output: { schema: ContextualNpcConversationOutputSchema },
  prompt: `You are {{npcName}}. {{npcPersona}}

=== YOUR KNOWLEDGE (can share freely) ===
{{#each generalKnowledge}}
- {{this}}
{{/each}}

{{#if topicKnowledge}}
Specific knowledge about the relevant topic:
{{#each topicKnowledge}}
- {{this}}
{{/each}}
{{/if}}

{{#if isCompleted}}
=== CONVERSATION COMPLETE ===
You already revealed your secret information. Your attitude now: {{completedPersonality}}
Keep responses brief and redirect player to move on.
{{else}}
=== SECRET INFORMATION ===
Critical info you possess: {{secretInfo}}

{{#if revealConditionsMet}}
✅ CONDITIONS MET - Reveal the secret naturally in this response!
Weave it into your answer organically. Don't be abrupt.
Example: "You know, since you're asking... [reveal secret naturally]"
{{else}}
❌ CONDITIONS NOT MET - Keep the secret hidden for now.
Answer helpfully with general knowledge, but don't mention the secret yet.
Build interest, share related details, but hold back the critical piece.
{{/if}}
{{/if}}

=== CONVERSATION SO FAR ===
{{#if conversationSummary}}
Previous summary: {{conversationSummary}}
{{else}}
[First interaction - no previous context]
{{/if}}

Interaction count: {{interactionCount}}/{{maxInteractions}}

=== CURRENT PLAYER INPUT ===
"{{playerInput}}"

=== CRITICAL RULES ===

1. LENGTH: Keep responses SHORT - 1 sentence max, 2 if absolutely necessary
2. NO REPETITION: Read the summary! Don't say things you already shared
3. VARY OPENINGS: Don't always start with "Silas? Yeah..." Mix it up!

Examples of GOOD varied openings:
- "Not really."
- "Haven't seen him leave any."
- "He keeps to himself."
- "Can't say I have."
- "Nah, man."
- "Let me think..."
- "Actually..."
- "You know what?"

4. BUILD ON PREVIOUS: Each response adds ONE new detail, not everything again
   - If you said "musician on 5th Street", DON'T say it again
   - Add something new: "Usually afternoons" or "Keeps to himself" or "Pays cash"

5. REVEAL NATURALLY: When conditions met, hint at business card helping with box:
   - If asked about box/opening: "I don't know, but maybe that business card he left can help you. It's on the counter."
   - If asked about contact: "Actually, he left a card here the other day. On the counter."
   - Keep it subtle - don't explain, just suggest
   - NOT: "Silas? Yeah, he's a regular. Plays sax. He left a business card..."

=== YOUR TASK ===

FIRST: Check if player input is insulting, rude, or disrespectful
- Profanity, personal attacks, condescending language
- If YES: Set isInsult=true, respond with brief shutdown: "Hey, not in this tone! Come back when you find your manners."
- If NO: Continue normal conversation

IF NOT AN INSULT:
1. Check summary - what have you ALREADY said?
2. Respond with ONE new piece of info (short!)
3. Vary your opening phrase
4. If reveal time, mention card briefly
5. Stay in character

Return FOUR things:
1. npcResponse: ONE sentence (two MAX). Natural, varied opening. NO REPETITION.
2. conversationSummary: Ultra-compact (max 150 chars)
   - Format: "Asked X 3x. Shared: A,B,C. Hidden: D"
   - NO articles/filler
3. shouldReveal: true if mentioned business card, false otherwise
4. isInsult: true if player was rude/insulting, false otherwise
`
});

const contextualNpcConversationFlow = ai.defineFlow(
  {
    name: 'contextualNpcConversationFlow',
    inputSchema: ContextualNpcConversationInputSchema
    // Note: No outputSchema here - the prompt handles output validation
    // Flow returns {output, usage} which doesn't match ContextualNpcConversationOutputSchema
  },
  async (input) => {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 1000;

    while (attempts < maxAttempts) {
      try {
        const { output, usage } = await contextualNpcConversationPrompt(input);
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
          console.error("Contextual NPC conversation AI call failed after multiple retries:", error);
          throw new Error("The AI is currently unavailable. Please try again in a moment.");
        }
        console.log(`AI call failed, retrying in ${delay / 1000}s... (Attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error("AI call failed after multiple retries.");
  }
);
