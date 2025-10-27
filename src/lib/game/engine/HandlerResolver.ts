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
 */

import type { Game, GameObject, Item, NPC, Portal, Rule, Handlers, PlayerState } from '../types';
import { GameStateManager } from './GameStateManager';

export type EntityWithHandlers = GameObject | Item | NPC | Portal;

export class HandlerResolver {
  /**
   * Get the effective handler for a specific action (verb)
   * This takes into account stateMap overrides
   */
  static getEffectiveHandler(
    entity: EntityWithHandlers,
    verb: string,
    state: PlayerState
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
          return overrideHandler as Rule;
        }
      }
    }

    // 2. Check entity handlers
    if (entity.handlers) {
      const verbKey = `on${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}` as keyof typeof entity.handlers;
      const handler = entity.handlers[verbKey];
      if (handler) {
        // Handle both old and new handler formats
        return handler as any; // This will be a Rule or legacy Handler
      }
    }

    // 3. TODO: Check archetype handlers (not implemented yet)

    // 4. No handler found
    return undefined;
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
