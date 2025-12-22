/**
 * ZoneManager - Central Zone Access Validation
 *
 * Handles all zone-based access control for objects, items, and NPCs.
 * This replaces scattered requireFocus logic across handlers with a single,
 * authoritative access validation system.
 *
 * Core Principle:
 * - Zone = WHERE you physically are (spatial position)
 * - Focus = WHAT you're examining closely (optional attention layer)
 */

import type { PlayerState, Game, GameObjectId, ItemId, NpcId, ZoneId, Location } from '../types';
import { GameStateManager } from './GameStateManager';

export interface AccessResult {
  allowed: boolean;
  reason?: string;  // Simple reason for debugging/fallback (e.g., "out_of_zone", "container_closed")
  targetName?: string;  // Entity name for AI message generation
}

export class ZoneManager {
  /**
   * Helper: Recursively check if a container or any of its parents is in the current zone
   */
  private static isContainerInZoneRecursive(
    containerId: GameObjectId,
    currentZone: ZoneId,
    location: Location,
    game: Game
  ): boolean {
    const container = game.gameObjects[containerId];
    if (!container) return false;

    const zone = location.zones?.find(z => z.id === currentZone);

    // Check if this container is in the zone
    const containerZone = this.getEntityZone(containerId, 'object', game);
    if (containerZone === currentZone) return true;
    if (zone && zone.objectIds.includes(containerId)) return true;

    // If this container has a parent, check recursively
    if (container.parentId) {
      return this.isContainerInZoneRecursive(
        container.parentId as GameObjectId,
        currentZone,
        location,
        game
      );
    }

    // No parent and not in zone - not accessible
    return false;
  }

  /**
   * Check if player can access a target entity
   * This is the SINGLE source of truth for access validation
   */
  static canAccess(
    targetId: GameObjectId | ItemId | NpcId,
    targetType: 'object' | 'item' | 'npc',
    state: PlayerState,
    game: Game
  ): AccessResult {
    // RULE 1: Items in inventory are always accessible
    if (targetType === 'item' && state.inventory.includes(targetId as ItemId)) {
      return { allowed: true };
    }

    // RULE 2: Get target zone
    const targetZone = this.getEntityZone(targetId, targetType, game);

    // RULE 3: Personal equipment is always accessible
    if (targetZone === 'personal') {
      return { allowed: true };
    }

    // RULE 4: If no zone system in location (Chapter 0 compatibility), allow access
    const location = game.locations[state.currentLocationId];
    if (!location.zones || location.zones.length === 0) {
      // Compact mode or no zones defined - everything accessible
      return { allowed: true };
    }

    // RULE 5: Check if target is in current zone
    const currentZone = state.currentZoneId;

    if (!currentZone) {
      // Player has no zone set - should not happen, but allow for now
      console.warn('[ZoneManager] Player has no currentZoneId set');
      return { allowed: true };
    }

    if (targetZone === currentZone) {
      // Target is in player's current zone - accessible
      return { allowed: true };
    }

    // RULE 6: Special case - items inside containers
    if (targetType === 'item') {
      const item = game.items[targetId as ItemId];
      const itemState = GameStateManager.getEntityState(state, targetId);

      // Check if item is inside a container
      if (itemState.parentId) {
        const containerId = itemState.parentId;
        const container = game.gameObjects[containerId as GameObjectId];
        const containerState = GameStateManager.getEntityState(state, containerId);

        if (!container) {
          return { allowed: false, reason: 'not_accessible', targetName: item.name };
        }

        // Container (or any of its parents) must be in current zone - CHECK RECURSIVELY
        const containerInZone = this.isContainerInZoneRecursive(
          containerId as GameObjectId,
          currentZone,
          location,
          game
        );

        if (!containerInZone) {
          return {
            allowed: false,
            reason: 'out_of_zone',
            targetName: item.name
          };
        }

        // Container must be open (or not openable, meaning items are just revealed)
        if (container.capabilities?.openable && !containerState.isOpen) {
          return {
            allowed: false,
            reason: 'container_closed',
            targetName: item.name
          };
        }

        // Container is in zone and accessible - item is accessible
        return { allowed: true };
      }
    }

    // RULE 6.5: Special case - objects without zones that are listed in current zone's objectIds
    // Check this FIRST before checking parent containers
    if (targetType === 'object' && !targetZone) {
      const zone = location.zones?.find(z => z.id === currentZone);
      if (zone && zone.objectIds.includes(targetId as GameObjectId)) {
        // Object is explicitly listed in current zone's objectIds - accessible
        return { allowed: true };
      }

      // RULE 6.6: Objects inside containers (like pants inside trash bag)
      const targetObj = game.gameObjects[targetId as GameObjectId];
      const objState = GameStateManager.getEntityState(state, targetId);

      // Check if object is inside a container (and NOT listed in zone.objectIds above)
      if (targetObj?.parentId) {
        const containerId = targetObj.parentId;
        const container = game.gameObjects[containerId as GameObjectId];
        const containerState = GameStateManager.getEntityState(state, containerId);

        if (!container) {
          return { allowed: false, reason: 'not_accessible', targetName: targetObj.name };
        }

        // Container (or any of its parents) must be in current zone - CHECK RECURSIVELY
        const containerInZone = this.isContainerInZoneRecursive(
          containerId as GameObjectId,
          currentZone,
          location,
          game
        );

        if (!containerInZone) {
          return {
            allowed: false,
            reason: 'out_of_zone',
            targetName: targetObj.name
          };
        }

        // Container must be open/broken (or not openable/breakable, meaning objects are just revealed)
        const requiresOpening = container.capabilities?.openable || container.capabilities?.breakable;
        if (requiresOpening && !containerState.isOpen && !containerState.isBroken) {
          return {
            allowed: false,
            reason: 'container_closed',
            targetName: targetObj.name
          };
        }

        // Container is in zone and accessible - object is accessible
        return { allowed: true };
      }
    }

    // RULE 7: Target is in different zone - not accessible
    const targetEntity = this.getEntity(targetId, targetType, game);
    const targetName = targetEntity?.name || 'that';

    return {
      allowed: false,
      reason: 'out_of_zone',
      targetName: targetName
    };
  }

