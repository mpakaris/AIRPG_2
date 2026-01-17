
/**
 * handle-drop - NEW ARCHITECTURE
 *
 * Handles dropping items from inventory.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId, GameObjectId } from "@/lib/game/types";
import { INVENTORY_PERMANENT_ITEMS } from "@/lib/game/types";
import { Validator, HandlerResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { getZoneStorageId } from "@/lib/game/utils/zone-storage";

export async function handleDrop(state: PlayerState, itemName: string, game: Game): Promise<Effect[]> {
  const normalizedItemName = normalizeName(itemName);

  if (!normalizedItemName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "You need to specify what to drop."
    }];
  }

  // 1. Find item in inventory
  // PRIORITY 1: Direct ID lookup (from AI)
  let itemId: ItemId | null = null;

  if (normalizedItemName.startsWith('item_') && state.inventory.includes(normalizedItemName as ItemId)) {
    itemId = normalizedItemName as ItemId;
  }

  // PRIORITY 2: Fuzzy name matching (fallback for natural language)
  if (!itemId) {
    itemId = state.inventory.find(id => {
      const item = game.items[id];
      if (!item) return false;

      const itemNameNorm = normalizeName(item.name);
      const altNames = item.alternateNames?.map(normalizeName) || [];

      return itemNameNorm.includes(normalizedItemName) ||
             altNames.some(alt => alt.includes(normalizedItemName));
    }) || null;
  }

  if (!itemId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't have "${itemName}" in your inventory.`
    }];
  }

  const item = game.items[itemId];
  if (!item) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `Item "${itemName}" not found.`
    }];
  }

  // 2. Check if item is permanent (can't be dropped)
  if (INVENTORY_PERMANENT_ITEMS.includes(itemId as ItemId)) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You can't drop the ${item.name}. It's essential equipment.`
    }];
  }

  // 3. Get zone storage container for current location
  const storageId = getZoneStorageId(state.currentLocationId);
  if (!storageId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You can't drop items here.`
    }];
  }

  // 4. Get handler
  const handler = item.handlers?.onDrop;

  if (!handler) {
    // No handler defined - use default behavior: move to zone storage
    const effects: Effect[] = [
      {
        type: 'REMOVE_ITEM',
        itemId: itemId as ItemId
      },
      {
        type: 'ADD_TO_CONTAINER',
        entityId: itemId as string,
        containerId: storageId as string
      },
      {
        type: 'REVEAL_OBJECT',
        objectId: storageId
      },
      {
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You set aside the ${item.name} in this area. You can pick it up later from your dropped items.`
      }
    ];
    return effects;
  }

  // 5. Evaluate conditions (custom handler exists)
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;

  if (!outcome) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: item.handlers?.defaultFailMessage || `You can't drop the ${item.name}.`
    }];
  }

  // 6. Build effects using helper (with media support)
  const effects: Effect[] = [];

  // Remove from inventory and add to zone storage
  if (conditionsMet && !outcome.effects?.some(e => e.type === 'REMOVE_ITEM')) {
    effects.push({
      type: 'REMOVE_ITEM',
      itemId: itemId as ItemId
    });
    effects.push({
      type: 'ADD_TO_CONTAINER',
      entityId: itemId as string,
      containerId: storageId as string
    });
    effects.push({
      type: 'REVEAL_OBJECT',
      objectId: storageId
    });
  }

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(outcome, itemId as ItemId, 'item'));

  return effects;
}
