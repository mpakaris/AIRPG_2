
/**
 * handle-use - NEW ARCHITECTURE
 *
 * Handles "use item on object" and "use item" actions.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedItemName = normalizeName(itemName);

  // 1. LOCATION-AWARE SEARCH: Find item (prioritizes current location)
  const itemMatch = findBestMatch(normalizedItemName, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: false,
    requireFocus: true
  });

  if (!itemMatch) {
    const smartMessage = getSmartNotFoundMessage(normalizedItemName, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false
    });
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: smartMessage.message
    }];
  }

  const itemId = itemMatch.id as ItemId;
  const itemToUse = game.items[itemId];
  if (!itemToUse) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: game.systemMessages.dontHaveItem(itemName)
    }];
  }

  // 2. If using item on a target
  if (targetName) {
    const normalizedTargetName = normalizeName(targetName);

    // LOCATION-AWARE SEARCH: Find target object (prioritizes current location)
    const targetMatch = findBestMatch(normalizedTargetName, state, game, {
      searchInventory: false,
      searchVisibleItems: false,
      searchObjects: true,
      requireFocus: true
    });

    if (targetMatch?.category === 'object') {
      const targetObjectId = targetMatch.id as GameObjectId;
      const targetObject = game.gameObjects[targetObjectId];
      if (!targetObject) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: game.systemMessages.cantUseItem(itemToUse.name)
        }];
      }

      // FOCUS VALIDATION: Check if target is within current focus
      // Skip validation for personal equipment (phone, etc.) - they're always accessible
      const isPersonalEquipment = targetObject.personal === true;

      if (!isPersonalEquipment && state.currentFocusId && state.focusType === 'object') {
        const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);

        // Check if target is the focused object itself or within it
        const isInFocus = targetObjectId === state.currentFocusId ||
                         entitiesInFocus.objects.includes(targetObjectId);

        if (!isInFocus) {
          // Target is out of focus - show helpful error
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
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
              content: game.systemMessages.useDidntWork
            }];
          }

          // Build effects with media support
          const effects: Effect[] = [];

          // Only set focus if NOT personal equipment (phone doesn't need focus - it's always with you)
          if (!isPersonalEquipment) {
            effects.push({
              type: 'SET_FOCUS',
              focusId: targetObjectId,
              focusType: 'object',
              transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
            });
          }

          // Use helper to build effects with automatic media extraction
          effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object'));

          return effects;
        }
      }

      // No matching handler
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: game.systemMessages.cantUseOnTarget(itemToUse.name, targetObject.name)
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
        content: game.systemMessages.noVisibleTarget(normalizedTargetName)
      }];
    }

    // Check if target is an item (using location-aware search)
    const targetItemMatch = findBestMatch(normalizedTargetName, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false,
      requireFocus: true
    });

    if (targetItemMatch) {
      // Item-on-item combination (not implemented yet)
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: game.systemMessages.cantUseOnTarget(itemName, targetName)
      }];
    }

    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: game.systemMessages.notVisible(targetName)
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
        content: game.systemMessages.cantUseItem(itemToUse.name)
      }];
    }

    // Build effects with media support
    // Use helper to automatically extract media and handle proper effect ordering
    const effects = buildEffectsFromOutcome(outcome, itemId, 'item');

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
