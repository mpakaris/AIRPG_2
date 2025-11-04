/**
 * outcome-helpers.ts
 *
 * Helper functions for converting Outcome objects to Effect objects.
 * Centralizes media extraction logic so all handlers benefit.
 */

import type { Outcome, Effect, GameObjectId, ItemId, NpcId } from "@/lib/game/types";

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
