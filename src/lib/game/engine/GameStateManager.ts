/**
 * GameStateManager - Central Effect Reducer
 *
 * This is the SINGLE source of truth for all state mutations.
 * Every state change must go through the apply() method.
 *
 * Design principles:
 * 1. Pure function - no side effects
 * 2. Deterministic - same input = same output
 * 3. Atomic operations - each effect is independent
 * 4. Immutability - returns new state object
 */

import type { Effect, PlayerState, EntityRuntimeState, Message, Game, GameObject, GameObjectId } from '../types';
import { createMessage } from '@/lib/utils';

export class GameStateManager {
  /**
   * Apply a single effect to the player state
   * Returns a new PlayerState object (immutable)
   */
  static apply(effect: Effect, state: PlayerState, messages: Message[] = []): { state: PlayerState, messages: Message[] } {
    // Deep clone state to ensure immutability
    const newState = JSON.parse(JSON.stringify(state)) as PlayerState;
    const newMessages = [...messages];

    // Ensure world object exists
    if (!newState.world) {
      console.error('[GameStateManager.apply] WARNING: state.world is undefined! Initializing empty object.');
      newState.world = {};
    }

    try {
      switch (effect.type) {
        // ============================================================================
        // State and Flags
        // ============================================================================
        case 'SET_FLAG':
          newState.flags[effect.flag] = effect.value;
          break;

        case 'SET_ENTITY_STATE':
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          Object.assign(newState.world[effect.entityId], effect.patch);
          break;

        case 'SET_STATE_ID':
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].currentStateId = effect.to;
          break;

        case 'INC_COUNTER':
          if (!newState.counters) {
            newState.counters = {};
          }
          newState.counters[effect.key] = (newState.counters[effect.key] || 0) + (effect.by || 1);
          break;

        // ============================================================================
        // Inventory
        // ============================================================================
        case 'ADD_ITEM':
          if (!newState.inventory.includes(effect.itemId as any)) {
            newState.inventory.push(effect.itemId as any);
          }
          // Mark item as taken in world state
          if (!newState.world[effect.itemId]) {
            newState.world[effect.itemId] = {};
          }
          newState.world[effect.itemId].taken = true;
          break;

        case 'REMOVE_ITEM':
          newState.inventory = newState.inventory.filter(id => id !== effect.itemId);
          break;

        // ============================================================================
        // World Graph (Visibility)
        // ============================================================================
        case 'REVEAL_ENTITY':
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].isVisible = true;
          newState.world[effect.entityId].discovered = true;
          break;

        case 'HIDE_ENTITY':
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].isVisible = false;
          break;

        case 'LINK_ENABLE':
          // Optional: track active links for switch/door graphs
          if (!newState.counters) {
            newState.counters = {};
          }
          newState.counters[`link_${effect.linkId}`] = 1;
          break;

        case 'LINK_DISABLE':
          if (!newState.counters) {
            newState.counters = {};
          }
          newState.counters[`link_${effect.linkId}`] = 0;
          break;

