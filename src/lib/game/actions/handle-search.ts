
/**
 * handle-search - NEW ARCHITECTURE
 *
 * Handles searching objects (look inside, under, behind, through).
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver, GameStateManager, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
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

  // PRIORITY 1: Direct ID lookup (from AI) - skip fuzzy matching
  let bestMatch: { id: string; category: 'item' | 'object' | 'inventory' | 'visible-item' } | null = null;

  if (normalizedTargetName.startsWith('item_') && game.items[normalizedTargetName as ItemId]) {
    // Check if item is in inventory or visible
    if (state.inventory.includes(normalizedTargetName as ItemId)) {
      bestMatch = { id: normalizedTargetName, category: 'inventory' };
    } else {
      bestMatch = { id: normalizedTargetName, category: 'visible-item' };
    }
  } else if (normalizedTargetName.startsWith('obj_') && game.gameObjects[normalizedTargetName as GameObjectId]) {
    bestMatch = { id: normalizedTargetName, category: 'object' };
  }

  // PRIORITY 2: Fuzzy name matching (fallback for natural language)
  if (!bestMatch) {
    bestMatch = findBestMatch(normalizedTargetName, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: true,
      requireFocus: true
    });
  }

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
  // NOTE: Focus validation is handled by findBestMatch with requireFocus: true
  // No need for redundant validation here - if findBestMatch returned a result,
  // the object is accessible within the current focus (including descendants)

  // 3. Get effective handler (with stateMap composition)
  const handler = HandlerResolver.getEffectiveHandler(target, 'search', state, game);

  if (!handler) {
    // No handler - provide helpful fallback
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: target.handlers?.defaultFailMessage ||
               `You search the ${target.name} but find nothing of interest.`
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
      content: `You search the ${target.name} but find nothing.`
    }];
  }

  // 5. Build effects (with media support)
  const effects: Effect[] = [];

  // Use helper to build effects with automatic media extraction
  effects.push(...buildEffectsFromOutcome(
    outcome,
    targetObjectId ? (targetObjectId as GameObjectId) : (targetItemId as ItemId),
    targetObjectId ? 'object' : 'item',
    game,
    isFail
  ));

  // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
  const focusEffect = FocusManager.determineNextFocus({
    action: 'search',
    target: targetObjectId || targetItemId || targetId,
    targetType: targetObjectId ? 'object' : 'item',
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
