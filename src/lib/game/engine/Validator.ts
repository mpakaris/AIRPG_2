/**
 * Validator - Capability, State, and Condition Checker
 *
 * This service validates whether actions can be performed based on:
 * 1. Entity capabilities (openable, lockable, etc.)
 * 2. Current state (already open, locked, etc.)
 * 3. Conditions (flags, items, location, etc.)
 *
 * Design principles:
 * 1. Pure functions - no side effects
 * 2. Explicit validation - fail fast with clear messages
 * 3. Centralized logic - all validation in one place
 */

import type { Condition, PlayerState, Capabilities, EntityRuntimeState, Game } from '../types';
import { GameStateManager } from './GameStateManager';

export type ValidationResult = {
  valid: boolean;
  reason?: string;
  affordances?: string[]; // What CAN the player do with this entity?
};

export class Validator {
  /**
   * Check if an entity has a specific capability
   */
  static hasCapability(capabilities: Capabilities | undefined, capability: keyof Capabilities): boolean {
    if (!capabilities) return false;
    return capabilities[capability] === true;
  }

  /**
   * Validate if an action is allowed based on capability
   */
  static validateCapability(
    verb: string,
    capabilities: Capabilities | undefined
  ): ValidationResult {
    const capabilityMap: Record<string, keyof Capabilities> = {
      open: 'openable',
      close: 'openable',
      unlock: 'lockable',
      lock: 'lockable',
      break: 'breakable',
      move: 'movable',
      search: 'searchable',
      input: 'inputtable',
      read: 'readable',
      use: 'usable',
      combine: 'combinable',
      take: 'takeable',
    };

    const requiredCapability = capabilityMap[verb.toLowerCase()];

    if (!requiredCapability) {
      // Unknown verb, allow it (might be handled elsewhere)
      return { valid: true };
    }

    if (!Validator.hasCapability(capabilities, requiredCapability)) {
      // Proper past participle forms
      const pastParticiples: Record<string, string> = {
        'move': 'moved',
        'break': 'broken',
        'read': 'read',
        'use': 'used',
        'open': 'opened',
        'close': 'closed',
        'take': 'taken',
        'combine': 'combined',
      };
      const pastForm = pastParticiples[verb.toLowerCase()] || `${verb}ed`;

      return {
        valid: false,
        reason: `This entity cannot be ${pastForm}.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate state constraints (e.g., can't open if already open)
   */
  static validateState(
    verb: string,
    entityState: EntityRuntimeState
  ): ValidationResult {
    switch (verb.toLowerCase()) {
      case 'open':
        if (entityState.isOpen === true) {
          return { valid: false, reason: 'It is already open.' };
        }
        if (entityState.isLocked === true) {
          return { valid: false, reason: 'It is locked.' };
        }
        break;

      case 'close':
        if (entityState.isOpen === false || entityState.isOpen === undefined) {
          return { valid: false, reason: 'It is already closed.' };
        }
        break;

      case 'unlock':
        if (entityState.isLocked === false || entityState.isLocked === undefined) {
          return { valid: false, reason: 'It is not locked.' };
        }
        break;

      case 'lock':
        if (entityState.isLocked === true) {
          return { valid: false, reason: 'It is already locked.' };
        }
        if (entityState.isOpen === true) {
          return { valid: false, reason: 'You must close it first.' };
        }
        break;

      case 'move':
        if (entityState.isMoved === true) {
          return { valid: false, reason: 'It has already been moved.' };
        }
        break;

      case 'take':
        if (entityState.taken === true) {
          return { valid: false, reason: 'You already have it.' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check if a single condition is met
   */
  static evaluateCondition(condition: Condition, state: PlayerState, game: Game): boolean {
    try {
      switch (condition.type) {
        case 'FLAG':
          return GameStateManager.hasFlag(state, condition.flag) === condition.value;

        case 'HAS_FLAG':
          return GameStateManager.hasFlag(state, condition.flag) === true;

        case 'NO_FLAG':
          return GameStateManager.hasFlag(state, condition.flag) === false;

        case 'STATE':
          const entityState = GameStateManager.getEntityState(state, condition.entityId);
          return entityState[condition.key as keyof EntityRuntimeState] === condition.equals;

        case 'STATE_MATCH':
          const entity = GameStateManager.getEntityState(state, condition.entityId);
          return entity[condition.key as keyof EntityRuntimeState] === condition.expectedValue;

        case 'HAS_ITEM':
          if (condition.itemId) {
            return state.inventory.includes(condition.itemId as any);
          }
          if (condition.tag) {
            // Check if player has any item with this tag
            return state.inventory.some(itemId => {
              const item = game.items[itemId];
              return item?.design?.tags?.includes(condition.tag!);
            });
          }
          return false;

        case 'LOCATION_IS':
          return state.currentLocationId === condition.locationId;

        case 'CHAPTER_IS':
          return state.currentChapterId === condition.chapterId;

        case 'RANDOM_CHANCE':
          return Math.random() < condition.p;

        default:
          console.warn('Unknown condition type:', (condition as any).type);
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', condition, error);
      return false;
    }
  }

  /**
   * Check if all conditions are met
   */
  static evaluateConditions(conditions: Condition[] | undefined, state: PlayerState, game: Game): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always passes
    }

    return conditions.every(condition => Validator.evaluateCondition(condition, state, game));
  }

  /**
   * Get affordances (what CAN be done with this entity)
   */
  static getAffordances(
    capabilities: Capabilities | undefined,
    entityState: EntityRuntimeState
  ): string[] {
    const affordances: string[] = [];

    if (Validator.hasCapability(capabilities, 'openable')) {
      if (entityState.isOpen) {
        affordances.push('close');
      } else if (!entityState.isLocked) {
        affordances.push('open');
      }
    }

    if (Validator.hasCapability(capabilities, 'lockable')) {
      if (entityState.isLocked) {
        affordances.push('unlock');
      } else if (!entityState.isOpen) {
        affordances.push('lock');
      }
    }

    if (Validator.hasCapability(capabilities, 'movable') && !entityState.isMoved) {
      affordances.push('move');
    }

    if (Validator.hasCapability(capabilities, 'breakable') && !entityState.isBroken) {
      affordances.push('break');
    }

    if (Validator.hasCapability(capabilities, 'searchable')) {
      affordances.push('search');
    }

    if (Validator.hasCapability(capabilities, 'readable')) {
      affordances.push('read');
    }

    if (Validator.hasCapability(capabilities, 'usable')) {
      affordances.push('use');
    }

    if (Validator.hasCapability(capabilities, 'takeable') && !entityState.taken) {
      affordances.push('take');
    }

    if (Validator.hasCapability(capabilities, 'inputtable')) {
      affordances.push('enter code');
    }

    // Always allow examine
    affordances.push('examine');

    return affordances;
  }

  /**
   * Complete validation check for an action
   */
  static validate(
    verb: string,
    entityId: string,
    state: PlayerState,
    game: Game
  ): ValidationResult {
    // Get entity (could be object, item, NPC, etc.)
    const entity = game.gameObjects[entityId as any] ||
                   game.items[entityId as any] ||
                   game.npcs[entityId as any] ||
                   game.portals[entityId as any];

    if (!entity) {
      return { valid: false, reason: 'Entity not found.' };
    }

    // Check visibility
    if (!GameStateManager.isEntityVisible(state, entityId)) {
      return { valid: false, reason: 'You cannot see that.' };
    }

    // Get capabilities
    const capabilities = entity.capabilities;
    const entityState = GameStateManager.getEntityState(state, entityId);

    // 1. Check capability
    const capabilityCheck = Validator.validateCapability(verb, capabilities);
    if (!capabilityCheck.valid) {
      const affordances = Validator.getAffordances(capabilities, entityState);
      return {
        valid: false,
        reason: capabilityCheck.reason,
        affordances,
      };
    }

    // 2. Check state
    const stateCheck = Validator.validateState(verb, entityState);
    if (!stateCheck.valid) {
      const affordances = Validator.getAffordances(capabilities, entityState);
      return {
        valid: false,
        reason: stateCheck.reason,
        affordances,
      };
    }

    return { valid: true };
  }

  /**
   * Validate that player has required item for an action
   */
  static validateRequiredItem(
    state: PlayerState,
    requiredItemId?: string,
    requiredItemTag?: string
  ): ValidationResult {
    if (requiredItemId && !state.inventory.includes(requiredItemId as any)) {
      return {
        valid: false,
        reason: `You need the ${requiredItemId} to do that.`,
      };
    }

    if (requiredItemTag) {
      // Check if any inventory item has this tag
      // This would require access to game data
      return { valid: true }; // Simplified for now
    }

    return { valid: true };
  }
}
