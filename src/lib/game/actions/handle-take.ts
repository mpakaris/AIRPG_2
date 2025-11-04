
/**
 * handle-take - NEW ARCHITECTURE
 *
 * Handles taking (picking up) items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId, GameObjectId } from "@/lib/game/types";
import { HandlerResolver, VisibilityResolver, GameStateManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { outcomeToMessageEffect } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTarget = normalizeName(targetName);

  if (!normalizedTarget) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: game.systemMessages.needsTarget.take
    }];
  }

  // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
  const bestMatch = findBestMatch(normalizedTarget, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: false  // Can't take objects
  });

  // 1. Check if already in inventory
  if (bestMatch?.category === 'inventory') {
    const item = game.items[bestMatch.id as ItemId];
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: game.systemMessages.alreadyHaveItem(item.name),
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 2. Check if item found in visible entities
  if (!bestMatch || bestMatch.category !== 'visible-item') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: game.systemMessages.notVisible(targetName),
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  const itemId = bestMatch.id as ItemId;
  const item = game.items[itemId];
  if (!item) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: game.systemMessages.notVisible(targetName),
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 3. Check if item is takable
  if (item.capabilities && !item.capabilities.isTakable) {
    const failOutcome = item.handlers?.onTake?.fail;

    if (failOutcome?.media?.url) {
      // Use outcome helper to extract media from handler
      return [outcomeToMessageEffect(failOutcome, itemId as ItemId, 'item')];
    }

    // Fallback to system media
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: failOutcome?.message || `You can't take the ${item.name}.`,
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 4. Find the parent container (if any)
  const parentId = VisibilityResolver.findParent(itemId, state);

  // 5. Build effects
  const effects: Effect[] = [
    { type: 'ADD_ITEM', itemId: itemId as ItemId }
  ];

  // Add handler effects if present
  if (item.handlers?.onTake?.success?.effects) {
    effects.push(...item.handlers.onTake.success.effects);
  }

  // If item was in a container, remove it from there
  if (parentId && parentId !== state.currentLocationId) {
    effects.push({
      type: 'REMOVE_ITEM_FROM_CONTAINER',
      itemId: itemId as ItemId,
      containerId: parentId as GameObjectId
    });
  }

  // Add success message with media support
  const successOutcome = item.handlers?.onTake?.success;

  if (successOutcome?.media?.url) {
    // Use outcome helper to extract media from handler
    effects.push(outcomeToMessageEffect(successOutcome, itemId as ItemId, 'item'));
  } else {
    // Fallback to system media
    const successMessage = successOutcome?.message || `You take the ${item.name}.`;

    // ALWAYS provide both imageId (for item-specific images) AND imageUrl (as fallback)
    // The resolution order in GameStateManager.SHOW_MESSAGE:
    // 1. Try to resolve imageId (item's state-based image)
    // 2. If item's image has url=undefined, createMessage returns no image
    // 3. Then imageUrl is used as fallback (system generic image)
    effects.push({
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: successMessage,
      messageType: 'image',
      imageId: itemId as ItemId,
      imageEntityType: 'item',
      // Fallback to system generic image if item doesn't provide one
      imageUrl: game.systemMedia?.take?.success?.url,
      imageDescription: game.systemMedia?.take?.success?.description,
      imageHint: game.systemMedia?.take?.success?.hint
    });
  }

  return effects;
}