        // ============================================================================
        // Container Relationships (NEW)
        // ============================================================================
        case 'SET_PARENT':
          // Set parent relationship for child
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].parentId = effect.parentId;

          // Add child to parent's containedEntities
          if (!newState.world[effect.parentId]) {
            newState.world[effect.parentId] = {};
          }
          if (!newState.world[effect.parentId].containedEntities) {
            newState.world[effect.parentId].containedEntities = [];
          }
          if (!newState.world[effect.parentId].containedEntities.includes(effect.entityId)) {
            newState.world[effect.parentId].containedEntities.push(effect.entityId);
          }
          break;

        case 'ADD_TO_CONTAINER':
          // Add entity to container's containedEntities
          if (!newState.world[effect.containerId]) {
            newState.world[effect.containerId] = {};
          }
          if (!newState.world[effect.containerId].containedEntities) {
            newState.world[effect.containerId].containedEntities = [];
          }
          if (!newState.world[effect.containerId].containedEntities!.includes(effect.entityId)) {
            newState.world[effect.containerId].containedEntities!.push(effect.entityId);
          }

          // Set parent on child
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].parentId = effect.containerId;
          break;

        case 'REMOVE_FROM_CONTAINER':
          // Remove entity from container's containedEntities
          if (newState.world[effect.containerId]?.containedEntities) {
            newState.world[effect.containerId].containedEntities =
              newState.world[effect.containerId].containedEntities!.filter(
                id => id !== effect.entityId
              );
          }

          // Clear parent on child
          if (newState.world[effect.entityId]) {
            delete newState.world[effect.entityId].parentId;
          }
          break;

        case 'REVEAL_FROM_PARENT':
          // Mark entity as visible and set parent relationship
          if (!newState.world[effect.entityId]) {
            newState.world[effect.entityId] = {};
          }
          newState.world[effect.entityId].isVisible = true;
          newState.world[effect.entityId].discovered = true;
          newState.world[effect.entityId].revealedBy = effect.parentId;
          newState.world[effect.entityId].parentId = effect.parentId;

          // Add to parent's containedEntities
          if (!newState.world[effect.parentId]) {
            newState.world[effect.parentId] = {};
          }
          if (!newState.world[effect.parentId].containedEntities) {
            newState.world[effect.parentId].containedEntities = [];
          }
          if (!newState.world[effect.parentId].containedEntities.includes(effect.entityId)) {
            newState.world[effect.parentId].containedEntities.push(effect.entityId);
          }
          break;

        // ============================================================================
        // Movement
        // ============================================================================
        case 'MOVE_TO_LOCATION':
          newState.currentLocationId = effect.locationId as any;
          break;

        case 'TELEPORT':
          newState.currentLocationId = effect.locationId as any;
          // Teleport bypasses normal checks, instant transfer
          break;

        case 'MOVE_TO_CELL':
          // For world/cell-based navigation
          newState.currentLocationId = effect.cellId as any;
          break;

        case 'ENTER_PORTAL':
          // Track portal usage
          if (!newState.world[effect.portalId]) {
            newState.world[effect.portalId] = {};
          }
          newState.world[effect.portalId].usedCount =
            (newState.world[effect.portalId].usedCount || 0) + 1;
          break;

        // ============================================================================
        // UI/Media Messages
        // ============================================================================
        case 'SHOW_MESSAGE':
          const speaker = effect.speaker || 'narrator';
          const content = effect.content || '';
          const messageType = effect.messageType || 'text';

          const message = createMessage(
            speaker as any,
            speaker === 'narrator' ? 'Narrator' :
            speaker === 'agent' ? 'Agent' :
            speaker === 'system' ? 'System' : speaker,
            content,
            messageType
          );

          // Note: Image resolution is handled by process-effects.ts via imageId

          newMessages.push(message);
          break;

        // ============================================================================
        // Timers (Optional - Advanced Feature)
        // ============================================================================
        case 'START_TIMER':
          // Store timer info in counters
          if (!newState.counters) {
            newState.counters = {};
          }
          newState.counters[`timer_${effect.timerId}_start`] = Date.now();
          newState.counters[`timer_${effect.timerId}_duration`] = effect.ms;
          // Note: Actual timer execution would need separate scheduler
          break;

        case 'CANCEL_TIMER':
          if (newState.counters) {
            delete newState.counters[`timer_${effect.timerId}_start`];
            delete newState.counters[`timer_${effect.timerId}_duration`];
          }
          break;

        // ============================================================================
        // Conversation/Interaction
        // ============================================================================
        case 'START_CONVERSATION':
          newState.activeConversationWith = effect.npcId as any;
          break;

        case 'END_CONVERSATION':
          newState.activeConversationWith = null;
          break;

        case 'START_INTERACTION':
          newState.interactingWithObject = effect.objectId as any;
          break;

        case 'END_INTERACTION':
          newState.interactingWithObject = null;
          break;

        case 'DEMOTE_NPC':
          if (!newState.world[effect.npcId]) {
            newState.world[effect.npcId] = {};
          }
          newState.world[effect.npcId].stage = 'demoted';
          newState.world[effect.npcId].importance = 'ambient';
          break;

        default:
          console.warn(`Unknown effect type:`, (effect as any).type);
      }

      return { state: newState, messages: newMessages };
    } catch (error) {
      console.error(`Error applying effect:`, effect, error);
      // Return original state on error to prevent corruption
      return { state, messages };
    }
  }

  /**
   * Apply multiple effects in sequence
   * This is the main entry point for command processing
   */
  static applyAll(effects: Effect[], state: PlayerState, messages: Message[] = []): { state: PlayerState, messages: Message[] } {
    console.log('[GameStateManager.applyAll] ========================================');
    console.log('[GameStateManager.applyAll] Applying', effects.length, 'effects:', effects.map(e => e.type));
    console.log('[GameStateManager.applyAll] INPUT STATE - Chalkboard isMoved:', state.world?.['obj_chalkboard_menu']?.isMoved);
    console.log('[GameStateManager.applyAll] INPUT STATE - Iron pipe isVisible:', state.world?.['item_iron_pipe']?.isVisible);

    let currentState = state;
    let currentMessages = messages;

    // Guard: ensure effects is always an array
    const effectsArray = Array.isArray(effects) ? effects : [];

    for (const effect of effectsArray) {
      console.log('[GameStateManager.applyAll] Processing effect:', effect.type);
      const result = GameStateManager.apply(effect, currentState, currentMessages);
      currentState = result.state;
      currentMessages = result.messages;

      // Log state after each effect
      if (effect.type === 'SET_ENTITY_STATE' || effect.type === 'REVEAL_FROM_PARENT' || effect.type === 'REVEAL_ENTITY') {
        console.log('[GameStateManager.applyAll] After', effect.type, '- Chalkboard isMoved:', currentState.world?.['obj_chalkboard_menu']?.isMoved);
        console.log('[GameStateManager.applyAll] After', effect.type, '- Iron pipe isVisible:', currentState.world?.['item_iron_pipe']?.isVisible);
      }
    }

    console.log('[GameStateManager.applyAll] OUTPUT STATE - Chalkboard isMoved:', currentState.world?.['obj_chalkboard_menu']?.isMoved);
    console.log('[GameStateManager.applyAll] OUTPUT STATE - Iron pipe isVisible:', currentState.world?.['item_iron_pipe']?.isVisible);
    console.log('[GameStateManager.applyAll] ========================================');

    return { state: currentState, messages: currentMessages };
  }

  /**
   * Helper: Get entity state with fallback to empty object
   */
  static getEntityState(state: PlayerState, entityId: string): EntityRuntimeState {
    return state.world[entityId] || {};
  }

  /**
   * Helper: Check if entity is visible
   */
  static isEntityVisible(state: PlayerState, entityId: string): boolean {
    const entityState = GameStateManager.getEntityState(state, entityId);
    return entityState.isVisible !== false; // Default to visible if not set
  }

  /**
   * Helper: Check flag value
   */
  static hasFlag(state: PlayerState, flag: string): boolean {
    return state.flags[flag] === true;
  }

  /**
   * Helper: Get all visible entities from a list
   */
  static getVisibleEntities(state: PlayerState, entityIds: string[]): string[] {
    return entityIds.filter(id => GameStateManager.isEntityVisible(state, id));
  }

  // ============================================================================
  // Parent-Child Relationship Helpers (NEW)
  // ============================================================================

  /**
   * Get the parent entity ID of a given entity
   */
  static getParent(state: PlayerState, entityId: string): string | null {
    const entityState = GameStateManager.getEntityState(state, entityId);
    return entityState.parentId || null;
  }

  /**
   * Get all ancestor IDs (parent, grandparent, etc.) up the chain
   * Returns array from immediate parent to root
   */
  static getAncestors(state: PlayerState, entityId: string): string[] {
    const ancestors: string[] = [];
    let currentId = entityId;
    let depth = 0;
    const MAX_DEPTH = 20; // Prevent infinite loops

    while (depth < MAX_DEPTH) {
      const parent = GameStateManager.getParent(state, currentId);
      if (!parent) break;
      ancestors.push(parent);
      currentId = parent;
      depth++;
    }

    return ancestors;
  }

  /**
   * Get direct children of an entity
   */
  static getChildren(state: PlayerState, parentId: string): string[] {
    const parentState = GameStateManager.getEntityState(state, parentId);
    return parentState.containedEntities || [];
  }

  /**
   * Get all descendants (children, grandchildren, etc.) recursively
   */
  static getDescendants(state: PlayerState, parentId: string): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>();
    const queue = [parentId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const children = GameStateManager.getChildren(state, current);
      for (const child of children) {
        descendants.push(child);
        queue.push(child);
      }
    }

    return descendants;
  }

  /**
   * Check if entity is in inventory
   */
  static isInInventory(state: PlayerState, entityId: string): boolean {
    return state.inventory.includes(entityId as any);
  }

  /**
   * Get the full containment chain for an entity
   * Example: ["loc_cafe_interior", "obj_wall_safe", "item_lockbox", "item_document"]
   * Returns from root (location) to entity itself
   */
  static getContainmentChain(state: PlayerState, entityId: string): string[] {
    const ancestors = GameStateManager.getAncestors(state, entityId);
    return [...ancestors.reverse(), entityId];
  }

  // ============================================================================
  // Accessibility Checking (NEW)
  // ============================================================================

  /**
   * Check if an entity is accessible (player can interact with it and its children)
   * An entity is accessible if:
   * 1. It is visible
   * 2. ALL parents in the chain grant access
   */
  static isAccessible(state: PlayerState, game: Game, entityId: string): boolean {
    if (entityId === 'item_iron_pipe') {
      console.log('[isAccessible] Checking item_iron_pipe');
    }

    // Check if entity is in inventory - always accessible
    if (GameStateManager.isInInventory(state, entityId)) {
      if (entityId === 'item_iron_pipe') console.log('[isAccessible] ✅ In inventory');
      return true;
    }

    // Entity must be visible
    const entityState = GameStateManager.getEntityState(state, entityId);
    if (entityId === 'item_iron_pipe') {
      console.log('[isAccessible] entityState:', entityState);
    }
    if (entityState.isVisible === false) {
      if (entityId === 'item_iron_pipe') console.log('[isAccessible] ❌ Not visible');
      return false;
    }

    // Check all parents in chain
    const ancestors = GameStateManager.getAncestors(state, entityId);
    if (entityId === 'item_iron_pipe') {
      console.log('[isAccessible] ancestors:', ancestors);
    }
    for (const ancestorId of ancestors) {
      if (!GameStateManager.parentGrantsAccess(state, game, ancestorId)) {
        if (entityId === 'item_iron_pipe') console.log('[isAccessible] ❌ Parent', ancestorId, 'does not grant access');
        return false;
      }
    }

    if (entityId === 'item_iron_pipe') console.log('[isAccessible] ✅ Accessible');
    return true;
  }

  /**
   * Check if a specific parent grants access to its children
   * Based on parent type and state:
   * - Movable objects: must be moved (isMoved: true)
   * - Containers: must be open (isOpen: true)
   * - Lockable: must be unlocked (isLocked: false)
   * - Breakable: must be broken (isBroken: true) OR other access granted
   */
  static parentGrantsAccess(state: PlayerState, game: Game, parentId: string): boolean {
    const parentState = GameStateManager.getEntityState(state, parentId);

    console.log('[parentGrantsAccess] Checking parentId:', parentId);
    console.log('[parentGrantsAccess] parentState:', parentState);

    // Parent must be visible
    if (parentState.isVisible === false) {
      console.log('[parentGrantsAccess] ❌ Parent not visible');
      return false;
    }

    // Get parent entity from game data
    const parentEntity = game.gameObjects?.[parentId as GameObjectId] ||
                         game.items?.[parentId as any] ||
                         null;

    if (!parentEntity) {
      // If parent not found in game data, assume access granted (might be location)
      console.log('[parentGrantsAccess] ✅ Parent not found in game data, granting access');
      return true;
    }

    const caps = parentEntity.capabilities;
    console.log('[parentGrantsAccess] caps:', caps);
    console.log('[parentGrantsAccess] has children:', !!parentEntity.children);

    // Check accessibility based on capabilities
    if (caps) {
      // Containers must be open
      if (caps.container && parentState.isOpen !== true) {
        console.log('[parentGrantsAccess] ❌ Container not open');
        return false;
      }

      // Lockable entities must be unlocked
      if (caps.lockable && parentState.isLocked === true) {
        console.log('[parentGrantsAccess] ❌ Entity locked');
        return false;
      }

      // Movable entities must be moved (to reveal children)
      if (caps.movable && parentEntity.children && parentState.isMoved !== true) {
        // Only block if entity has children (reveals things)
        console.log('[parentGrantsAccess] ❌ Movable entity not moved (has children, isMoved:', parentState.isMoved, ')');
        return false;
      }

      // Breakable entities: children accessible if broken OR if other access granted
      // (e.g., coffee machine must be broken to reveal key inside)
      if (caps.breakable && parentEntity.children?.items) {
        // Exception: movable entities grant access when moved (chalkboard reveals pipe when moved)
        const isMovedAndGrantsAccess = caps.movable && parentState.isMoved === true;

        // If it's a breakable container with hidden items, must be broken (unless moved)
        if (parentState.isBroken !== true && !caps.openable && !isMovedAndGrantsAccess) {
          console.log('[parentGrantsAccess] ❌ Breakable entity not broken (and not moved)');
          return false;
        }
      }
    }

    console.log('[parentGrantsAccess] ✅ Access granted');
    return true;
  }

  /**
   * Get the accessibility chain for an entity
   * Returns array of checks for each ancestor
   */
  static getAccessibilityChain(state: PlayerState, game: Game, entityId: string): Array<{
    entityId: string;
    accessible: boolean;
    reason?: string;
  }> {
    const chain: Array<{ entityId: string; accessible: boolean; reason?: string }> = [];
    const ancestors = GameStateManager.getAncestors(state, entityId);

    for (const ancestorId of ancestors) {
      const grantsAccess = GameStateManager.parentGrantsAccess(state, game, ancestorId);
      const parentState = GameStateManager.getEntityState(state, ancestorId);

      let reason: string | undefined;
      if (!grantsAccess) {
        const parentEntity = game.gameObjects?.[ancestorId as GameObjectId];
        if (parentEntity?.capabilities?.container && parentState.isOpen !== true) {
          reason = 'parent_closed';
        } else if (parentEntity?.capabilities?.lockable && parentState.isLocked === true) {
          reason = 'parent_locked';
        } else if (parentEntity?.capabilities?.movable && parentState.isMoved !== true) {
          reason = 'parent_not_moved';
        } else if (parentEntity?.capabilities?.breakable && parentState.isBroken !== true) {
          reason = 'parent_not_broken';
        } else {
          reason = 'not_visible';
        }
      }

      chain.push({
        entityId: ancestorId,
        accessible: grantsAccess,
        reason
      });
    }

    return chain;
  }

  /**
   * Get the first blocking parent in the chain (if any)
   * Returns null if all parents grant access
   */
  static getBlockingParent(state: PlayerState, game: Game, entityId: string): string | null {
    const ancestors = GameStateManager.getAncestors(state, entityId);

    for (const ancestorId of ancestors) {
      if (!GameStateManager.parentGrantsAccess(state, game, ancestorId)) {
        return ancestorId;
      }
    }

    return null;
  }
}
