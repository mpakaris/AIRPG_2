/**
 * smart-messages.ts
 *
 * Generates context-aware messages when entities aren't found in current focus.
 * Provides helpful guidance instead of dead-end "not found" messages.
 */

import type { Game, PlayerState } from "@/lib/game/types";
import { findBestMatch } from "./name-matching";

export type SmartNotFoundResult = {
  found: false;
  message: string;
} | {
  found: true;
  entityId: string;
  category: 'inventory' | 'visible-item' | 'object';
};

/**
 * Generate a smart "not found" message that guides the player.
 *
 * If entity exists elsewhere (visible): Tell player where it is
 * If entity is hidden: Give vague hint about searching location
 * If entity doesn't exist: Generic not found message
 */
export function getSmartNotFoundMessage(
  searchTerm: string,
  state: PlayerState,
  game: Game,
  options: {
    searchInventory?: boolean;
    searchVisibleItems?: boolean;
    searchObjects?: boolean;
  } = { searchInventory: true, searchVisibleItems: true, searchObjects: true }
): SmartNotFoundResult {
  // First, try to find it anywhere (ignore focus boundaries)
  const globalMatch = findBestMatch(searchTerm, state, game, {
    ...options,
    requireFocus: false  // Search everywhere
  });

  if (!globalMatch) {
    // Entity doesn't exist or isn't visible anywhere
    return {
      found: false,
      message: `You don't see any "${searchTerm}" here. Perhaps you need to search the ${game.locations[state.currentLocationId]?.name || 'area'} more thoroughly, or it might be somewhere else entirely.`
    };
  }

  // Entity exists and is visible somewhere!
  const entityId = globalMatch.id;
  const { GameStateManager } = require("@/lib/game/engine");

  // Get entity name
  let entityName = searchTerm;
  if (globalMatch.category === 'object') {
    entityName = game.gameObjects[entityId as any]?.name || searchTerm;
  } else {
    entityName = game.items[entityId as any]?.name || searchTerm;
  }

  // Check if it's in inventory (shouldn't happen, but be safe)
  if (state.inventory.includes(entityId as any)) {
    return {
      found: false,
      message: `The ${entityName} is in your inventory, not here.`
    };
  }

  // Get parent location info
  const parent = GameStateManager.getParent(state, entityId);

  if (parent) {
    // Entity is inside another container/object
    const parentEntity = game.gameObjects[parent as any] || game.items[parent as any];
    const parentName = parentEntity?.name || "another location";

    return {
      found: false,
      message: `You remember seeing the ${entityName} at the ${parentName}. If you want to interact with it, you need to go there first.`
    };
  }

  // Entity is in the location but not in current focus
  const locationName = game.locations[state.currentLocationId]?.name || "this area";

  return {
    found: false,
    message: `You can see the ${entityName} elsewhere in the ${locationName}. If you want to interact with it, you need to go there first.`
  };
}

/**
 * Get parent location name for an entity
 */
export function getEntityLocationName(
  entityId: string,
  state: PlayerState,
  game: Game
): string {
  const { GameStateManager } = require("@/lib/game/engine");

  // Check if in inventory
  if (state.inventory.includes(entityId as any)) {
    return "your inventory";
  }

  // Check parent
  const parent = GameStateManager.getParent(state, entityId);
  if (parent) {
    const parentEntity = game.gameObjects[parent as any] || game.items[parent as any];
    return parentEntity?.name || "unknown location";
  }

  // In location
  const location = game.locations[state.currentLocationId];
  return location?.name || "this area";
}
