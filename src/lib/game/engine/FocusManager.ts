/**
 * FocusManager - Centralized Focus Logic
 *
 * Determines where player focus should be AFTER an action completes.
 * Focus = WHAT the player is examining closely (attention layer)
 * Zone = WHERE the player is physically (spatial position)
 *
 * Focus is optional and separate from zones:
 * - You can be in zone_at_dumpster and focus on obj_trash_bag
 * - Focus allows detailed examination of specific entities
 * - Zone controls physical accessibility
 */

import type { PlayerState, Game, Effect, GameObjectId, ItemId, NpcId } from '../types';
import { GameStateManager } from './GameStateManager';
import { ZoneManager } from './ZoneManager';

export type ActionType = 'search' | 'examine' | 'use' | 'take' | 'open' | 'close' | 'break' | 'talk' | 'move' | 'go' | 'climb' | 'read';

export interface FocusContext {
  action: ActionType;
  target: GameObjectId | ItemId | NpcId;
  targetType: 'object' | 'item' | 'npc';
  actionSucceeded: boolean;
  currentFocus: string | null;
  state: PlayerState;
  game: Game;
}

export class FocusManager {
  /**
   * Determine next focus based on action and context
   * Returns a SET_FOCUS effect if focus should change, null otherwise
   */
  static determineNextFocus(context: FocusContext): Effect | null {
    const { action, target, targetType, currentFocus, state, game } = context;

    // RULE 1: If target is personal equipment, never change focus
    if (targetType === 'object') {
      const obj = game.gameObjects[target as GameObjectId];
      if (obj?.personal) {
        console.log('[FocusManager] Target is personal equipment - keeping current focus');
        return null;
      }
    }

    // RULE 2: If target is descendant of current focus, keep current focus
    // This allows examining/searching siblings without losing focus
    if (currentFocus && targetType === 'object') {
      if (this.isDescendantOfFocus(target as string, currentFocus, state)) {
        console.log(`[FocusManager] Target ${target} is descendant of focus ${currentFocus} - keeping focus`);
        return null;
      }
    }

    // RULE 3: Action-specific focus rules
    switch (action) {
      case 'search':
        // When searching, focus on the searched object (unless descendant rule applies)
        console.log(`[FocusManager] Search action - setting focus to ${target}`);
        return this.createFocusEffect(target as string, targetType, state, game);

      case 'examine':
        // When examining, focus on the examined object (unless descendant rule applies)
        console.log(`[FocusManager] Examine action - setting focus to ${target}`);
        return this.createFocusEffect(target as string, targetType, state, game);

      case 'read':
        // When reading, focus on the document/object (unless descendant rule applies)
        console.log(`[FocusManager] Read action - setting focus to ${target}`);
        return this.createFocusEffect(target as string, targetType, state, game);

      case 'use':
        // When using item on object, focus on the object
        if (targetType === 'object') {
          console.log(`[FocusManager] Use action on object - setting focus to ${target}`);
          return this.createFocusEffect(target as string, targetType, state, game);
        }
        // Using item on item - don't change focus
        return null;

      case 'take':
        // When taking items, don't change focus - keep exploring current area
        console.log('[FocusManager] Take action - keeping current focus to continue exploring');
        return null;

      case 'open':
      case 'climb':
        // When opening/climbing into containers, focus on them
        console.log(`[FocusManager] ${action} action - setting focus to ${target}`);
        return this.createFocusEffect(target as string, targetType, state, game);

      case 'break':
      case 'close':
        // These actions don't typically change focus
        return null;

      case 'talk':
        // When talking to NPC, focus on them
        if (targetType === 'npc') {
          console.log(`[FocusManager] Talk action - setting focus to ${target}`);
          return this.createFocusEffect(target as string, targetType, state, game);
        }
        return null;

      case 'move':
        // Movement actions within location clear focus
        console.log('[FocusManager] Movement action - clearing focus');
        return {
          type: 'SET_FOCUS',
          focusId: null as any,
          focusType: 'object'
        };

      case 'go':
        // Go action: if targeting an object/zone, focus on it. Otherwise clear focus.
        if (target && targetType === 'object') {
          console.log(`[FocusManager] Go action - setting focus to ${target}`);
          return this.createFocusEffect(target as string, targetType, state, game);
        } else {
          // Going to location (no specific object target) - clear focus
          console.log('[FocusManager] Go action - clearing focus (location change)');
          return {
            type: 'SET_FOCUS',
            focusId: null as any,
            focusType: 'object'
          };
        }

      default:
        // Unknown action - keep current focus
        return null;
    }
  }

  /**
   * Check if target is a descendant (child, grandchild, etc.) of current focus
   */
  private static isDescendantOfFocus(
    targetId: string,
    currentFocusId: string,
    state: PlayerState
  ): boolean {
    const entityState = GameStateManager.getEntityState(state, targetId);

    // Walk up the parent chain
    let currentParent = entityState.parentId;
    while (currentParent) {
      if (currentParent === currentFocusId) {
        return true;
      }
      const parentState = GameStateManager.getEntityState(state, currentParent);
      currentParent = parentState.parentId;
    }

    return false;
  }

  /**
   * Create a SET_FOCUS effect with proper transition message
   */
  private static createFocusEffect(
    focusId: string,
    focusType: 'object' | 'item' | 'npc',
    state: PlayerState,
    game: Game
  ): Effect {
    // Import FocusResolver for transition messages
    const { FocusResolver } = require('./FocusResolver');

    return {
      type: 'SET_FOCUS',
      focusId: focusId as any,
      focusType: focusType,
      transitionMessage: FocusResolver.getTransitionNarration(focusId, focusType, state, game) || undefined
    };
  }
}
