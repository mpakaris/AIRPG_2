/**
 * HandlerResolver - StateMap Composition and Handler Resolution
 *
 * This service resolves the effective handler for an entity action,
 * taking into account stateMap overrides and archetype defaults.
 *
 * Resolution priority:
 * 1. stateMap[currentStateId].overrides.onVerb (highest)
 * 2. entity.handlers.onVerb
 * 3. archetype.handlers.onVerb
 * 4. fallback message (lowest)
 *
 * Design principles:
 * 1. Deterministic - same state always gives same handler
 * 2. Composable - stateMap overrides layer on top
 * 3. Explicit - no magic, clear resolution order
 *
 * CRITICAL: Conditional Handler Arrays
 * =====================================
 * Handlers can be either a single Rule or an array of conditional Rules:
 *
 * Single handler:
 *   onExamine: {
 *     success: { message: "...", media: {...} }
 *   }
 *
 * Conditional handler array:
 *   onExamine: [
 *     { conditions: [{type: 'HAS_ITEM', itemId: 'key'}], success: {...} },
 *     { conditions: [{type: 'FLAG', flag: 'broken'}], success: {...} },
 *     { conditions: [], success: {...} }  // default fallback
 *   ]
 *
 * When getEffectiveHandler encounters an array, it MUST resolve which handler
 * to use by evaluating conditions. This is critical for:
 * - Containers showing different states (with item vs empty)
 * - Progressive interactions (door states, reading stages)
 * - Conditional media (different images based on game state)
 *
 * DO NOT return the raw array - always resolve to a single Rule or undefined.
 * Handlers are evaluated in order, first matching condition wins.
 */

import type { Game, GameObject, Item, NPC, Portal, Rule, Handlers, PlayerState } from '../types';
import { GameStateManager } from './GameStateManager';
import { Validator } from './Validator';

export type EntityWithHandlers = GameObject | Item | NPC | Portal;

export class HandlerResolver {
  /**
   * Get the effective handler for a specific action (verb)
   * This takes into account stateMap overrides and resolves conditional handler arrays
   */
  static getEffectiveHandler(
    entity: EntityWithHandlers,
    verb: string,
    state: PlayerState,
    game?: Game
  ): Rule | undefined {
    const entityState = GameStateManager.getEntityState(state, entity.id);
    const currentStateId = entityState.currentStateId || 'default';

    // 1. Check stateMap override (highest priority)
    if ('stateMap' in entity && entity.stateMap && entity.stateMap[currentStateId]) {
      const stateOverrides = entity.stateMap[currentStateId];
      if (stateOverrides.overrides) {
        const verbKey = `on${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}` as keyof Handlers;
        const overrideHandler = stateOverrides.overrides[verbKey];
        if (overrideHandler) {
          return HandlerResolver.resolveHandler(overrideHandler as any, state, game);
        }
      }
    }

    // 2. Check entity handlers
    if (entity.handlers) {
      const verbKey = `on${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}` as keyof typeof entity.handlers;
      const handler = entity.handlers[verbKey];
      if (handler) {
        return HandlerResolver.resolveHandler(handler as any, state, game);
      }
    }

    // 3. TODO: Check archetype handlers (not implemented yet)

    // 4. No handler found
    return undefined;
  }

