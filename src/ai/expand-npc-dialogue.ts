'use server';

/**
 * @fileOverview NPC Dialogue Expansion System
 *
 * Expands NPC dialogue keywords into varied responses using local LLM.
 * Enables unlimited NPC conversations at zero cost.
 *
 * Benefits:
 * - Zero cost: Unlimited dialogue with local LLM
 * - Character consistency: Each NPC has a personality profile
 * - Natural variation: Same topic produces different responses
 * - Context-aware: Considers game state and conversation history
 *
 * Usage:
 *   const dialogue = await expandNPCDialogue({
 *     npcName: 'Frank the Bartender',
 *     npcPersonality: 'Gruff, seen-it-all bartender with a soft spot',
 *     keyword: 'greeting_late_night',
 *     context: { playerName: 'Detective', timeOfDay: 'late night' }
 *   });
 */

import { callLocalLLM, checkLocalLLMHealth } from '@/ai/local-llm-client';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

const NPCDialogueResponseSchema = z.object({
  dialogue: z.string().describe('The NPC\'s spoken dialogue in character'),
  emotion: z.enum(['neutral', 'friendly', 'hostile', 'scared', 'sad', 'angry', 'happy', 'confused']).optional().describe('The NPC\'s emotional state')
});

export interface ExpandNPCDialogueOptions {
  npcName: string;                    // e.g., "Frank the Bartender"
  npcPersonality: string;             // e.g., "Gruff, world-weary, but secretly kind"
  keyword: string;                    // e.g., "greeting_player", "topic_murder"
  context?: Record<string, string>;   // e.g., { playerName: "Detective", location: "bar" }
  conversationHistory?: string[];     // Recent dialogue for context
  mood?: string;                      // Override NPC's current mood
  maxLength?: number;                 // Max dialogue length
  useCache?: boolean;                 // Use caching (default: false for NPCs - want variety)
}

export interface NPCDialogueResult {
  dialogue: string;
  emotion?: string;
}

// ============================================================================
// Session Cache (lighter for NPCs - we want more variation)
// ============================================================================

interface NPCCacheEntry {
  dialogue: string;
  emotion?: string;
  timestamp: number;
}

const npcDialogueCache = new Map<string, NPCCacheEntry>();
const NPC_CACHE_TTL = 10000; // 10 seconds - very short to encourage variety

function getNPCCacheKey(options: ExpandNPCDialogueOptions): string {
  const contextStr = JSON.stringify(options.context || {});
  return `${options.npcName}:${options.keyword}:${contextStr}`;
}

function getCachedNPCDialogue(options: ExpandNPCDialogueOptions): NPCDialogueResult | null {
  if (options.useCache === false) return null;

  const key = getNPCCacheKey(options);
  const entry = npcDialogueCache.get(key);

  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > NPC_CACHE_TTL) {
    npcDialogueCache.delete(key);
    return null;
  }

  return {
    dialogue: entry.dialogue,
    emotion: entry.emotion
  };
}

function setCachedNPCDialogue(options: ExpandNPCDialogueOptions, result: NPCDialogueResult): void {
  if (options.useCache === false) return;

  const key = getNPCCacheKey(options);
  npcDialogueCache.set(key, {
    dialogue: result.dialogue,
    emotion: result.emotion,
    timestamp: Date.now()
  });

  // Cleanup
  if (npcDialogueCache.size > 50) {
    cleanupNPCCache();
  }
}

function cleanupNPCCache(): void {
  const now = Date.now();
  for (const [key, entry] of npcDialogueCache.entries()) {
    if (now - entry.timestamp > NPC_CACHE_TTL) {
      npcDialogueCache.delete(key);
    }
  }
}

// ============================================================================
// NPC Dialogue Templates
// ============================================================================

/**
 * Maps dialogue keywords to prompts for the LLM
 */
