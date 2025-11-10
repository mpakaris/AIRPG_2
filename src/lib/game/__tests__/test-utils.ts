/**
 * TEST UTILITIES
 *
 * Helper functions for testing game handlers and state mutations.
 */

import type { PlayerState, Game, Effect, Message } from '../types';
import { getInitialState } from '@/lib/game-state';
import { processEffects } from '../actions/process-effects';

/**
 * Create a fresh test state from the test cartridge
 */
export function createTestState(game: Game): PlayerState {
  return getInitialState(game);
}

/**
 * Apply effects to state and return new state + messages
 */
export async function applyEffects(
  state: PlayerState,
  effects: Effect[],
  game: Game
): Promise<{ newState: PlayerState; messages: Message[] }> {
  return await processEffects(state, effects, game);
}

/**
 * Helper to check if effect array contains a specific effect type
 */
export function hasEffect(effects: Effect[], type: Effect['type']): boolean {
  return effects.some(e => e.type === type);
}

/**
 * Helper to find effect by type
 */
export function findEffect<T extends Effect['type']>(
  effects: Effect[],
  type: T
): Extract<Effect, { type: T }> | undefined {
  return effects.find(e => e.type === type) as Extract<Effect, { type: T }> | undefined;
}

/**
 * Helper to find all effects of a specific type
 */
export function findEffects<T extends Effect['type']>(
  effects: Effect[],
  type: T
): Extract<Effect, { type: T }>[] {
  return effects.filter(e => e.type === type) as Extract<Effect, { type: T }>[];
}

/**
 * Check if state has a specific flag set to true
 */
export function hasFlag(state: PlayerState, flag: string): boolean {
  return !!state.flags?.[flag];
}

/**
 * Check if item is in inventory
 */
export function hasItem(state: PlayerState, itemId: string): boolean {
  return state.inventory.includes(itemId as any);
}

/**
 * Get entity state from world
 */
export function getEntityState(state: PlayerState, entityId: string) {
  return state.world[entityId];
}

/**
 * Assert helpers for common test patterns
 */
export const assert = {
  entityIsOpen: (state: PlayerState, entityId: string) => {
    const entity = getEntityState(state, entityId);
    if (!entity?.isOpen) {
      throw new Error(`Expected entity ${entityId} to be open, but isOpen=${entity?.isOpen}`);
    }
  },

  entityIsLocked: (state: PlayerState, entityId: string) => {
    const entity = getEntityState(state, entityId);
    if (!entity?.isLocked) {
      throw new Error(`Expected entity ${entityId} to be locked, but isLocked=${entity?.isLocked}`);
    }
  },

  entityIsUnlocked: (state: PlayerState, entityId: string) => {
    const entity = getEntityState(state, entityId);
    if (entity?.isLocked !== false) {
      throw new Error(`Expected entity ${entityId} to be unlocked, but isLocked=${entity?.isLocked}`);
    }
  },

  entityIsVisible: (state: PlayerState, entityId: string) => {
    const entity = getEntityState(state, entityId);
    if (!entity?.isVisible) {
      throw new Error(`Expected entity ${entityId} to be visible, but isVisible=${entity?.isVisible}`);
    }
  },

  entityIsBroken: (state: PlayerState, entityId: string) => {
    const entity = getEntityState(state, entityId);
    if (!entity?.isBroken) {
      throw new Error(`Expected entity ${entityId} to be broken, but isBroken=${entity?.isBroken}`);
    }
  },

  hasItem: (state: PlayerState, itemId: string) => {
    if (!hasItem(state, itemId)) {
      throw new Error(`Expected inventory to contain ${itemId}, but it doesn't`);
    }
  },

  hasFlag: (state: PlayerState, flag: string) => {
    if (!hasFlag(state, flag)) {
      throw new Error(`Expected flag ${flag} to be true, but it's ${state.flags?.[flag]}`);
    }
  },

  effectExists: (effects: Effect[], type: Effect['type']) => {
    if (!hasEffect(effects, type)) {
      throw new Error(`Expected effects to contain ${type}, but it doesn't`);
    }
  }
};

/**
 * Mock AI response helper
 * Use this to mock AI responses in tests
 */
export function mockAIResponse(commandToExecute: string, agentResponse?: string) {
  return {
    output: {
      commandToExecute,
      agentResponse: agentResponse || `Interpreting command: ${commandToExecute}`
    },
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150
    }
  };
}

/**
 * Helper to create a state with specific modifications
 */
export function createStateWith(
  game: Game,
  modifications: Partial<PlayerState>
): PlayerState {
  const baseState = createTestState(game);
  return {
    ...baseState,
    ...modifications,
    world: {
      ...baseState.world,
      ...(modifications.world || {})
    }
  };
}

/**
 * Helper to add item to inventory in test state
 */
export function withItem(state: PlayerState, itemId: string): PlayerState {
  return {
    ...state,
    inventory: [...state.inventory, itemId as any]
  };
}

/**
 * Helper to set flag in test state
 */
export function withFlag(state: PlayerState, flag: string, value: boolean = true): PlayerState {
  return {
    ...state,
    flags: {
      ...state.flags,
      [flag]: value
    }
  };
}

/**
 * Helper to modify entity state in test state
 */
export function withEntityState(
  state: PlayerState,
  entityId: string,
  patch: Record<string, any>
): PlayerState {
  return {
    ...state,
    world: {
      ...state.world,
      [entityId]: {
        ...state.world[entityId],
        ...patch
      }
    }
  };
}
