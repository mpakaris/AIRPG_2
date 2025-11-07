
/**
 * handle-close - NEW ARCHITECTURE
 *
 * Handles closing objects (doors, containers, etc.).
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
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
  if (state.currentFocusId && state.focusType === 'object') {
    const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);

    const isInFocus = targetObjectId === state.currentFocusId ||
                     entitiesInFocus.objects.includes(targetObjectId);

    if (!isInFocus) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: FocusResolver.getOutOfFocusMessage('close', targetObject.name, state.currentFocusId, game)
      }];
    }
  }

  // 3. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(targetObject, 'close', state);

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
    return [
      {
        type: 'SET_FOCUS',
        focusId: targetObjectId,
        focusType: 'object',
        transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
      },
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
  const effects: Effect[] = [
    // Set focus on the object being closed
    {
      type: 'SET_FOCUS',
      focusId: targetObjectId,
      focusType: 'object',
      transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
    }
  ];

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

  return effects;
}
