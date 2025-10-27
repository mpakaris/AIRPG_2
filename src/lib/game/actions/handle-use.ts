
/**
 * handle-use - NEW ARCHITECTURE
 *
 * Handles "use item on object" and "use item" actions.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, VisibilityResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedItemName = normalizeName(itemName);

  // 1. Find item in inventory
  const itemId = state.inventory.find(id =>
    normalizeName(game.items[id]?.name).includes(normalizedItemName)
  );

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

          // Build effects
          const effects: Effect[] = [];

          if (outcome.message) {
            effects.push({
              type: 'SHOW_MESSAGE',
              speaker: 'narrator',
              content: outcome.message
            });
          }

          if (outcome.effects && Array.isArray(outcome.effects)) {
            effects.push(...outcome.effects);
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

    // Build effects
    const effects: Effect[] = [];

    if (outcome.message) {
      effects.push({
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: outcome.message
      });
    }

    if (outcome.effects) {
      effects.push(...outcome.effects);
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
