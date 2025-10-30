
/**
 * handle-use - NEW ARCHITECTURE
 *
 * Handles "use item on object" and "use item" actions.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedItemName = normalizeName(itemName);

  // 1. Find item in inventory OR visible items
  let itemId = state.inventory.find(id =>
    normalizeName(game.items[id]?.name).includes(normalizedItemName)
  );

  // If not in inventory, check visible items
  if (!itemId) {
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
    itemId = visibleEntities.items.find(id => {
      const item = game.items[id as any];
      if (!item) return false;
      const itemNameNorm = normalizeName(item.name);
      const altNames = item.alternateNames?.map(normalizeName) || [];
      return itemNameNorm.includes(normalizedItemName) ||
             altNames.some(alt => alt.includes(normalizedItemName));
    });
  }

  if (!itemId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You don't see a "${itemName}" to use.`
    }];
  }

  const itemToUse = game.items[itemId];
  if (!itemToUse) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You don't have a "${itemName}".`
    }];
  }

  // 2. If using item on a target
  if (targetName) {
    const normalizedTargetName = normalizeName(targetName);
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

    // Find target object
    const targetObjectId = visibleEntities.objects.find(id => {
      const obj = game.gameObjects[id as any];
      if (!obj) return false;
      const objName = normalizeName(obj.name);
      const objTags = obj.design?.tags?.map(normalizeName) || [];
      return objName.includes(normalizedTargetName) || objTags.includes(normalizedTargetName);
    });

    if (targetObjectId) {
      const targetObject = game.gameObjects[targetObjectId as any];
      if (!targetObject) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: `You can't use the ${itemToUse.name} on that.`
        }];
      }

      // FOCUS VALIDATION: Check if target is within current focus
      if (state.currentFocusId && state.focusType === 'object') {
        const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);

        // Check if target is the focused object itself or within it
        const isInFocus = targetObjectId === state.currentFocusId ||
                         entitiesInFocus.objects.includes(targetObjectId);

        if (!isInFocus) {
          // Target is out of focus - show helpful error
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'agent',
            content: FocusResolver.getOutOfFocusMessage('use ' + itemToUse.name + ' on', targetObject.name, state.currentFocusId, game)
          }];
        }
      }

      // Check if object has onUse handlers
      const useHandlers = targetObject.handlers?.onUse;
      if (Array.isArray(useHandlers)) {
        // Find handler for this specific item
        const specificHandler = useHandlers.find(h => h.itemId === itemId);

        if (specificHandler) {
          // Evaluate conditions
          const conditionsMet = Validator.evaluateConditions(specificHandler.conditions, state, game);
          const outcome = conditionsMet ? specificHandler.success : specificHandler.fail;

          if (!outcome) {
            return [{
              type: 'SHOW_MESSAGE',
              speaker: 'narrator',
              content: `That doesn't seem to work.`
            }];
          }

          // Build effects - IMPORTANT: State updates BEFORE messages
          const effects: Effect[] = [
            // Set focus on the target object being used
            {
              type: 'SET_FOCUS',
              focusId: targetObjectId,
              focusType: 'object',
              transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
            }
          ];

          // Add outcome effects
          if (outcome.effects && Array.isArray(outcome.effects)) {
            effects.push(...outcome.effects);
          }

          // Add message AFTER state updates
          if (outcome.message) {
            effects.push({
              type: 'SHOW_MESSAGE',
              speaker: 'narrator',
              content: outcome.message,
              imageId: targetObjectId,  // Will resolve based on updated state
              messageType: 'image'
            });
          }

          return effects;
        }
      }

      // No matching handler
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't use the ${itemToUse.name} on the ${targetObject.name}.`
      }];
    }

    // Check if target exists but not visible
    const objectExistsInGame = Object.values(game.gameObjects).some(obj =>
      normalizeName(obj.name).includes(normalizedTargetName)
    );

    if (objectExistsInGame) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `There's no ${normalizedTargetName} visible here. Maybe it's hidden?`
      }];
    }

    // Check if target is an item
    const targetItemId = state.inventory.find(id =>
      normalizeName(game.items[id]?.name).includes(normalizedTargetName)
    );

    if (targetItemId) {
      // Item-on-item combination (not implemented yet)
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't use the ${itemName} on the ${targetName}.`
      }];
    }

    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" to use the item on.`
    }];
  }

  // 3. Using item on its own (e.g., "use phone")
  const onUseHandler = itemToUse.handlers?.onUse;
  if (onUseHandler && !Array.isArray(onUseHandler)) {
    // Evaluate conditions
    const conditionsMet = Validator.evaluateConditions(onUseHandler.conditions, state, game);
    const outcome = conditionsMet ? onUseHandler.success : onUseHandler.fail;

    if (!outcome) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't use the ${itemToUse.name} right now.`
      }];
    }

    // Build effects - IMPORTANT: State updates BEFORE messages
    const effects: Effect[] = [];

    // 1. Add state-changing effects FIRST (no messages yet)
    if (outcome.effects) {
      for (const effect of outcome.effects) {
        // Add state changes first
        if (effect.type !== 'SHOW_MESSAGE') {
          effects.push(effect);
        }
      }
    }

    // 2. Add main handler message (will resolve imageId based on NEW state)
    if (outcome.message) {
      // Detect if this item will resolve to a video URL after state changes
      const item = game.items[itemId];

      // Check if there's a SET_ENTITY_STATE effect that changes currentStateId
      let newStateId = state.world?.[itemId]?.currentStateId || 'default';
      if (outcome.effects) {
        const stateChangeEffect = outcome.effects.find(
          (e: any) => e.type === 'SET_ENTITY_STATE' && e.entityId === itemId && e.patch?.currentStateId
        );
        if (stateChangeEffect) {
          newStateId = (stateChangeEffect as any).patch.currentStateId;
        }
      }

      const mediaUrl = item?.media?.images?.[newStateId]?.url;
      const isVideo = mediaUrl?.match(/\.(mp4|webm|ogg|mov)$/i);

      console.log('[handle-use] Video detection for', itemId);
      console.log('  - newStateId:', newStateId);
      console.log('  - mediaUrl:', mediaUrl);
      console.log('  - isVideo:', !!isVideo);
      console.log('  - messageType will be:', isVideo ? 'video' : 'image');

      effects.push({
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: outcome.message,
        imageId: itemId,  // Will resolve based on updated state
        messageType: isVideo ? 'video' : 'image'
      });
    }

    // 3. Add any additional SHOW_MESSAGE effects from outcome
    if (outcome.effects) {
      for (const effect of outcome.effects) {
        if (effect.type === 'SHOW_MESSAGE') {
          effects.push(effect);
        }
      }
    }

    return effects;
  }

  // No handler for using this item
  const defaultFail = itemToUse.handlers?.defaultFailMessage ||
    'You need to specify what to use that on, or it can\'t be used by itself.';

  return [{
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: defaultFail
  }];
}
