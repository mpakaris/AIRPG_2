
/**
 * handle-close - NEW ARCHITECTURE
 *
 * Handles closing objects (doors, containers, etc.).
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleClose(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTargetName = normalizeName(targetName);

  if (!normalizedTargetName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "You need to specify what to close."
    }];
  }

  // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
  const bestMatch = findBestMatch(normalizedTargetName, state, game, {
    searchInventory: false,
    searchVisibleItems: false,
    searchObjects: true,
    requireFocus: true
  });

  if (!bestMatch || bestMatch.category !== 'object') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `There's no "${targetName}" here to close.`
    }];
  }

  const targetObjectId = bestMatch.id as GameObjectId;
  const targetObject = game.gameObjects[targetObjectId];
  if (!targetObject) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `Object "${targetName}" not found.`
    }];
  }

  // 2. FOCUS VALIDATION: Check if target is within current focus
  // NOTE: Focus validation is handled by findBestMatch with requireFocus: true
  // No need for redundant validation here - if findBestMatch returned a result,
  // the object is accessible within the current focus (including descendants)

  // 3. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(targetObject, 'close', state, game);

  if (!handler) {
    // No handler - check if object is closeable
    const isCloseable = targetObject.capabilities?.openable; // If openable, it's closeable

    if (!isCloseable) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: targetObject.handlers?.defaultFailMessage ||
                 `The ${targetObject.name} can't be closed.`
      }];
    }

    // Default: close it
    const effects: Effect[] = [
      {
        type: 'SET_ENTITY_STATE',
        entityId: targetObjectId,
        patch: { isOpen: false }
      },
      {
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You close the ${targetObject.name}.`
      }
    ];

    // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
    const focusEffect = FocusManager.determineNextFocus({
      action: 'close',
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

  // 4. Evaluate handler outcome
  const { outcome, isFail } = evaluateHandlerOutcome(handler, state, game);

  if (!outcome) {
    if (handler.fallback) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: handler.fallback
      }];
    }
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You can't close the ${targetObject.name}.`
    }];
  }

  // 5. Build effects (with media support)
  const effects: Effect[] = [];

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

  // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
  const focusEffect = FocusManager.determineNextFocus({
    action: 'close',
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
