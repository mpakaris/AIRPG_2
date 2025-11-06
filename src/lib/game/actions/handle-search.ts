
/**
 * handle-search - NEW ARCHITECTURE
 *
 * Handles searching objects (look inside, under, behind, through).
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleSearch(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTargetName = normalizeName(targetName);

  if (!normalizedTargetName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: "You need to specify what to search."
    }];
  }

  // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
  const bestMatch = findBestMatch(normalizedTargetName, state, game, {
    searchInventory: true,
    searchVisibleItems: true,
    searchObjects: true,
    requireFocus: true
  });

  if (!bestMatch) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `There's no "${targetName}" here to search.`
    }];
  }

  const targetId = bestMatch.id;
  const target = bestMatch.category === 'object'
    ? game.gameObjects[targetId as GameObjectId]
    : game.items[targetId as ItemId];

  if (!target) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `There's no "${targetName}" here to search.`
    }];
  }

  const targetObjectId = bestMatch.category === 'object' ? targetId : null;
  const targetItemId = bestMatch.category !== 'object' ? targetId : null;

  // 2. FOCUS VALIDATION: Check if target is within current focus
  if (state.currentFocusId && state.focusType === 'object' && targetObjectId) {
    const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);

    const isInFocus = targetObjectId === state.currentFocusId ||
                     entitiesInFocus.objects.includes(targetObjectId);

    if (!isInFocus) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: FocusResolver.getOutOfFocusMessage('search', target.name, state.currentFocusId, game)
      }];
    }
  }

  // 3. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(target, 'search', state);

  if (!handler) {
    // No handler - provide helpful fallback
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: target.handlers?.defaultFailMessage ||
               `You search the ${target.name} but find nothing of interest.`
    }];
  }

  // 4. Evaluate conditions
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;

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
      content: `You search the ${target.name} but find nothing.`
    }];
  }

  // 5. Build effects (with media support)
  const effects: Effect[] = [];

  // Set focus on the target being searched (if object)
  if (targetObjectId) {
    effects.push({
      type: 'SET_FOCUS',
      focusId: targetObjectId,
      focusType: 'object',
      transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
    });
  }

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(
    outcome,
    targetObjectId ? (targetObjectId as GameObjectId) : (targetItemId as ItemId),
    targetObjectId ? 'object' : 'item'
  ));

  return effects;
}
