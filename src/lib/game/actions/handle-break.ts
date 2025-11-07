
/**
 * handle-break - NEW ARCHITECTURE
 *
 * Handles breaking/destroying objects (without using another item).
 * For item-based breaking (e.g., "break window with rock"), use handle-use.ts instead.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleBreak(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTargetName = normalizeName(targetName);

  if (!normalizedTargetName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "You need to specify what to break."
    }];
  }

  // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
  const bestMatch = findBestMatch(normalizedTargetName, state, game, {
    searchInventory: false,
    searchVisibleItems: false,
    searchObjects: true,  // Can only break objects
    requireFocus: true
  });

  if (!bestMatch || bestMatch.category !== 'object') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `There's no "${targetName}" here to break.`
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
        content: FocusResolver.getOutOfFocusMessage('break', targetObject.name, state.currentFocusId, game)
      }];
    }
  }

  // 3. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(targetObject, 'break', state);

  if (!handler) {
    // No handler - check if object is breakable
    const isBreakable = targetObject.capabilities?.breakable;

    if (!isBreakable) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: targetObject.handlers?.defaultFailMessage ||
                 `The ${targetObject.name} can't be broken. Try a different approach.`
      }];
    }

    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You'd need something heavy to break the ${targetObject.name}.`
    }];
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
      content: `You can't break the ${targetObject.name}.`
    }];
  }

  // 5. Build effects (with media support)
  const effects: Effect[] = [
    // Set focus on the object being broken
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
