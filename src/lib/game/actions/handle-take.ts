
/**
 * handle-take - NEW ARCHITECTURE
 *
 * Handles taking (picking up) items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTargetName = normalizeName(targetName);

  if (!normalizedTargetName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: 'You need to specify what to take.'
    }];
  }

  // Helper function for robust name matching
  const matchesName = (item: any, searchName: string): boolean => {
    if (!item) return false;

    // Try matching against the item name
    if (normalizeName(item.name).includes(searchName)) return true;

    // Try matching against alternate names
    if (item.alternateNames) {
      const matchesAlt = item.alternateNames.some((altName: string) =>
        normalizeName(altName).includes(searchName)
      );
      if (matchesAlt) return true;
    }

    // FALLBACK: Try matching against the item ID (for AI mistakes)
    const itemIdNormalized = normalizeName(item.id);
    if (itemIdNormalized === searchName || itemIdNormalized.includes(searchName) || searchName.includes(itemIdNormalized)) {
      return true;
    }

    // Also try without the prefix and underscores
    const idWithoutPrefix = item.id.replace(/^item_/, '').replace(/_/g, '').toLowerCase();
    const searchWithoutPrefix = searchName.replace(/^item_/, '').replace(/_/g, '');
    if (idWithoutPrefix === searchWithoutPrefix || idWithoutPrefix.includes(searchWithoutPrefix) || searchWithoutPrefix.includes(idWithoutPrefix)) {
      return true;
    }

    return false;
  };

  // 1. Find item in visible entities
  const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
  const itemId = visibleEntities.items.find(id =>
    matchesName(game.items[id as any], normalizedTargetName)
  );

  if (!itemId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" here to take.`
    }];
  }

  const item = game.items[itemId as any];
  if (!item) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" here to take.`
    }];
  }

  // 2. Check if already in inventory
  if (state.inventory.includes(itemId as any)) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You already have the ${item.name}.`
    }];
  }

  // 3. Check if item is takable
  if (!item.capabilities?.isTakable) {
    const handler = HandlerResolver.getEffectiveHandler(item, 'take', state);
    const failMessage = handler?.fail?.message || `You can't take the ${item.name}.`;
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: failMessage
    }];
  }

  // 4. Get onTake handler if exists
  const handler = HandlerResolver.getEffectiveHandler(item, 'take', state);
  const successMessage = handler?.success?.message || `You take the ${item.name}.`;

  // 5. Build effects
  const effects: Effect[] = [];

  // If item has a parent container, remove it from that container first
  const itemState = state.world?.[itemId];
  if (itemState?.parentId) {
    effects.push({
      type: 'REMOVE_FROM_CONTAINER',
      entityId: itemId,
      containerId: itemState.parentId
    });
  }

  effects.push({
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: successMessage
  });

  effects.push({
    type: 'ADD_ITEM',
    itemId: itemId
  });

  // Add handler effects if present
  if (handler?.success?.effects) {
    effects.push(...handler.success.effects);
  }

  return effects;
}