const NPC_PROMPT_TEMPLATES: Record<string, string> = {
  // Greetings
  'greeting_first_time': 'This is the first time the player meets you. Greet them in character.',
  'greeting_repeat': 'The player approaches you again. Acknowledge them briefly.',
  'greeting_late_night': 'It\'s late at night. Greet the player with appropriate weariness.',
  'greeting_busy': 'You\'re busy with something. Greet them while distracted.',

  // Conversation topics
  'topic_murder': 'The player asks about the murder. Respond based on what you know.',
  'topic_victim': 'The player asks about the victim. Share relevant information.',
  'topic_suspect': 'The player asks about a suspect: {suspectName}. Share your thoughts.',
  'topic_location': 'The player asks about {locationName}. Describe what you know.',
  'topic_item': 'The player asks about {itemName}. Explain what you know about it.',

  // Emotional responses
  'refuse_answer': 'The player asked something you don\'t want to answer. Refuse politely or rudely based on your personality.',
  'dont_know': 'The player asked something you don\'t know. Admit you don\'t know.',
  'suspicious': 'You\'re suspicious of the player\'s motives. Express this cautiously.',
  'helpful': 'You want to help the player. Offer information or assistance.',
  'hostile': 'You\'re angry or hostile toward the player. Show this in your response.',

  // Reactions
  'surprised': 'The player revealed something surprising: {surprise}. React with surprise.',
  'relieved': 'Something was resolved. Express relief.',
  'scared': 'Something frightened you. Show fear.',
  'impressed': 'The player did something impressive. Acknowledge it.',

  // Functional
  'farewell': 'The player is leaving. Say goodbye in character.',
  'repeat_question': 'The player asked you the same thing again. Respond with mild irritation or patience.',
  'small_talk': 'The player is making small talk. Respond briefly in character.',
  'idle_comment': 'Make an idle comment or observation to fill silence.',

  // Special
  'hint_objective': 'The player seems stuck. Give a subtle hint about {objective}.',
  'break_fourth_wall': 'Make a meta comment about the game or situation.',
};

/**
 * Build NPC dialogue prompt
 */
function buildNPCDialoguePrompt(options: ExpandNPCDialogueOptions): string {
  const { keyword, context = {} } = options;

  let template = NPC_PROMPT_TEMPLATES[keyword];

  if (!template) {
    // Fallback: use the keyword as-is
    const humanReadable = keyword.replace(/_/g, ' ');
    template = `Respond to: ${humanReadable}`;
  }

  // Replace {placeholders}
  let prompt = template;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return prompt;
}

// ============================================================================
// Fallback Dialogue
// ============================================================================

const NPC_SIMPLE_FALLBACKS: Record<string, string> = {
  'greeting_first_time': 'Hello.',
  'greeting_repeat': 'Back again?',
  'greeting_late_night': 'Bit late, isn\'t it?',
  'greeting_busy': 'Yeah?',

  'topic_murder': 'I don\'t know much about that.',
  'topic_victim': 'Can\'t help you there.',
  'topic_suspect': 'Don\'t know them.',
  'topic_location': 'What about it?',
  'topic_item': 'Not sure what you mean.',

  'refuse_answer': 'I\'d rather not say.',
  'dont_know': 'I don\'t know.',
  'suspicious': '...',
  'helpful': 'Let me think...',
  'hostile': 'Get lost.',

  'surprised': 'What?!',
  'relieved': 'Thank god.',
  'scared': 'I... I don\'t...',
  'impressed': 'Not bad.',

  'farewell': 'See you around.',
  'repeat_question': 'I already told you.',
  'small_talk': 'Yeah.',
  'idle_comment': '...',

  'hint_objective': 'Have you checked everything?',
  'break_fourth_wall': 'This is weird.',
};

