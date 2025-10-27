/**
 * VisibilityResolver - Parent-Child and Rule-Based Visibility
 *
 * This service handles:
 * 1. Parent-child visibility relationships
 * 2. Container gating (children hidden until parent opened)
 * 3. Spatial visibility (objects in location)
 * 4. Computed visibility based on game rules
 *
 * Design principles:
 * 1. Central visibility logic - no scattered toggles
 * 2. Hierarchical enforcement - parent state controls children
 * 3. Efficient computation - only recalculate when needed
 */

import type { Game, PlayerState, EntityBase, GameObject, Item } from '../types';
import { GameStateManager } from './GameStateManager';

export type VisibilityContext = {
  locationId: string;
  inventory: string[];
  flags: Record<string, boolean>;
};

export class VisibilityResolver {
  /**
   * Get all entities that should be visible in current context
   */
  static getVisibleEntities(state: PlayerState, game: Game): {
    objects: string[];
    items: string[];
    npcs: string[];
    portals: string[];
  } {
    const visibleObjects: string[] = [];
    const visibleItems: string[] = [];
    const visibleNpcs: string[] = [];
    const visiblePortals: string[] = [];

    const currentLocation = game.locations[state.currentLocationId];

    if (!currentLocation) {
      return { objects: [], items: [], npcs: [], portals: [] };
    }

    // 1. Get objects in current location
    // IMPORTANT: Check ALL game objects, not just location.objects
    // This allows dynamically revealed objects (like wall safe) to be visible
    for (const objectId in game.gameObjects) {
      const obj = game.gameObjects[objectId as any];

      // Only include objects that are in this location OR have been revealed
      const isInLocation = currentLocation.objects?.includes(objectId as any);
      const entityState = GameStateManager.getEntityState(state, objectId);
      const hasBeenRevealed = entityState.isVisible === true;

      if ((isInLocation || hasBeenRevealed) && VisibilityResolver.isEntityVisibleInContext(objectId, state, game)) {
        visibleObjects.push(objectId);

        // Check for child objects/items
        const children = VisibilityResolver.getVisibleChildren(objectId, state, game);
        visibleObjects.push(...children.objects);
        visibleItems.push(...children.items);
      }
    }

    // 2. Get NPCs in current location
    for (const npcId of currentLocation.npcs || []) {
      if (VisibilityResolver.isEntityVisibleInContext(npcId, state, game)) {
        visibleNpcs.push(npcId);
      }
    }

    // 3. Get portals in current location
    if (currentLocation.exitPortals) {
      for (const portalId of currentLocation.exitPortals) {
        if (VisibilityResolver.isEntityVisibleInContext(portalId, state, game)) {
          visiblePortals.push(portalId);
        }
      }
    }

    // 4. Items are visible if in inventory OR revealed in world state
    for (const itemId in game.items) {
      const item = game.items[itemId as any];

      // In inventory - always visible
      if (state.inventory.includes(itemId as any)) {
        if (!visibleItems.includes(itemId)) {
          visibleItems.push(itemId);
        }
      }
      // OR has been revealed and not taken yet
      else if (!visibleItems.includes(itemId)) {
        const itemState = GameStateManager.getEntityState(state, itemId);
        if (itemState.isVisible === true && !itemState.taken) {
          // Item is visible and accessible
          visibleItems.push(itemId);
        }
      }
    }

    return {
      objects: visibleObjects,
      items: visibleItems,
      npcs: visibleNpcs,
      portals: visiblePortals,
    };
  }

  /**
   * Check if a specific entity should be visible
   */
  static isEntityVisibleInContext(entityId: string, state: PlayerState, game: Game): boolean {
    const entityState = GameStateManager.getEntityState(state, entityId);

    // If explicitly hidden, always invisible
    if (entityState.isVisible === false) {
      return false;
    }

    // Check parent gating
    const parent = VisibilityResolver.findParent(entityId, game);
    if (parent) {
      const isParentAccessible = VisibilityResolver.isParentAccessible(parent, state, game);
      if (!isParentAccessible) {
        return false;
      }
    }

    // Default to visible if no explicit hide
    return true;
  }

