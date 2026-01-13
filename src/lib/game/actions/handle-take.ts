
/**
 * handle-take - NEW ARCHITECTURE
 *
 * Handles taking (picking up) items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId, GameObjectId } from "@/lib/game/types";
import { INVENTORY_MAX_SIZE, INVENTORY_PERMANENT_ITEMS } from "@/lib/game/types";
import { HandlerResolver, VisibilityResolver, GameStateManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";
import { MessageExpander } from "@/lib/game/utils/message-expansion";
import { generateCantTakeMessage, generateCantAccessMessage } from "@/ai";

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
  // NOTE: We search objects too, so we can give proper "can't take furniture" messages
  const bestMatch = findBestMatch(normalizedTarget, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: true,  // Search objects to detect furniture/objects player tries to take
    requireFocus: false  // Search all visible entities (focus validation happens separately if needed)
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

  // 2. Check if it's a GameObject (furniture/object) - can't take these
  if (bestMatch?.category === 'object') {
    const obj = game.gameObjects[bestMatch.id as GameObjectId];
    let objectMessage: string;

    try {
      const location = game.locations[state.currentLocationId];
      const aiResult = await generateCantTakeMessage({
        itemName: obj?.name || targetName,
        locationName: location?.name || 'Unknown',
        gameSetting: game.setting || 'Modern-day detective game'
      });
      objectMessage = aiResult.output.message;
    } catch (error) {
      console.error("AI generation failed for cant-take-object message:", error);
      objectMessage = `You can't take the ${obj?.name || targetName}.`;
    }

    return [
      {
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: objectMessage,
        messageType: 'image',
        imageUrl: game.systemMedia?.take?.failure?.url,
        imageDescription: game.systemMedia?.take?.failure?.description,
        imageHint: game.systemMedia?.take?.failure?.hint
      },
      {
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `Turns out, you can't take this item.`
      }
    ];
  }

  // 3. Check if item found in visible entities
  if (!bestMatch || bestMatch.category !== 'visible-item') {
    const smartMessage = getSmartNotFoundMessage(normalizedTarget, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false  // Objects already handled above
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

  // NEW ZONE ARCHITECTURE: Check zone access for items
  const { ZoneManager } = await import('@/lib/game/engine');
  const accessCheck = ZoneManager.canAccess(itemId, 'item', state, game);

  if (!accessCheck.allowed) {
    // Generate AI-powered narrative failure message
    let errorMessage: string;

    if (accessCheck.reason === 'out_of_zone') {
      try {
        const location = game.locations[state.currentLocationId];
        const aiResult = await generateCantAccessMessage({
          targetName: accessCheck.targetName || targetName,
          action: 'take',
          locationName: location?.name || 'Unknown',
          gameSetting: game.setting || 'Modern-day detective game'
        });
        errorMessage = aiResult.output.message;
      } catch (error) {
        console.error("AI generation failed for cant-access message:", error);
        errorMessage = `You can't reach that from here.`;
      }
    } else if (accessCheck.reason === 'container_closed') {
      errorMessage = `You'll need to open the container first before you can take what's inside.`;
    } else {
      errorMessage = 'You cannot reach that from here';
    }

    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: errorMessage,
      messageType: 'image',
      imageUrl: game.systemMedia?.take?.failure?.url,
      imageDescription: game.systemMedia?.take?.failure?.description,
      imageHint: game.systemMedia?.take?.failure?.hint
    }];
  }

  // 4. Check if item is takeable (if not, generate AI message)
  if (item.capabilities && !item.capabilities.isTakable) {
    const failOutcome = item.handlers?.onTake?.fail;
    const failMedia = failOutcome?.media;
    let failMessage: string;

    // PRIORITY 1: Use custom message if defined (for story-critical items)
    if (failOutcome?.message) {
      failMessage = failOutcome.message;
    }
    // PRIORITY 2: Generate creative AI message (no story spoilers)
    else {
      try {
        const location = game.locations[state.currentLocationId];
        const aiResult = await generateCantTakeMessage({
          itemName: item.name,
          locationName: location?.name || 'Unknown',
          gameSetting: game.setting || 'Modern-day detective game'
        });
        failMessage = aiResult.output.message;
      } catch (error) {
        // PRIORITY 3: Generic fallback if AI fails
        console.error("AI generation failed for cant-take message:", error);
        failMessage = `You can't take the ${item.name}.`;
      }
    }

    return [
      {
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: failMessage,
        messageType: 'image',
        // Use custom handler media if present, otherwise fall back to system media
        imageUrl: failMedia?.url || game.systemMedia?.take?.failure?.url,
        imageDescription: failMedia?.description || game.systemMedia?.take?.failure?.description,
        imageHint: failMedia?.hint || game.systemMedia?.take?.failure?.hint
      },
      {
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `Turns out, you can't take this item.`
      }
    ];
  }

  // 5. Check inventory capacity
  const currentInventorySize = state.inventory.length;
  if (currentInventorySize >= INVENTORY_MAX_SIZE) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `Your inventory is full (${currentInventorySize}/${INVENTORY_MAX_SIZE} items). You need to DROP something before you can take more items.`
    }];
  }

  // Show capacity warning when approaching full
  const willBeFull = currentInventorySize + 1 >= INVENTORY_MAX_SIZE;
  const capacityWarning = willBeFull
    ? `\n\n[Inventory: ${currentInventorySize + 1}/${INVENTORY_MAX_SIZE} items - Full! Drop items if needed.]`
    : `\n\n[Inventory: ${currentInventorySize + 1}/${INVENTORY_MAX_SIZE} items]`;

  // 6. Find the parent container (if any)
  const parentId = VisibilityResolver.findParent(itemId, state);

  // 7. Build effects
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

  // Add success message with media support and capacity warning
  const successOutcome = item.handlers?.onTake?.success;
  const baseMessage = successOutcome?.message || `You take the ${item.name}.`;
  const successMessage = baseMessage + capacityWarning;

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
