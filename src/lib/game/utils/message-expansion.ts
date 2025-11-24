/**
 * @fileOverview Message Expansion Utilities
 *
 * Provides utilities to integrate Hybrid C narrative expansion with the existing
 * SystemMessages architecture. Detects keyword-based messages and expands them
 * using the local LLM.
 *
 * NOTE: This file does NOT have 'use server' because it exports the MessageExpander
 * object in addition to functions. The handlers that import this already have 'use server'.
 */

import { expandNarration, type ExpandNarrationOptions } from '@/ai/expand-narration';

// ============================================================================
// Keyword Detection
// ============================================================================

/**
 * Check if a message is a keyword (underscore-separated, no spaces)
 */
export function isKeyword(message: string): boolean {
  // Keywords are lowercase with underscores, no spaces or punctuation (except underscores)
  return /^[a-z][a-z0-9_]*$/.test(message);
}

/**
 * Extract context from parameters passed to SystemMessages functions
 * This helps us pass the right context to the LLM
 */
export interface MessageContext {
  itemName?: string;
  objectName?: string;
  targetName?: string;
  locationName?: string;
  npcName?: string;
  goal?: string;
  topic?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Message Expansion
// ============================================================================

/**
 * Expand a system message, detecting if it's a keyword or static text
 *
 * If the message is a keyword (e.g., "cant_use_item"), it will be expanded
 * using the local LLM. Otherwise, it returns the message as-is.
 *
 * @param message - The message from SystemMessages (either keyword or static text)
 * @param context - Context variables (itemName, objectName, etc.)
 * @param options - Optional expansion options (tone, fallback, etc.)
 * @returns Expanded message
 *
 * @example
 * ```typescript
 * // Static message (no expansion)
 * const msg1 = await expandSystemMessage("You can't use that here.", {});
 * // Returns: "You can't use that here."
 *
 * // Keyword-based message (will expand)
 * const msg2 = await expandSystemMessage("cant_use_item", { itemName: "crowbar" });
 * // Returns: "The crowbar ain't gonna help you here, detective."
 * ```
 */
export async function expandSystemMessage(
  message: string,
  context: MessageContext,
  options?: Partial<ExpandNarrationOptions>
): Promise<string> {
  // If it's not a keyword, return as-is (static message)
  if (!isKeyword(message)) {
    return message;
  }

  // It's a keyword - expand it using local LLM
  const expandOptions: ExpandNarrationOptions = {
    keyword: message,
    context: context as Record<string, string>,
    fallback: options?.fallback,
    tone: options?.tone,
    maxLength: options?.maxLength,
    useCache: options?.useCache ?? true
  };

  return await expandNarration(expandOptions);
}

/**
 * Helper for expanding messages that take a single parameter
 * Most SystemMessages functions take one parameter (itemName, objectName, etc.)
 */
export async function expandMessageWith(
  messageFn: (param: string) => string,
  param: string,
  contextKey: keyof MessageContext
): Promise<string> {
  const message = messageFn(param);
  const context: MessageContext = { [contextKey]: param };
  return await expandSystemMessage(message, context);
}

/**
 * Helper for expanding messages with two parameters
 */
export async function expandMessageWith2(
  messageFn: (param1: string, param2: string) => string,
  param1: string,
  param2: string,
  contextKey1: keyof MessageContext,
  contextKey2: keyof MessageContext
): Promise<string> {
  const message = messageFn(param1, param2);
  const context: MessageContext = {
    [contextKey1]: param1,
    [contextKey2]: param2
  };
  return await expandSystemMessage(message, context);
}

// ============================================================================
// Common Expansion Patterns
// ============================================================================

/**
 * Quick helpers for the most common SystemMessages patterns
 */
export const MessageExpander = {
  /**
   * Expand a "can't use item" message
   */
  cantUseItem: async (messageFn: (itemName: string) => string, itemName: string) => {
    return expandMessageWith(messageFn, itemName, 'itemName');
  },

  /**
   * Expand a "can't use item on target" message
   */
  cantUseItemOnTarget: async (
    messageFn: (itemName: string, targetName: string) => string,
    itemName: string,
    targetName: string
  ) => {
    return expandMessageWith2(messageFn, itemName, targetName, 'itemName', 'targetName');
  },

  /**
   * Expand a "can't open object" message
   */
  cantOpen: async (messageFn: (objectName: string) => string, objectName: string) => {
    return expandMessageWith(messageFn, objectName, 'objectName');
  },

  /**
   * Expand a "can't move object" message
   */
  cantMoveObject: async (messageFn: (objectName: string) => string, objectName: string) => {
    return expandMessageWith(messageFn, objectName, 'objectName');
  },

  /**
   * Expand a "don't have item" message
   */
  dontHaveItem: async (messageFn: (itemName: string) => string, itemName: string) => {
    return expandMessageWith(messageFn, itemName, 'itemName');
  },

  /**
   * Expand a "not visible" message
   */
  notVisible: async (messageFn: (itemName: string) => string, itemName: string) => {
    return expandMessageWith(messageFn, itemName, 'itemName');
  },

  /**
   * Expand a "not readable" message
   */
  notReadable: async (messageFn: (itemName: string) => string, itemName: string) => {
    return expandMessageWith(messageFn, itemName, 'itemName');
  },

  /**
   * Expand any static message (no parameters)
   */
  static: async (message: string) => {
    return expandSystemMessage(message, {});
  }
};
