/**
 * outcome-helpers.ts
 *
 * Helper functions for converting Outcome objects to Effect objects.
 * Centralizes media extraction logic so all handlers benefit.
 */

import type { Outcome, Effect, GameObjectId, ItemId, NpcId, PlayerState, Game } from "@/lib/game/types";
import { Validator } from "@/lib/game/engine";

/**
 * Converts an Outcome to a SHOW_MESSAGE Effect.
 * Automatically extracts media (url, description, hint) from outcome if present.
 * Falls back to entity-based image resolution if no media provided.
 *
 * @param outcome - The success/fail outcome from handler
 * @param fallbackEntityId - Optional entity ID for image fallback (object/item/npc)
 * @param entityType - Type of entity for image resolution ('object' | 'item' | 'npc')
 * @returns SHOW_MESSAGE Effect with proper media handling
 */
export function outcomeToMessageEffect(
  outcome: Outcome,
  fallbackEntityId?: GameObjectId | ItemId | NpcId,
  entityType?: 'object' | 'item' | 'npc'
): Effect {
  // Detect media type from URL extension
  const getMediaType = (url?: string): 'image' | 'video' | 'text' => {
    if (!url) return 'text';
    if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return 'video';
    return 'image';
  };

  const hasOutcomeMedia = outcome.media?.url !== undefined;
  const mediaType = getMediaType(outcome.media?.url);

  return {
    type: 'SHOW_MESSAGE',
    speaker: outcome.speaker || 'narrator',
    content: outcome.message || '',

    // Use outcome.media if present, otherwise fall back to entity image
    imageUrl: hasOutcomeMedia ? outcome.media?.url : undefined,
    imageDescription: hasOutcomeMedia ? outcome.media?.description : undefined,
    imageHint: hasOutcomeMedia ? outcome.media?.hint : undefined,

    // Fallback to entity-based image resolution if no outcome media
    imageId: !hasOutcomeMedia && fallbackEntityId ? fallbackEntityId : undefined,
    imageEntityType: !hasOutcomeMedia && fallbackEntityId ? entityType : undefined,

    messageType: hasOutcomeMedia ? mediaType : (fallbackEntityId ? 'image' : 'text')
  };
}

/**
 * Builds effects array with proper ordering:
 * 1. State-changing effects (SET_FLAG, SET_ENTITY_STATE, etc.)
 * 2. Message effect (with media support)
 *
 * This ensures state updates happen BEFORE message display,
 * so images resolve based on updated state.
 *
 * @param outcome - The success/fail outcome from handler
 * @param fallbackEntityId - Optional entity ID for image fallback
 * @param entityType - Type of entity for image resolution
 * @returns Array of effects in correct order
 */
export function buildEffectsFromOutcome(
  outcome: Outcome,
  fallbackEntityId?: GameObjectId | ItemId | NpcId,
  entityType?: 'object' | 'item' | 'npc'
): Effect[] {
  const effects: Effect[] = [];

  // 1. Add state-changing effects FIRST (no messages yet)
  if (outcome.effects) {
    for (const effect of outcome.effects) {
      if (effect.type !== 'SHOW_MESSAGE') {
        effects.push(effect);
      }
    }
  }

  // 2. Add main message with media support
  if (outcome.message) {
    effects.push(outcomeToMessageEffect(outcome, fallbackEntityId, entityType));
  }

  // 3. Add any additional SHOW_MESSAGE effects from outcome
  if (outcome.effects) {
    for (const effect of outcome.effects) {
      if (effect.type === 'SHOW_MESSAGE') {
        effects.push(effect);
      }
    }
  }

  return effects;
}

/**
 * Resolves a handler that may be a single handler or an array of conditional handlers.
 *
 * This function supports two patterns:
 * 1. Single handler with optional conditions
 * 2. Array of conditional handlers (evaluated in order, first match wins)
 *
 * Use this for handlers that have state-based branching (e.g., door states, progressive reading).
 * For itemId-based arrays (e.g., "use X on Y"), use the itemId pattern instead.
 *
 * @param handler - Single handler or array of conditional handlers
 * @param state - Current player state for condition evaluation
 * @param game - Game data for condition evaluation
 * @returns The resolved handler (success/fail outcomes), or null if no conditions matched
 *
 * @example
 * // Single handler
 * const handler = resolveConditionalHandler(object.handlers.onOpen, state, game);
 * if (handler) {
 *   const outcome = evaluateHandlerOutcome(handler, state, game);
 *   return buildEffectsFromOutcome(outcome, objectId, 'object');
 * }
 *
 * // Array of conditional handlers (e.g., door with multiple states)
 * onOpen: [
 *   { conditions: [{ type: 'STATE', entityId: 'door', key: 'isOpen', equals: true }], success: {...} },
 *   { conditions: [{ type: 'STATE', entityId: 'door', key: 'isLocked', equals: false }], success: {...} },
 *   { conditions: [{ type: 'STATE', entityId: 'door', key: 'isLocked', equals: true }], success: {...} }
 * ]
 */
export function resolveConditionalHandler(
  handler: any,
  state: PlayerState,
  game: Game
): { conditions?: any[], success?: Outcome, fail?: Outcome } | null {
  // Handle array of conditional handlers
  if (Array.isArray(handler)) {
    for (const conditionalHandler of handler) {
      const conditionsMet = Validator.evaluateConditions(conditionalHandler.conditions, state, game);
      if (conditionsMet) {
        return conditionalHandler;
      }
    }
    // No conditions matched
    return null;
  }

  // Handle single handler
  if (handler) {
    return handler;
  }

  return null;
}

/**
 * Evaluates a resolved handler's outcome based on conditions.
 * Use after resolveConditionalHandler to get the success/fail outcome.
 *
 * @param handler - Resolved handler from resolveConditionalHandler
 * @param state - Current player state
 * @param game - Game data
 * @returns The success or fail outcome based on conditions
 */
export function evaluateHandlerOutcome(
  handler: { conditions?: any[], success?: Outcome, fail?: Outcome },
  state: PlayerState,
  game: Game
): Outcome | null {
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  return conditionsMet ? handler.success || null : handler.fail || null;
}
