/**
 * Debug helpers for troubleshooting specific entities
 */

import type { PlayerState, Game, GameObjectId } from '../types';
import { GameStateManager } from '../engine/GameStateManager';

const DEBUG_ENTITIES = ['obj_bookshelf', 'obj_hidden_door'];

/**
 * Log detailed state for bookshelf and door entities
 */
export function logEntityDebug(
  context: string,
  entityId: string | GameObjectId,
  state: PlayerState,
  game: Game
): void {
  if (!DEBUG_ENTITIES.includes(entityId as string)) return;

  const entity = game.gameObjects[entityId as GameObjectId];
  if (!entity) return;

  const entityState = GameStateManager.getEntityState(state, entityId);

  console.log(`\n[DEBUG ${entityId}] ${context}`);
  console.log('├─ Current State:', {
    isVisible: entityState.isVisible,
    isOpen: entityState.isOpen,
    isLocked: entityState.isLocked,
    isBroken: entityState.isBroken,
    isMoved: entityState.isMoved,
    currentStateId: entityState.currentStateId,
    examinedCount: entityState.examinedCount,
    usedCount: entityState.usedCount,
  });

  console.log('├─ Capabilities:', entity.capabilities);

  if (entity.children) {
    console.log('├─ Children (cartridge):', entity.children);

    // Check visibility of children
    const childrenVisibility: Record<string, any> = {};

    if (entity.children.objects) {
      entity.children.objects.forEach(childId => {
        const childState = GameStateManager.getEntityState(state, childId);
        childrenVisibility[childId] = {
          isVisible: childState.isVisible,
          parentId: childState.parentId,
        };
      });
    }

    if (entity.children.items) {
      entity.children.items.forEach(childId => {
        const childState = GameStateManager.getEntityState(state, childId);
        childrenVisibility[childId] = {
          isVisible: childState.isVisible,
          parentId: childState.parentId,
        };
      });
    }

    console.log('├─ Children Visibility:', childrenVisibility);
  }

  if (entityState.containedEntities) {
    console.log('├─ Contained Entities (runtime):', entityState.containedEntities);
  }

  console.log('└─ Handlers:', Object.keys(entity.handlers || {}));
  console.log('');
}

/**
 * Log effect application for debug entities
 */
export function logEffectDebug(
  effect: any,
  entityId: string | undefined,
  state: PlayerState
): void {
  if (!entityId || !DEBUG_ENTITIES.includes(entityId)) return;

  console.log(`\n[DEBUG ${entityId}] Effect Applied`);
  console.log('├─ Type:', effect.type);
  console.log('├─ Effect Data:', effect);

  const entityState = GameStateManager.getEntityState(state, entityId);
  console.log('└─ State After Effect:', {
    isVisible: entityState.isVisible,
    isOpen: entityState.isOpen,
    isLocked: entityState.isLocked,
    currentStateId: entityState.currentStateId,
  });
  console.log('');
}
