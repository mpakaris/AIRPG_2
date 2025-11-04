/**
 * VisibilityResolver - Parent-Child and Rule-Based Visibility (REWRITTEN)
 *
 * This service handles visibility and accessibility with robust container support.
 * Supports up to 10+ levels of nested containers.
 *
 * Design principles:
 * 1. Use runtime parent-child relationships from GameStateManager
 * 2. Hierarchical enforcement - parent state controls children
 * 3. Efficient recursive computation
 * 4. No scattered visibility toggles
 */

import type { Game, PlayerState, GameObject } from '../types';
import { GameStateManager } from './GameStateManager';

export type VisibilityContext = {
  locationId: string;
  inventory: string[];
  flags: Record<string, boolean>;
};

export class VisibilityResolver {
  /**
   * Get all entities that should be visible AND accessible in current context
   * This is the main entry point for getting what the player can see/interact with
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

    // =========================================================================
    // 1. Get ALL objects and check visibility/accessibility
    // =========================================================================
    for (const objectId in game.gameObjects) {
      const obj = game.gameObjects[objectId as any];

      // Skip personal equipment (phone, badge, etc.) - they're never in scene listings
      if (obj?.personal === true) {
        continue;
      }

      // Check if object is in current location (initial placement)
      const isInLocation = currentLocation.objects?.includes(objectId as any);

      // Check if object has been revealed (via REVEAL_ENTITY or REVEAL_FROM_PARENT)
      const entityState = GameStateManager.getEntityState(state, objectId);
      const hasBeenRevealed = entityState.isVisible === true;

      if (objectId === 'obj_painting' || objectId === 'obj_sd_card') {
        console.log(`[VisibilityResolver] ${objectId} DEBUG:`, {
          isInLocation,
          hasBeenRevealed,
          entityState,
          currentLocationObjects: currentLocation.objects
        });
      }

      // Object is potentially visible if in location OR revealed
      if (isInLocation || hasBeenRevealed) {
        // Check if accessible (parent chain grants access)
        const isAccessible = GameStateManager.isAccessible(state, game, objectId);

        if (objectId === 'obj_brown_notebook') {
          console.log('[VisibilityResolver] NOTEBOOK accessibility:', {
            isAccessible,
            entityState: GameStateManager.getEntityState(state, objectId)
          });
        }

        if (isAccessible) {
          visibleObjects.push(objectId);

          // Recursively get accessible children
          const children = VisibilityResolver.getAccessibleChildren(objectId, state, game);

          if (objectId === 'obj_brown_notebook') {
            console.log('[VisibilityResolver] NOTEBOOK children:', children);
          }

          visibleObjects.push(...children.objects);
          visibleItems.push(...children.items);
        }
      }
    }

    // =========================================================================
    // 2. Get NPCs in current location
    // =========================================================================
    for (const npcId of currentLocation.npcs || []) {
      const isAccessible = GameStateManager.isAccessible(state, game, npcId);
      if (isAccessible) {
        visibleNpcs.push(npcId);
      }
    }

    // =========================================================================
    // 3. Get portals in current location
    // =========================================================================
    if (currentLocation.exitPortals) {
      for (const portalId of currentLocation.exitPortals) {
        const isAccessible = GameStateManager.isAccessible(state, game, portalId);
        if (isAccessible) {
          visiblePortals.push(portalId);
        }
      }
    }

    // =========================================================================
    // 4. Get items (in inventory OR revealed and accessible in world)
    // =========================================================================
    for (const itemId in game.items) {
      // In inventory - always visible
      if (state.inventory.includes(itemId as any)) {
        if (!visibleItems.includes(itemId)) {
          visibleItems.push(itemId);
        }
      }
      // OR revealed and accessible in world
      else if (!visibleItems.includes(itemId)) {
        const itemState = GameStateManager.getEntityState(state, itemId);
        const isRevealed = itemState.isVisible === true;
        const notTaken = !itemState.taken;
        const isAccessible = GameStateManager.isAccessible(state, game, itemId);

        if (itemId === 'item_sd_card') {
        }

        if (isRevealed && notTaken && isAccessible) {
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
   * Check if a specific entity should be visible AND accessible
   * Uses GameStateManager's robust accessibility checking
   */
  static isEntityVisibleAndAccessible(
    state: PlayerState,
    game: Game,
    entityId: string
  ): boolean {
    // Check if in inventory - always accessible
    if (GameStateManager.isInInventory(state, entityId)) {
      return true;
    }

    // Check if visible
    const entityState = GameStateManager.getEntityState(state, entityId);
    if (entityState.isVisible === false) {
      return false;
    }

    // Check if accessible (parent chain grants access)
    return GameStateManager.isAccessible(state, game, entityId);
  }