  /**
   * Find parent entity (if entity is a child)
   */
  static findParent(entityId: string, game: Game): string | null {
    // Check all objects for children
    for (const objectId in game.gameObjects) {
      const obj = game.gameObjects[objectId as any];

      if (obj.children?.objects?.includes(entityId)) {
        return objectId;
      }

      if (obj.children?.items?.includes(entityId)) {
        return objectId;
      }
    }

    return null;
  }

  /**
   * Check if parent is accessible (visible and open if container)
   */
  static isParentAccessible(parentId: string, state: PlayerState, game: Game): boolean {
    const parentState = GameStateManager.getEntityState(state, parentId);

    // Parent must be visible
    if (parentState.isVisible === false) {
      return false;
    }

    const parent = game.gameObjects[parentId as any];

    // If parent is a container, it must be open
    if (parent?.capabilities?.container) {
      if (parentState.isOpen !== true) {
        return false;
      }
    }

    // If parent is movable, check if it's been moved (reveals children)
    if (parent?.capabilities?.movable) {
      // Some movable objects reveal children only after being moved
      // This is optional - can be configured per object
      return true;
    }

    return true;
  }

  /**
   * Get visible children of an entity
   */
  static getVisibleChildren(parentId: string, state: PlayerState, game: Game): {
    objects: string[];
    items: string[];
  } {
    const visibleObjects: string[] = [];
    const visibleItems: string[] = [];

    const parent = game.gameObjects[parentId as any];
    if (!parent) {
      return { objects: visibleObjects, items: visibleItems };
    }

    // Check if parent is accessible
    if (!VisibilityResolver.isParentAccessible(parentId, state, game)) {
      return { objects: visibleObjects, items: visibleItems };
    }

    // Get child objects
    if (parent.children?.objects) {
      for (const childId of parent.children.objects) {
        if (VisibilityResolver.isEntityVisibleInContext(childId, state, game)) {
          visibleObjects.push(childId);
        }
      }
    }

    // Get child items
    if (parent.children?.items) {
      for (const childId of parent.children.items) {
        if (VisibilityResolver.isEntityVisibleInContext(childId, state, game)) {
          visibleItems.push(childId);
        }
      }
    }

    return { objects: visibleObjects, items: visibleItems };
  }

  /**
   * Recompute visibility after state changes
   * Call this after applying effects that might change visibility
   */
  static recomputeVisibility(state: PlayerState, game: Game): PlayerState {
    // This is an optimization - only recalculate if needed
    // For now, we compute visibility on-demand rather than storing it
    return state;
  }

  /**
   * Get all entities accessible from a specific container
   */
  static getContainerContents(containerId: string, state: PlayerState, game: Game): {
    objects: string[];
    items: string[];
  } {
    const container = game.gameObjects[containerId as any];
    if (!container) {
      return { objects: [], items: [] };
    }

    const containerState = GameStateManager.getEntityState(state, containerId);

    // Container must be open to see contents
    if (container.capabilities?.container && containerState.isOpen !== true) {
      return { objects: [], items: [] };
    }

    return VisibilityResolver.getVisibleChildren(containerId, state, game);
  }

  /**
   * Check if an entity is in player's inventory
   */
  static isInInventory(entityId: string, state: PlayerState): boolean {
    return state.inventory.includes(entityId as any);
  }

  /**
   * Get location of an entity (where it is in the world)
   */
  static getEntityLocation(entityId: string, state: PlayerState, game: Game): {
    type: 'inventory' | 'container' | 'location' | 'hidden';
    containerId?: string;
    locationId?: string;
  } {
    // Check inventory first
    if (VisibilityResolver.isInInventory(entityId, state)) {
      return { type: 'inventory' };
    }

    // Check if in a container
    const parent = VisibilityResolver.findParent(entityId, game);
    if (parent) {
      return { type: 'container', containerId: parent };
    }

    // Check if in current location
    const currentLocation = game.locations[state.currentLocationId];
    if (currentLocation?.objects?.includes(entityId as any)) {
      return { type: 'location', locationId: state.currentLocationId };
    }

    return { type: 'hidden' };
  }
}
