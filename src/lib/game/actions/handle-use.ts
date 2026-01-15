
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
import { canOpenContainer } from "@/lib/game/utils/attribute-calculator";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
  // ARCHITECTURE: Handlers should work with IDs when possible
  // 1. Check if input is already an ID (from AI)
  // 2. Fallback to name matching if needed (legacy/edge cases)

  let itemId: ItemId | null = null;

  // Direct ID lookup (preferred - no ambiguity)
  if (itemName.startsWith('item_') && game.items[itemName as ItemId]) {
    itemId = itemName as ItemId;
  } else {
    // Fallback: Fuzzy name matching
    const normalizedItemName = normalizeName(itemName);
    const itemMatch = findBestMatch(normalizedItemName, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: false,
      requireFocus: false
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

    itemId = itemMatch.id as ItemId;
  }
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
    let targetObjectId: GameObjectId | null = null;
    const normalizedTargetName = normalizeName(targetName);
    const isInDeviceMode = !!state.activeDeviceFocus;

    // Direct ID lookup (preferred - no ambiguity)
    if (targetName.startsWith('obj_') && game.gameObjects[targetName as GameObjectId]) {
      targetObjectId = targetName as GameObjectId;
    } else {
      // Fallback: Fuzzy name matching
      const targetMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: false,
        searchObjects: true,
        requireFocus: isInDeviceMode
      });

      if (targetMatch?.category === 'object') {
        targetObjectId = targetMatch.id as GameObjectId;
      }
    }

    if (targetObjectId) {
      const targetObject = game.gameObjects[targetObjectId];
      if (!targetObject) {
        const message = await MessageExpander.cantUseItem(game.systemMessages.cantUseItem, itemToUse.name);
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: message
        }];
      }

      // DEBUG: Log payphone state
      console.log(`🔍 USE HANDLER - PAYPHONE STATE CHECK:`);
      console.log(`   Target Object: ${targetObject.name}`);
      console.log(`   Has state system: ${!!targetObject.state?.stateMap}`);
      if (targetObject.state?.stateMap) {
        console.log(`   Current state: ${targetObject.state.currentStateId}`);
        console.log(`   Available states:`, Object.keys(targetObject.state.stateMap));
      }
      console.log(`   World state for this object:`, state.world?.[targetObjectId]);

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

      // ATTRIBUTE SYSTEM: Check if target has requirements (for containers/doors)
      if (targetObject.requirements && targetObject.capabilities.openable) {
        const attributeCheck = canOpenContainer(targetObject, [itemToUse], targetObject.name);

        if (!attributeCheck.success) {
          // Item doesn't meet requirements - return helpful message
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: attributeCheck.message
          }];
        }

        // Requirements met! Open the container and consume items if needed
        const effects: Effect[] = [];

        // Get current state to check if already open
        const runtimeState = GameStateManager.getEntityState(state, targetObjectId);

        if (runtimeState.isOpen) {
          return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `The ${targetObject.name} is already open.`
          }];
        }

        // Open the container
        effects.push({
          type: 'SET_ENTITY_STATE',
          entityId: targetObjectId,
          patch: { isOpen: true, isLocked: false }
        });

        // Show success message
        effects.push({
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: `You use the ${itemToUse.name} on the ${targetObject.name}. ${attributeCheck.message}`
        });

        // Consume items if needed
        if (attributeCheck.consumedItems && attributeCheck.consumedItems.length > 0) {
          for (const consumedItemId of attributeCheck.consumedItems) {
            effects.push({
              type: 'REMOVE_ITEM',
              itemId: consumedItemId
            });
          }
        }

        // Add focus effect
        const focusEffect = FocusManager.determineNextFocus({
          action: 'use',
          target: targetObjectId,
          targetType: 'object',
          actionSucceeded: true,
          currentFocus: state.currentFocusId,
          state,
          game
        });

        if (focusEffect) {
          effects.push(focusEffect);
        }

        return effects;
      }

      // IMPORTANT: Get raw handler from state overrides or base handlers
      // We need the RAW handler (not resolved) because USE handlers use item-based arrays
      // where we filter by itemId BEFORE evaluating conditions
      let useHandlers: any;

      const entityState = GameStateManager.getEntityState(state, targetObjectId);
      const currentStateId = entityState.currentStateId || 'default';

      // Check state override first (get raw value, don't resolve arrays yet)
      if (targetObject.stateMap?.[currentStateId]?.overrides?.onUse) {
        useHandlers = targetObject.stateMap[currentStateId].overrides.onUse;
      } else {
        // Fall back to base handlers
        useHandlers = targetObject.handlers?.onUse;
      }

      if (Array.isArray(useHandlers)) {
        // DEBUG: Log what we're looking for
        console.log(`🔍 USE HANDLER DEBUG:`);
        console.log(`   Looking for itemId: "${itemId}"`);
        console.log(`   Item name: "${itemToUse.name}"`);
        console.log(`   Target: "${targetObject.name}"`);
        console.log(`   Available handlers:`, useHandlers.map(h => ({ itemId: h.itemId, hasConditions: !!h.conditions })));

        // Find ALL handlers for this specific item
        const matchingHandlers = useHandlers.filter(h => h.itemId === itemId);

        console.log(`   Matching handlers found: ${matchingHandlers.length}`);

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
      // ITEM-ON-ITEM INTERACTION
      const targetItemId = targetItemMatch.id as ItemId;
      const targetItem = game.items[targetItemId];

      // Check if source item has onUse handler for this target item
      const useHandlers = itemToUse.handlers?.onUse;

      if (Array.isArray(useHandlers)) {
        console.log(`🔍 ITEM-ON-ITEM USE HANDLER DEBUG:`);
        console.log(`   Source item: "${itemToUse.name}" (${itemId})`);
        console.log(`   Target item: "${targetItem?.name}" (${targetItemId})`);
        console.log(`   Available handlers:`, useHandlers.map(h => ({ itemId: h.itemId, hasConditions: !!h.conditions })));

        // Find ALL handlers for this specific target item
        const matchingHandlers = useHandlers.filter(h => h.itemId === targetItemId);

        console.log(`   Matching handlers found: ${matchingHandlers.length}`);

        if (matchingHandlers.length > 0) {
          // Evaluate conditions for each matching handler
          // Return the FIRST one where conditions match
          for (const handler of matchingHandlers) {
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;
            const isFail = !conditionsMet;

            // If we have an outcome (either success with met conditions, or fail with unmet conditions)
            if (outcome) {
              console.log(`   ✅ Handler matched! Conditions met: ${conditionsMet}`);

              const effects = buildEffectsFromOutcome(outcome);

              // Add focus effect (items don't typically change focus, but include for consistency)
              const focusEffect = FocusManager.determineNextFocus({
                action: 'use',
                target: targetItemId,
                targetType: 'item',
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

      // No matching handler - show "can't use" message
      const messageKey = typeof game.systemMessages.cantUseOnTarget === 'function'
        ? game.systemMessages.cantUseOnTarget(itemToUse.name, targetItem?.name || targetName)
        : 'cant_use_item_on_target'; // Fallback keyword

      const { expandSystemMessage } = await import('@/lib/game/utils/message-expansion');
      const message = await expandSystemMessage(messageKey, {
        itemName: itemToUse.name,  // Use resolved item name, not ID
        targetName: targetItem?.name || targetName  // Use resolved item name, not ID
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
