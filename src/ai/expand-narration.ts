'use server';

/**
 * @fileOverview Narrative Expansion System (Hybrid C Architecture)
 *
 * Expands keywords into full narrative responses using local LLM (Ollama).
 *
 * Benefits:
 * - Zero cost: Unlimited generations with local LLM
 * - Always fresh: Same keyword produces different responses each time
 * - Graceful degradation: Falls back to simple messages if Ollama unavailable
 * - Maintainable: Only keywords need to be maintained, not full text
 *
 * Usage:
 *   const message = await expandNarration({
 *     keyword: 'cant_smash_metal_box',
 *     context: { objectName: 'metal box' },
 *     tone: 'noir-detective'
 *   });
 */

import { callLocalLLM, checkLocalLLMHealth } from '@/ai/local-llm-client';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

const NarrationResponseSchema = z.object({
  response: z.string().describe('The expanded narrative response in the specified tone')
});

export interface ExpandNarrationOptions {
  keyword: string;                    // e.g., "cant_smash_metal_box"
  context?: Record<string, string>;   // e.g., { objectName: "metal box", itemName: "crowbar" }
  tone?: string;                      // Optional tone override
  fallback?: string;                  // Optional static fallback if LLM fails
  maxLength?: number;                 // Max length in characters (default: 200)
  useCache?: boolean;                 // Use session cache (default: true)
}

// ============================================================================
// Session Cache
// ============================================================================

interface CacheEntry {
  response: string;
  timestamp: number;
}

const narrationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30000; // 30 seconds - short TTL to keep responses fresh

/**
 * Generate cache key from options
 */
function getCacheKey(options: ExpandNarrationOptions): string {
  const contextStr = JSON.stringify(options.context || {});
  return `${options.keyword}:${contextStr}:${options.tone || 'default'}`;
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(options: ExpandNarrationOptions): string | null {
  if (options.useCache === false) return null;

  const key = getCacheKey(options);
  const entry = narrationCache.get(key);

  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    narrationCache.delete(key);
    return null;
  }

  return entry.response;
}

/**
 * Store response in cache
 */
function setCachedResponse(options: ExpandNarrationOptions, response: string): void {
  if (options.useCache === false) return;

  const key = getCacheKey(options);
  narrationCache.set(key, {
    response,
    timestamp: Date.now()
  });

  // Clean up old entries periodically
  if (narrationCache.size > 100) {
    cleanupCache();
  }
}

/**
 * Remove expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of narrationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      narrationCache.delete(key);
    }
  }
}

// ============================================================================
// Prompt Mapping System
// ============================================================================

/**
 * Maps keywords to natural language prompts for the LLM
 */
const PROMPT_TEMPLATES: Record<string, string> = {
  // Item interaction failures
  'cant_use_item': 'Start by stating "You can\'t use the {itemName} here." Then briefly explain why in a matter-of-fact way.',
  'cant_use_item_on_target': 'Start by stating "That won\'t work." Then briefly explain why using {itemName} on {targetName} doesn\'t work.',
  'dont_have_item': 'Start by stating "You don\'t have the {itemName}." Keep it simple and direct.',
  'already_have_item': 'Start by stating "You already have the {itemName}." Add a brief dry observation.',
  'use_didnt_work': 'State "That didn\'t work." Then add a brief matter-of-fact observation.',

  // Object interaction failures
  'cant_break_object': 'Player input: "{playerAction}". They want to break {objectName}. Narrate why it won\'t work in 1-2 sentences. Acknowledge what they tried to do. Be matter-of-fact with subtle dry humor.',
  'cant_smash_object': 'Player input: "{playerAction}". They want to smash {objectName}. Narrate why it won\'t work in 1-2 sentences. Acknowledge what they tried to do. Be matter-of-fact with subtle dry humor.',
  'cant_move_object': 'The player tried to move {objectName}. Explain why it won\'t move (too heavy, fixed, etc.) in 1-2 sentences with subtle dry humor.',
  'cant_open_object': 'The player tried to open {objectName}. Explain why it won\'t open in 1-2 sentences. Be matter-of-fact.',
  'already_open': 'The player tried to open {objectName} but it\'s already open. State this with a brief dry observation.',
  'already_closed': 'The player tried to close {objectName} but it\'s already closed. State this with a brief dry observation.',

  // Password/lock failures
  'wrong_password': 'The player entered the wrong password. React with dark humor about their failed attempt.',
  'already_unlocked': '{objectName} is already unlocked. Make a sarcastic observation.',
  'no_password_input': 'The player needs to enter a password for {objectName}. Explain this with mild impatience.',

  // Visibility/location errors
  'item_not_visible': 'The player can\'t see {itemName} here. Tell them to look around more carefully, with sarcasm.',
  'item_not_found': 'The player is looking for {itemName} but it\'s not here. Give a noir-style response about futile searches.',
  'object_out_of_focus': 'The player tried to interact with {objectName} but they need to focus on it first. Explain this with impatience.',

  // Taking/dropping items
  'cant_take_item': 'Start by stating "You can\'t take the {itemName}." Then briefly explain why in a matter-of-fact way.',
  'item_too_heavy': 'Start by stating "The {itemName} is too heavy." Keep it simple and direct.',
  'inventory_full': 'Start by stating "Your pockets are full." Then suggest dropping something first.',

  // Reading failures
  'not_readable': '{itemName} can\'t be read. Explain this with dry humor.',
  'already_read_all': 'The player already read everything in {itemName}. Make a sarcastic comment about their memory.',
  'text_illegible': 'The text is illegible or damaged. Describe this atmospherically.',

  // Navigation failures
  'cannot_go_there': 'The player can\'t go that way. Give a noir-style response about hitting dead ends.',
  'chapter_incomplete': 'The player tried to leave but needs to complete the objective: {goal}. Remind them with impatience.',

  // NPC dialogue
  'npc_busy': '{npcName} is busy right now. Give a noir-style response about bad timing.',
  'npc_no_response': '{npcName} doesn\'t respond. Describe the awkward silence atmospherically.',
  'npc_repeat_question': 'The player asked {npcName} about {topic} again. Have the NPC respond with mild irritation.',

  // Generic fallbacks
  'not_implemented': 'That feature isn\'t available yet. Break the fourth wall with noir-style humor.',
  'confused_input': 'The game didn\'t understand what the player meant. Respond as a confused noir narrator.',
  'generic_failure': 'That didn\'t work. Give a generic noir-style dismissal.',
};

