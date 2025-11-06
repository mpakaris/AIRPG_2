
/**
 * handle-move - NEW ARCHITECTURE
 *
 * Handles the "move" action using the new effect-based system.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleMove(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTargetName = normalizeName(targetName);

    // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
    const bestMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: false,
        searchObjects: true,  // Can only move objects
        requireFocus: true
    });

    if (!bestMatch || bestMatch.category !== 'object') {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.cantMoveObject(targetName)
        }];
    }

    const targetObjectId = bestMatch.id as GameObjectId;
    const targetObject = game.gameObjects[targetObjectId];
    if (!targetObject) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.cantMoveObject(targetName)
        }];
    }

    // 2. FOCUS VALIDATION: Check if target is within current focus
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
                content: FocusResolver.getOutOfFocusMessage('move', targetObject.name, state.currentFocusId, game)
            }];
        }
    }

    // 2. Validate action
    const validation = Validator.validate('move', targetObjectId, state, game);
    if (!validation.valid) {
        // Use fallback message or validation reason
        const message = validation.reason || HandlerResolver.getFallbackMessage(targetObject, 'notMovable');
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    // 3. Get effective handler (with stateMap composition)
    const handler = HandlerResolver.getEffectiveHandler(targetObject, 'move', state);

    if (!handler) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: game.systemMessages.movedNothingFound(targetObject.name)
        }];
    }

    // 4. Evaluate conditions
    const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
    const outcome = conditionsMet ? handler.success : handler.fail;

    if (!outcome) {
        // Use fallback if present
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
            content: game.systemMessages.movedNothingFound(targetObject.name)
        }];
    }

    // 5. Build effects (with media support)
    const effects: Effect[] = [];

    // Only set focus if NOT personal equipment
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
