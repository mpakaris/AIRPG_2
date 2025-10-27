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

import type { Effect, PlayerState, EntityRuntimeState, Message } from '../types';
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

          // Add image/video/sound if provided
          if (effect.imageKey || effect.videoUrl) {
            message.image = {
              url: effect.imageKey || effect.videoUrl || '',
              description: content,
              hint: ''
            };
          }

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
    let currentState = state;
    let currentMessages = messages;

    // Guard: ensure effects is always an array
    const effectsArray = Array.isArray(effects) ? effects : [];

    for (const effect of effectsArray) {
      const result = GameStateManager.apply(effect, currentState, currentMessages);
      currentState = result.state;
      currentMessages = result.messages;
    }

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
}