/**
 * Build the user prompt from keyword and context
 */
function buildNarrationPrompt(keyword: string, context: Record<string, string>): string {
  let template = PROMPT_TEMPLATES[keyword];

  if (!template) {
    // Fallback: try to make a reasonable prompt from the keyword
    const humanReadable = keyword.replace(/_/g, ' ');
    template = `Respond to this situation: ${humanReadable}. Use a dark, sarcastic noir detective tone.`;
  }

  // Replace {placeholders} with context values
  let prompt = template;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  // Remove any remaining unfilled placeholders (optional fields)
  prompt = prompt.replace(/\{[^}]+\}/g, '');

  // Clean up empty quotes and artifacts from optional fields
  prompt = prompt.replace(/:\s*""\.\s*/g, '. '); // Remove empty quoted strings like: "".
  prompt = prompt.replace(/Player input:\s*\.\s*/g, ''); // Remove "Player input: ." if playerAction was empty

  return prompt;
}

// ============================================================================
// Fallback System
// ============================================================================

/**
 * Simple fallback messages when LLM is unavailable
 */
const SIMPLE_FALLBACKS: Record<string, string> = {
  'cant_use_item': 'You can\'t use that here.',
  'cant_use_item_on_target': 'That won\'t work.',
  'dont_have_item': 'You don\'t have that.',
  'already_have_item': 'You already have that.',
  'use_didnt_work': 'Nothing happens.',

  'cant_break_object': 'You can\'t break that.',
  'cant_smash_object': 'You can\'t break that.',
  'cant_move_object': 'It won\'t budge.',
  'cant_open_object': 'It won\'t open.',
  'already_open': 'It\'s already open.',
  'already_closed': 'It\'s already closed.',

  'wrong_password': 'Wrong password.',
  'already_unlocked': 'It\'s already unlocked.',
  'no_password_input': 'You need to enter a password.',

  'item_not_visible': 'You don\'t see that here.',
  'item_not_found': 'You can\'t find that.',
  'object_out_of_focus': 'You need to focus on that first.',

  'cant_take_item': 'You can\'t take that.',
  'item_too_heavy': 'It\'s too heavy.',
  'inventory_full': 'Your pockets are full.',

  'not_readable': 'You can\'t read that.',
  'already_read_all': 'You\'ve already read it.',
  'text_illegible': 'The text is illegible.',

  'cannot_go_there': 'You can\'t go that way.',
  'chapter_incomplete': 'You need to complete your objective first.',

  'npc_busy': 'They\'re busy.',
  'npc_no_response': 'No response.',
  'npc_repeat_question': '...',

  'not_implemented': 'That\'s not available.',
  'confused_input': 'What?',
  'generic_failure': 'That doesn\'t work.',
};

/**
 * Generate a simple fallback message
 */
