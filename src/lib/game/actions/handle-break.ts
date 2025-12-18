
/**
 * handle-break - NEW ARCHITECTURE
 *
 * Handles breaking/destroying objects (without using another item).
 * For item-based breaking (e.g., "break window with rock"), use handle-use.ts instead.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { expandNarration } from "@/ai/expand-narration";

export async function handleBreak(state: PlayerState, targetName: string, game: Game, originalInput?: string): Promise<Effect[]> {
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

  // NOTE: Focus validation is handled by findBestMatch with requireFocus: true
  // No need for redundant validation here - if findBestMatch returned a result,
  // the object is accessible within the current focus

  // 2. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(targetObject, 'break', state, game);

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

  // 3. Evaluate handler outcome
  const { outcome, isFail } = evaluateHandlerOutcome(handler, state, game);

  if (!outcome) {
    if (handler.fallback) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: handler.fallback
      }];
    }
    const message = await expandNarration({
      keyword: 'cant_break_object',
      context: {
        objectName: targetObject.name,
        ...(originalInput ? { playerAction: originalInput } : {})
      },
      fallback: `You can't break the ${targetObject.name}.`
    });
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: message
    }];
  }

  // 4. Build effects (with media support)
  const effects: Effect[] = [];

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

  // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
  const focusEffect = FocusManager.determineNextFocus({
    action: 'break',
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
