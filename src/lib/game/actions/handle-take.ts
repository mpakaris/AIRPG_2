
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
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTarget = normalizeName(targetName);

  if (!normalizedTarget) {
    const message = await MessageExpander.static(game.systemMessages.needsTarget.take);
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: message
    }];
  }

  // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
  const bestMatch = findBestMatch(normalizedTarget, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: false,  // Can't take objects
    requireFocus: true
  });

  // 1. Check if already in inventory
  if (bestMatch?.category === 'inventory') {
    const item = game.items[bestMatch.id as ItemId];
    const message = await MessageExpander.static(game.systemMessages.alreadyHaveItem(item.name));
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: message,
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 2. Check if item found in visible entities
  if (!bestMatch || bestMatch.category !== 'visible-item') {
    const smartMessage = getSmartNotFoundMessage(normalizedTarget, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false
    });
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: smartMessage.found ? `You notice that, but you can't take it from here.` : smartMessage.message,
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  const itemId = bestMatch.id as ItemId;
  const item = game.items[itemId];
  if (!item) {
    const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: message,
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 3. Check if item is takable
  if (item.capabilities && !item.capabilities.isTakable) {
    const failOutcome = item.handlers?.onTake?.fail;
    const failMessage = failOutcome?.message || `You can't take the ${item.name}.`;
    const failMedia = failOutcome?.media;

    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: failMessage,
      messageType: 'image',
      // Use custom handler media if present, otherwise fall back to system media
      imageUrl: failMedia?.url || game.systemMedia?.take?.failure?.url,
      imageDescription: failMedia?.description || game.systemMedia?.take?.failure?.description,
      imageHint: failMedia?.hint || game.systemMedia?.take?.failure?.hint
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
  const successMessage = successOutcome?.message || `You take the ${item.name}.`;

  // Check if handler has custom media
  const customMedia = successOutcome?.media;

  effects.push({
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: successMessage,
    messageType: 'image',
    // Use custom handler media if present, otherwise fall back to system media
    imageUrl: customMedia?.url || game.systemMedia?.take?.success?.url,
    imageDescription: customMedia?.description || game.systemMedia?.take?.success?.description,
    imageHint: customMedia?.hint || game.systemMedia?.take?.success?.hint
  });

  return effects;
}