function generateSimpleNPCFallback(keyword: string, context: Record<string, string>): string {
  let message = NPC_SIMPLE_FALLBACKS[keyword] || '...';

  for (const [key, value] of Object.entries(context)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return message;
}

// ============================================================================
// Core NPC Dialogue Expansion
// ============================================================================

/**
 * Expands NPC dialogue keyword into character-appropriate dialogue
 *
 * @param options - Configuration for NPC dialogue expansion
 * @returns NPC dialogue with optional emotion
 *
 * @example
 * ```typescript
 * const result = await expandNPCDialogue({
 *   npcName: 'Frank the Bartender',
 *   npcPersonality: 'Gruff, world-weary, but secretly kind',
 *   keyword: 'greeting_late_night',
 *   context: { playerName: 'Detective' }
 * });
 * // Returns: { dialogue: "Still pounding the pavement, Detective? Usual spot's open.", emotion: "neutral" }
 * ```
 */
export async function expandNPCDialogue(options: ExpandNPCDialogueOptions): Promise<NPCDialogueResult> {
  const { npcName, npcPersonality, keyword, context = {}, conversationHistory, mood, maxLength = 150 } = options;

  // Check if narration expansion is enabled
  const narrationMode = process.env.NEXT_PUBLIC_NARRATION_MODE?.toLowerCase();
  if (narrationMode === 'static' || narrationMode === 'disabled') {
    return {
      dialogue: generateSimpleNPCFallback(keyword, context)
    };
  }

  // Check cache (but with lower priority for NPCs - we want variety)
  const cached = getCachedNPCDialogue(options);
  if (cached) {
    console.log(`💬 Using cached NPC dialogue: ${npcName} - ${keyword}`);
    return cached;
  }

  // Check if Ollama is available
  const isHealthy = await checkLocalLLMHealth();
  if (!isHealthy) {
    console.warn(`⚠️  Ollama unavailable for NPC dialogue: ${npcName} - ${keyword}`);
    return {
      dialogue: generateSimpleNPCFallback(keyword, context)
    };
  }

  try {
    const startTime = Date.now();

    // Build rich system prompt with character personality
    const systemPrompt = `You are ${npcName}.

PERSONALITY: ${npcPersonality}

${mood ? `CURRENT MOOD: ${mood}\n` : ''}
SETTING: This is a noir detective game. Stay in character and match the dark, atmospheric tone.

${conversationHistory && conversationHistory.length > 0 ? `RECENT CONVERSATION:\n${conversationHistory.join('\n')}\n` : ''}
INSTRUCTIONS:
- Respond in 1-2 sentences (under ${maxLength} characters)
- Stay completely in character
- Use natural, conversational language
- Show personality through word choice and tone
- Don't explain or narrate actions, just speak

IMPORTANT: You MUST respond with valid JSON in this exact format:
{"dialogue": "your character's spoken words here", "emotion": "neutral"}`;

    const userPrompt = buildNPCDialoguePrompt(options);

    console.log(`💬 Expanding NPC dialogue: ${npcName} - ${keyword}`);

    const result = await callLocalLLM(
      systemPrompt,
      userPrompt,
      NPCDialogueResponseSchema,
      { timeout: 20000 } // 20s timeout for Ollama (allows model loading on cold start)
    );

    const duration = Date.now() - startTime;
    console.log(`✅ NPC dialogue expanded in ${duration}ms: "${result.dialogue.substring(0, 50)}..."`);

    // Trim if needed
    let dialogue = result.dialogue;
    if (dialogue.length > maxLength) {
      const sentences = dialogue.match(/[^.!?]+[.!?]+/g) || [];
      dialogue = sentences[0] || dialogue.substring(0, maxLength);
    }

    const npcResult: NPCDialogueResult = {
      dialogue,
      emotion: result.emotion
    };

    // Cache the result
    setCachedNPCDialogue(options, npcResult);

    return npcResult;
  } catch (error) {
    console.error(`❌ NPC dialogue expansion failed for ${npcName} - "${keyword}":`, error);
    return {
      dialogue: generateSimpleNPCFallback(keyword, context)
    };
  }
}

/**
 * Clear NPC dialogue cache
 */
export async function clearNPCDialogueCache(): Promise<void> {
  npcDialogueCache.clear();
  console.log('🧹 NPC dialogue cache cleared');
}

/**
 * Get NPC dialogue cache statistics
 */
export async function getNPCDialogueCacheStats(): Promise<{
  size: number;
  entries: Array<{ key: string; age: number }>;
}> {
  const now = Date.now();
  const entries = Array.from(npcDialogueCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp
  }));

  return {
    size: npcDialogueCache.size,
    entries
  };
}