function generateSimpleFallback(keyword: string, context: Record<string, string>): string {
  let message = SIMPLE_FALLBACKS[keyword];

  if (!message) {
    // Ultra-generic fallback
    return 'That doesn\'t work.';
  }

  // Replace {placeholders} with context values
  for (const [key, value] of Object.entries(context)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return message;
}

// ============================================================================
// Core Expansion Function
// ============================================================================

/**
 * Expands a narrative keyword into a full response using local LLM
 *
 * This is the main entry point for the Hybrid C narrative system.
 *
 * @param options - Configuration for narrative expansion
 * @returns Expanded narrative text (either from LLM or fallback)
 *
 * @example
 * ```typescript
 * const message = await expandNarration({
 *   keyword: 'cant_smash_metal_box',
 *   context: { objectName: 'metal box' },
 *   fallback: 'You can\'t smash that.'
 * });
 * // Returns: "Nice try, gumshoe. That metal box ain't budging—you'd need
 * //           a blowtorch and a prayer to crack that thing open."
 * ```
 */
export async function expandNarration(options: ExpandNarrationOptions): Promise<string> {
  const { keyword, context = {}, tone, fallback, maxLength = 200 } = options;

  // Check if narration expansion is enabled
  const narrationMode = process.env.NEXT_PUBLIC_NARRATION_MODE?.toLowerCase();
  if (narrationMode === 'static' || narrationMode === 'disabled') {
    return fallback || generateSimpleFallback(keyword, context);
  }

  // Check cache first
  const cached = getCachedResponse(options);
  if (cached) {
    console.log(`📝 Using cached narration for: ${keyword}`);
    return cached;
  }

  // Check if Ollama is available
  const isHealthy = await checkLocalLLMHealth();
  if (!isHealthy) {
    console.warn(`⚠️  Ollama unavailable for narration, using fallback: ${keyword}`);
    const fallbackMessage = fallback || generateSimpleFallback(keyword, context);
    return fallbackMessage;
  }

  try {
    const startTime = Date.now();

    // Build system prompt with tone
    const systemPrompt = tone ||
      `You are a noir detective story narrator. Use a dry, matter-of-fact tone with subtle dark humor.
Keep responses to 1-2 sentences maximum (under ${maxLength} characters).
Be atmospheric but not overly dramatic. Straightforward with a hint of world-weariness.

IMPORTANT: You MUST respond with valid JSON in this exact format:
{"response": "your narrative text here"}`;

    const userPrompt = buildNarrationPrompt(keyword, context);

    console.log('\n🎭 ===== NARRATIVE EXPANSION =====');
    console.log(`📝 Keyword: "${keyword}"`);
    console.log(`🎯 Context:`, context);
    console.log(`📤 System Prompt:\n   ${systemPrompt.split('\n').join('\n   ')}`);
    console.log(`📤 User Prompt: "${userPrompt}"`);
    console.log(`⏱️  Calling Ollama...`);

    const result = await callLocalLLM(
      systemPrompt,
      userPrompt,
      NarrationResponseSchema,
      { timeout: 20000 } // 20s timeout for Ollama (allows model loading on cold start)
    );

    const duration = Date.now() - startTime;
    console.log(`📥 Ollama Response: "${result.response}"`);
    console.log(`✅ Expansion complete in ${duration}ms`);
    console.log(`================================\n`);

    // Trim to max length if needed
    let response = result.response;
    if (response.length > maxLength) {
      // Try to cut at sentence boundary
      const sentences = response.match(/[^.!?]+[.!?]+/g) || [];
      response = sentences[0] || response.substring(0, maxLength);
    }

    // Cache the response
    setCachedResponse(options, response);

    return response;
  } catch (error) {
    console.error(`\n❌ ===== EXPANSION FAILED =====`);
    console.error(`📝 Keyword: "${keyword}"`);
    console.error(`🎯 Context:`, context);
    console.error(`💥 Error:`, error);
    console.error(`🔄 Using fallback...`);
    console.error(`================================\n`);
    const fallbackMessage = fallback || generateSimpleFallback(keyword, context);
    return fallbackMessage;
  }
}

/**
 * Clear the narration cache (useful for testing or memory management)
 */
export async function clearNarrationCache(): Promise<void> {
  narrationCache.clear();
  console.log('🧹 Narration cache cleared');
}

/**
 * Get cache statistics
 */
export async function getNarrationCacheStats(): Promise<{
  size: number;
  entries: Array<{ key: string; age: number }>;
}> {
  const now = Date.now();
  const entries = Array.from(narrationCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp
  }));

  return {
    size: narrationCache.size,
    entries
  };
}