  /**
   * Get accessible children of an entity (recursively)
   * Only returns children that are:
   * 1. Visible
   * 2. Parent grants access
   * 3. All ancestors in chain grant access
   */
  static getAccessibleChildren(
    parentId: string,
    state: PlayerState,
    game: Game
  ): {
    objects: string[];
    items: string[];
  } {
    const accessibleObjects: string[] = [];
    const accessibleItems: string[] = [];


    // Check if parent grants access
    const grantsAccess = GameStateManager.parentGrantsAccess(state, game, parentId);
    if (!grantsAccess) {
      return { objects: [], items: [] };
    }

    // Get direct children from runtime state
    const children = GameStateManager.getChildren(state, parentId);

    for (const childId of children) {

      // Check if child is accessible
      const isAccessible = GameStateManager.isAccessible(state, game, childId);
      if (!isAccessible) {
        continue;
      }

      // Check if child is visible
      const childState = GameStateManager.getEntityState(state, childId);
      if (childState.isVisible === false) {
        continue;
      }

      // Determine if child is object or item
      if (game.gameObjects[childId as any]) {
        accessibleObjects.push(childId);

        // Recursively get children of this object
        const grandchildren = VisibilityResolver.getAccessibleChildren(childId, state, game);
        accessibleObjects.push(...grandchildren.objects);
        accessibleItems.push(...grandchildren.items);
      } else if (game.items[childId as any]) {
        accessibleItems.push(childId);
      } else {
      }
    }

    return { objects: accessibleObjects, items: accessibleItems };
  }

  /**
   * Get the full containment chain for an entity
   * Example: ["loc_cafe_interior", "obj_wall_safe", "item_lockbox", "item_envelope"]
   * Delegates to GameStateManager
   */
  static getContainmentChain(state: PlayerState, game: Game, entityId: string): string[] {
    return GameStateManager.getContainmentChain(state, entityId);
  }

  /**
   * Find parent entity using runtime state
   * Delegates to GameStateManager
   */
  static findParent(entityId: string, state: PlayerState): string | null {
    return GameStateManager.getParent(state, entityId);
  }

  /**
   * Check if parent is accessible (visible and grants access)
   * Delegates to GameStateManager
   */
  static isParentAccessible(parentId: string, state: PlayerState, game: Game): boolean {
    // Parent must be visible
    const parentState = GameStateManager.getEntityState(state, parentId);
    if (parentState.isVisible === false) {
      return false;
    }

    // Parent must grant access
    return GameStateManager.parentGrantsAccess(state, game, parentId);
  }

  /**
   * Get visible children of an entity (legacy method - use getAccessibleChildren instead)
   */
  static getVisibleChildren(
    parentId: string,
    state: PlayerState,
    game: Game
  ): {
    objects: string[];
    items: string[];
  } {
    return VisibilityResolver.getAccessibleChildren(parentId, state, game);
  }

  /**
   * Get container contents if accessible
   */
  static getContainerContents(
    containerId: string,
    state: PlayerState,
    game: Game
  ): {
    objects: string[];
    items: string[];
  } {
    const container = game.gameObjects[containerId as any];
    if (!container) {
      return { objects: [], items: [] };
    }

    // Container must grant access
    if (!GameStateManager.parentGrantsAccess(state, game, containerId)) {
      return { objects: [], items: [] };
    }

    return VisibilityResolver.getAccessibleChildren(containerId, state, game);
  }

  /**
   * Check if an entity is in player's inventory
   */
  static isInInventory(entityId: string, state: PlayerState): boolean {
    return GameStateManager.isInInventory(state, entityId);
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

    // Check if in a container (has parent)
    const parent = GameStateManager.getParent(state, entityId);
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

  /**
   * Get blocking parent (if entity is inaccessible)
   * Returns the first parent that blocks access, or null if accessible
   */
  static getBlockingParent(entityId: string, state: PlayerState, game: Game): string | null {
    return GameStateManager.getBlockingParent(state, game, entityId);
  }

  /**
   * Get full accessibility report for debugging
   */
  static getAccessibilityReport(entityId: string, state: PlayerState, game: Game): {
    isAccessible: boolean;
    blockingParent: string | null;
    chain: Array<{ entityId: string; accessible: boolean; reason?: string }>;
  } {
    return {
      isAccessible: GameStateManager.isAccessible(state, game, entityId),
      blockingParent: GameStateManager.getBlockingParent(state, game, entityId),
      chain: GameStateManager.getAccessibilityChain(state, game, entityId),
    };
  }
}
