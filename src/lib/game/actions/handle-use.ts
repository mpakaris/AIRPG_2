
/**
 * handle-use - NEW ARCHITECTURE
 *
 * Handles "use item on object" and "use item" actions.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, VisibilityResolver, FocusResolver, GameStateManager, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";
import { MessageExpander } from "@/lib/game/utils/message-expansion";
import { attemptPhotograph, isCameraDevice } from "@/lib/game/utils/photography-helper";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedItemName = normalizeName(itemName);

  // 1. LOCATION-AWARE SEARCH: Find item (prioritizes current location)
  const itemMatch = findBestMatch(normalizedItemName, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: false,
    requireFocus: false  // Search all visible entities (focus validation happens separately below)
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
      content: smartMessage.found ? `You notice that, but you can't use it from here.` : smartMessage.message
    }];
  }

  const itemId = itemMatch.id as ItemId;
  const itemToUse = game.items[itemId];
  if (!itemToUse) {
    const message = await MessageExpander.dontHaveItem(game.systemMessages.dontHaveItem, itemName);
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: message
    }];
  }

  // 2. If using item on a target
  if (targetName) {
    const normalizedTargetName = normalizeName(targetName);

    // IMPORTANT: When in device focus mode (phone, etc.), restrict search to current focus
    // Otherwise, allow searching all visible entities
    const isInDeviceMode = !!state.activeDeviceFocus;

    // LOCATION-AWARE SEARCH: Find target object (prioritizes current location)
    const targetMatch = findBestMatch(normalizedTargetName, state, game, {
      searchInventory: false,
      searchVisibleItems: false,
      searchObjects: true,
      requireFocus: isInDeviceMode  // When using device (phone), search only within current focus
    });

    if (targetMatch?.category === 'object') {
      const targetObjectId = targetMatch.id as GameObjectId;
      const targetObject = game.gameObjects[targetObjectId];
      if (!targetObject) {
        const message = await MessageExpander.cantUseItem(game.systemMessages.cantUseItem, itemToUse.name);
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: message
        }];
      }

      // FOCUS VALIDATION: Check if target is within current focus
      // NOTE: Focus validation is handled by findBestMatch with requireFocus: true
      // No need for redundant validation here - if findBestMatch returned a result,
      // the object is accessible within the current focus (including descendants)

      // PHOTOGRAPHY SYSTEM: Check if using a camera device to photograph
      if (isCameraDevice(itemToUse)) {
        const photoResult = attemptPhotograph(
          itemToUse,
          targetObjectId,
          'object',
          state,
          game
        );

        // If photography succeeded, return those effects
        if (photoResult.canPhotograph && photoResult.effects) {
          return photoResult.effects;
        }

        // If photography failed with a specific reason, show it
        // But only if there are no other handlers to try
        const hasOtherHandlers = targetObject.handlers?.onUse || targetObject.handlers?.onUseWith;
        if (!photoResult.canPhotograph && photoResult.reason && !hasOtherHandlers) {
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: photoResult.reason
          }];
        }
        // Otherwise, continue to check other handlers
      }

      // Check if object has onUse handlers
      const useHandlers = targetObject.handlers?.onUse;
      if (Array.isArray(useHandlers)) {
        // Find ALL handlers for this specific item
        const matchingHandlers = useHandlers.filter(h => h.itemId === itemId);

        if (matchingHandlers.length > 0) {
          // Evaluate conditions for each matching handler
          // Return the FIRST one where conditions match
          for (const handler of matchingHandlers) {
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;
            const isFail = !conditionsMet;

            // If we have an outcome (either success with met conditions, or fail with unmet conditions)
            if (outcome) {
              // Build effects with media support
              const effects: Effect[] = [];

              // Use helper to build effects with automatic media extraction
              effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

              // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
              const focusEffect = FocusManager.determineNextFocus({
                action: 'use',
                target: targetObjectId,
                targetType: 'object',
                actionSucceeded: !isFail,
                currentFocus: state.currentFocusId,
                state,
                game
              });

              if (focusEffect) {
                effects.push(focusEffect);
              }

              return effects;
            }
          }

          // If we get here, we found matching handlers but none had outcomes
          const message = await MessageExpander.static(game.systemMessages.useDidntWork);
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
          }];
        }
      }

      // No matching handler
      // Handle deserialization: systemMessages functions are lost after JSON serialization
      const messageKey = typeof game.systemMessages.cantUseOnTarget === 'function'
        ? game.systemMessages.cantUseOnTarget(itemToUse.name, targetObject.name)
        : 'cant_use_item_on_target'; // Fallback keyword

      const { expandSystemMessage } = await import('@/lib/game/utils/message-expansion');
      const message = await expandSystemMessage(messageKey, {
        itemName: itemToUse.name,
        targetName: targetObject.name
      });

      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: message
      }];
    }

    // Check if target exists but not visible
    const objectExistsInGame = Object.values(game.gameObjects).some(obj =>
      normalizeName(obj.name).includes(normalizedTargetName)
    );

    if (objectExistsInGame) {
      const message = await MessageExpander.notVisible(game.systemMessages.noVisibleTarget, normalizedTargetName);
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: message
      }];
    }

    // Check if target is an item (using location-aware search)
    const targetItemMatch = findBestMatch(normalizedTargetName, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false,
      requireFocus: isInDeviceMode  // When using device (phone), search only within current focus
    });

    if (targetItemMatch) {
      // Item-on-item combination (not implemented yet)
      // Handle deserialization: systemMessages functions are lost after JSON serialization
      const messageKey = typeof game.systemMessages.cantUseOnTarget === 'function'
        ? game.systemMessages.cantUseOnTarget(itemName, targetName)
        : 'cant_use_item_on_target'; // Fallback keyword

      const { expandSystemMessage } = await import('@/lib/game/utils/message-expansion');
      const message = await expandSystemMessage(messageKey, {
        itemName: itemName,
        targetName: targetName
      });

      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: message
      }];
    }

    const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: message
    }];
  }

  // 3. Using item on its own (e.g., "use phone")
  const onUseHandler = itemToUse.handlers?.onUse;
  if (onUseHandler && !Array.isArray(onUseHandler)) {
    // Evaluate conditions
    const conditionsMet = Validator.evaluateConditions(onUseHandler.conditions, state, game);
    const outcome = conditionsMet ? onUseHandler.success : onUseHandler.fail;
    const isFail = !conditionsMet;

    if (!outcome) {
      const message = await MessageExpander.cantUseItem(game.systemMessages.cantUseItem, itemToUse.name);
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: message
      }];
    }

    // Build effects with media support
    // Use helper to automatically extract media and handle proper effect ordering
    const effects = buildEffectsFromOutcome(outcome, itemId, 'item', game, isFail);

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
