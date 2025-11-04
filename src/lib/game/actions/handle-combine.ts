
/**
 * handle-combine - NEW ARCHITECTURE
 *
 * Handles combining two items in inventory.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId } from "@/lib/game/types";
import { Validator } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleCombine(
  state: PlayerState,
  item1Name: string,
  item2Name: string,
  game: Game
): Promise<Effect[]> {
  const normalizedItem1 = normalizeName(item1Name);
  const normalizedItem2 = normalizeName(item2Name);

  if (!normalizedItem1 || !normalizedItem2) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "You need to specify two items to combine."
    }];
  }

  // LOCATION-AWARE SEARCH: Find items in inventory (prioritizes exact matches)
  const item1Match = findBestMatch(normalizedItem1, state, game, {
    searchInventory: true,
    searchVisibleItems: false,
    searchObjects: false
  });

  const item2Match = findBestMatch(normalizedItem2, state, game, {
    searchInventory: true,
    searchVisibleItems: false,
    searchObjects: false
  });

  if (!item1Match || item1Match.category !== 'inventory') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't have "${item1Name}" in your inventory.`
    }];
  }

  if (!item2Match || item2Match.category !== 'inventory') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't have "${item2Name}" in your inventory.`
    }];
  }

  const itemId1 = item1Match.id as ItemId;
  const itemId2 = item2Match.id as ItemId;

  const item1 = game.items[itemId1];
  const item2 = game.items[itemId2];

  if (!item1 || !item2) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "Item not found."
    }];
  }

  // 2. Check if item1 has combine handler for item2
  const combineHandlers = item1.handlers?.onCombine;

  if (!combineHandlers || !Array.isArray(combineHandlers)) {
    // Try item2's handler for item1
    const combineHandlers2 = item2.handlers?.onCombine;

    if (!combineHandlers2 || !Array.isArray(combineHandlers2)) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't combine the ${item1.name} with the ${item2.name}.`
      }];
    }

    // Use item2's handler
    const specificHandler = combineHandlers2.find(h => h.itemId === itemId1);

    if (!specificHandler) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't combine the ${item2.name} with the ${item1.name}.`
      }];
    }

    return processCombineHandler(specificHandler, state, game, item2, item1, itemId2 as ItemId, itemId1 as ItemId);
  }

  // 3. Find specific handler for item2
  const specificHandler = combineHandlers.find(h => h.itemId === itemId2);

  if (!specificHandler) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You can't combine the ${item1.name} with the ${item2.name}.`
    }];
  }

  return processCombineHandler(specificHandler, state, game, item1, item2, itemId1 as ItemId, itemId2 as ItemId);
}

function processCombineHandler(
  handler: any,
  state: PlayerState,
  game: Game,
  primaryItem: any,
  secondaryItem: any,
  primaryId: ItemId,
  secondaryId: ItemId
): Effect[] {
  // Evaluate conditions
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;

  if (!outcome) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `Combining the ${primaryItem.name} with the ${secondaryItem.name} doesn't work.`
    }];
  }

  // Build effects (with media support)
  const effects: Effect[] = buildEffectsFromOutcome(outcome, primaryId, 'item');

  return effects;
}
