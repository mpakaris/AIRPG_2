
/**
 * handle-move - NEW ARCHITECTURE
 *
 * Handles the "move" action using the new effect-based system.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

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
        const message = await MessageExpander.cantMoveObject(game.systemMessages.cantMoveObject, targetName);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    const targetObjectId = bestMatch.id as GameObjectId;
    const targetObject = game.gameObjects[targetObjectId];
    if (!targetObject) {
        const message = await MessageExpander.cantMoveObject(game.systemMessages.cantMoveObject, targetName);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // 2. FOCUS VALIDATION: Check if target is within current focus
    // NOTE: Focus validation is handled by findBestMatch with requireFocus: true
    // No need for redundant validation here - if findBestMatch returned a result,
    // the object is accessible within the current focus (including descendants)

    // 2. Get effective handler first (to check for custom fail messages)
    const handler = HandlerResolver.getEffectiveHandler(targetObject, 'move', state, game);

    // 3. Validate action (but use custom handler fail message if available)
    const validation = Validator.validate('move', targetObjectId, state, game);
    if (!validation.valid) {
        // Check if handler has a custom fail message
        if (handler?.fail?.message) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: handler.fail.message
            }];
        }
        // Use fallback message or validation reason
        const message = validation.reason || HandlerResolver.getFallbackMessage(targetObject, 'notMovable');
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    if (!handler) {
        const message = await MessageExpander.static(game.systemMessages.movedNothingFound(targetObject.name));
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
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
        const message = await MessageExpander.static(game.systemMessages.movedNothingFound(targetObject.name));
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    // 5. Build effects (with media support)
    const effects: Effect[] = [];

    // Use helper to build effects with automatic media extraction
    effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, !conditionsMet));

    // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
    const focusEffect = FocusManager.determineNextFocus({
        action: 'move',
        target: targetObjectId,
        targetType: 'object',
        actionSucceeded: conditionsMet,
        currentFocus: state.currentFocusId,
        state,
        game
    });

    if (focusEffect) {
        effects.push(focusEffect);
    }

    return effects;
}