  /**
   * Get the zone ID for an entity
   */
  static getEntityZone(
    entityId: GameObjectId | ItemId | NpcId,
    entityType: 'object' | 'item' | 'npc',
    game: Game
  ): ZoneId | 'personal' | null {
    if (entityType === 'object') {
      const obj = game.gameObjects[entityId as GameObjectId];
      return obj?.zone || null;
    }

    if (entityType === 'item') {
      const item = game.items[entityId as ItemId];
      return item?.zone || null;
    }

    if (entityType === 'npc') {
      const npc = game.npcs[entityId as NpcId];
      return npc?.zone || null;
    }

    return null;
  }

  /**
   * Get entity by ID and type
   */
  private static getEntity(
    entityId: GameObjectId | ItemId | NpcId,
    entityType: 'object' | 'item' | 'npc',
    game: Game
  ): { name: string } | null {
    if (entityType === 'object') return game.gameObjects[entityId as GameObjectId];
    if (entityType === 'item') return game.items[entityId as ItemId];
    if (entityType === 'npc') return game.npcs[entityId as NpcId];
    return null;
  }

  /**
   * Get human-readable zone title
   */
  private static getZoneTitle(zoneId: ZoneId | 'personal' | null, location: Location): string {
    if (!zoneId || zoneId === 'personal') return 'that area';

    const zone = location.zones?.find(z => z.id === zoneId);
    return zone?.title || 'that area';
  }

  /**
   * Get the default zone for a location
   */
  static getDefaultZone(location: Location): ZoneId | null {
    if (!location.zones || location.zones.length === 0) return null;

    const defaultZone = location.zones.find(z => z.isDefault);
    return defaultZone?.id || location.zones[0].id;
  }

  /**
   * Check if player can navigate to a zone from their current zone
   */
  static canNavigateToZone(
    targetZoneId: ZoneId,
    currentZoneId: ZoneId | null,
    location: Location
  ): AccessResult {
    if (!location.zones || location.zones.length === 0) {
      return { allowed: true };
    }

    const targetZone = location.zones.find(z => z.id === targetZoneId);
    if (!targetZone) {
      return { allowed: false, reason: 'That location is not accessible' };
    }

    // If no current zone, can navigate to default zone
    if (!currentZoneId) {
      const defaultZone = this.getDefaultZone(location);
      if (targetZoneId === defaultZone) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'You need to start at the default location first' };
    }

    // Check if target zone is accessible from current zone
    // In sprawling mode: must be direct child of current zone
    // In compact mode: all zones accessible
    const spatialMode = location.spatialMode || 'compact';

    if (spatialMode === 'compact') {
      // Compact mode: can navigate to any zone
      return { allowed: true };
    }

    // Sprawling mode: check parent hierarchy
    if (targetZone.parent === currentZoneId) {
      // Direct child - accessible
      return { allowed: true };
    }

    // Check if current zone is child of target (going back)
    const currentZone = location.zones.find(z => z.id === currentZoneId);
    if (currentZone?.parent === targetZoneId) {
      // Going back to parent - accessible
      return { allowed: true };
    }

    // Check if they share a parent (siblings)
    if (currentZone?.parent && targetZone.parent === currentZone.parent) {
      // Siblings - accessible
      return { allowed: true };
    }

    // Check if target has no parent (top-level zone) and we're going back
    if (!targetZone.parent && currentZone) {
      // Going back to top level - accessible
      return { allowed: true };
    }

    // Otherwise, need to navigate through parent first
    const parentZone = location.zones.find(z => z.id === targetZone.parent);
    const parentTitle = parentZone?.title || 'the parent area';

    return {
      allowed: false,
      reason: `You need to go to ${parentTitle} first`
    };
  }

  /**
   * Get all objects accessible in current zone
   */
  static getAccessibleObjects(state: PlayerState, location: Location): GameObjectId[] {
    const currentZone = state.currentZoneId;

    if (!currentZone || !location.zones || location.zones.length === 0) {
      // No zone system - all objects accessible
      return location.objects;
    }

    const zone = location.zones.find(z => z.id === currentZone);
    return zone?.objectIds || [];
  }
}
