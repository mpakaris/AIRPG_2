
/**
 * handle-drop - NEW ARCHITECTURE
 *
 * Handles dropping items from inventory.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId } from "@/lib/game/types";
import { Validator, HandlerResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";

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
  const itemId = state.inventory.find(id => {
    const item = game.items[id];
    if (!item) return false;

    const itemNameNorm = normalizeName(item.name);
    const altNames = item.alternateNames?.map(normalizeName) || [];

    return itemNameNorm.includes(normalizedItemName) ||
           altNames.some(alt => alt.includes(normalizedItemName));
  });

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

  // 2. Get handler
  const handler = item.handlers?.onDrop;

  if (!handler) {
    // No handler defined - use default behavior
    return [
      {
        type: 'REMOVE_ITEM',
        itemId: itemId as ItemId
      },
      {
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You drop the ${item.name}.`
      }
    ];
  }

  // 3. Evaluate conditions
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;

  if (!outcome) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: item.handlers?.defaultFailMessage || `You can't drop the ${item.name}.`
    }];
  }

  // 4. Build effects using helper (with media support)
  const effects: Effect[] = [];

  // If success, remove from inventory (unless outcome already has REMOVE_ITEM)
  if (conditionsMet && !outcome.effects?.some(e => e.type === 'REMOVE_ITEM')) {
    effects.push({
      type: 'REMOVE_ITEM',
      itemId: itemId as ItemId
    });
  }

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(outcome, itemId as ItemId, 'item'));

  return effects;
}