  /**
   * Resolve a handler that may be a single Rule or an array of conditional Rules
   * For arrays, returns the first Rule whose conditions match
   *
   * CRITICAL: This method is essential for proper media resolution in containers.
   *
   * Example use case - Coffee machine with hidden key:
   *
   * onExamine: [
   *   {
   *     conditions: [
   *       { type: 'FLAG', flag: 'machine_is_broken', value: true },
   *       { type: 'HAS_ITEM', itemId: 'item_safe_key' }
   *     ],
   *     success: {
   *       message: "The cavity's empty now - you took the key.",
   *       media: { url: '...broken_empty.png', ... }  // Empty image
   *     }
   *   },
   *   {
   *     conditions: [{ type: 'FLAG', flag: 'machine_is_broken', value: true }],
   *     success: {
   *       message: "Inside the cavity: brass key.",
   *       media: { url: '...broken_with_key.png', ... }  // Image with key
   *     }
   *   },
   *   {
   *     conditions: [],  // Default
   *     success: {
   *       message: "The panel rattles.",
   *       media: { url: '...intact.png', ... }  // Intact image
   *     }
   *   }
   * ]
   *
   * Without this resolution:
   * - Handler would be returned as raw array
   * - Media URLs would be ignored
   * - System would fall back to entity.media.images[currentStateId]
   * - Wrong image would be shown
   *
   * With this resolution:
   * - Conditions evaluated in order (most specific to least specific)
   * - First matching handler returned
   * - Explicit media URLs preserved
   * - Correct image shown based on game state
   *
   * @param handler - Single Rule or array of conditional Rules
   * @param state - Current player state for condition evaluation
   * @param game - Game data needed for condition evaluation
   * @returns Resolved single Rule, or undefined if no conditions match
   */
  private static resolveHandler(
    handler: Rule | Rule[],
    state: PlayerState,
    game?: Game
  ): Rule | undefined {
    // If handler is an array, resolve to first matching condition
    if (Array.isArray(handler)) {
      for (const conditionalHandler of handler) {
        const conditionsMet = game
          ? Validator.evaluateConditions(conditionalHandler.conditions, state, game)
          : !conditionalHandler.conditions || conditionalHandler.conditions.length === 0;

        if (conditionsMet) {
          return conditionalHandler;
        }
      }
      // No conditions matched
      return undefined;
    }

    // Single handler - return as-is
    return handler;
  }

  /**
   * Get the effective description for an entity
   * This takes into account stateMap description overrides
   */
  static getEffectiveDescription(
    entity: EntityWithHandlers,
    state: PlayerState
  ): string | undefined {
    const entityState = GameStateManager.getEntityState(state, entity.id);
    const currentStateId = entityState.currentStateId || 'default';

    // Check stateMap description override
    if ('stateMap' in entity && entity.stateMap && entity.stateMap[currentStateId]) {
      const stateOverrides = entity.stateMap[currentStateId];
      if (stateOverrides.description) {
        return stateOverrides.description;
      }
    }

    // Return base description
    return entity.description;
  }

  /**
   * Get fallback message for an entity and action
   */
  static getFallbackMessage(
    entity: GameObject | Item,
    messageType: string = 'default'
  ): string {
    if ('fallbackMessages' in entity && entity.fallbackMessages) {
      return entity.fallbackMessages[messageType] || entity.fallbackMessages.default || 'You cannot do that.';
    }
    return 'You cannot do that.';
  }

  /**
   * Check if entity is a GameObject
   */
  static isGameObject(entity: any): entity is GameObject {
    return entity && 'archetype' in entity && typeof entity.archetype === 'string';
  }

  /**
   * Check if entity is an Item
   */
  static isItem(entity: any): entity is Item {
    return entity && 'archetype' in entity && typeof entity.archetype === 'string' && 'isTakable' in entity.capabilities;
  }

  /**
   * Check if entity is an NPC
   */
  static isNPC(entity: any): entity is NPC {
    return entity && 'importance' in entity && 'dialogueType' in entity;
  }

  /**
   * Get entity by ID from game (searches all entity types)
   */
  static getEntity(entityId: string, game: Game): EntityWithHandlers | undefined {
    // Check objects
    if (game.gameObjects[entityId as any]) {
      return game.gameObjects[entityId as any];
    }

    // Check items
    if (game.items[entityId as any]) {
      return game.items[entityId as any];
    }

    // Check NPCs
    if (game.npcs[entityId as any]) {
      return game.npcs[entityId as any];
    }

    // Check portals
    if (game.portals[entityId as any]) {
      return game.portals[entityId as any];
    }

    return undefined;
  }

  /**
   * Build verb key for handler lookup
   */
  static buildVerbKey(verb: string): string {
    return `on${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}`;
  }
}
