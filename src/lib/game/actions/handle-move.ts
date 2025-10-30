
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

export async function handleMove(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTargetName = normalizeName(targetName);

    // 1. Find target object using focus-aware search
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
    const targetObjectId = visibleEntities.objects.find(id =>
        FocusResolver.matchesName(game.gameObjects[id as GameObjectId], normalizedTargetName)
    );

    if (!targetObjectId) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${targetName}" to move.`
        }];
    }

    const targetObject = game.gameObjects[targetObjectId as GameObjectId];
    if (!targetObject) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${targetName}" to move.`
        }];
    }

    // 2. FOCUS VALIDATION: Check if target is within current focus
    if (state.currentFocusId && state.focusType === 'object') {
        const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);

        // Check if target is the focused object itself or within it
        const isInFocus = targetObjectId === state.currentFocusId ||
                         entitiesInFocus.objects.includes(targetObjectId);

        if (!isInFocus) {
            // Target is out of focus - show helpful error
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'agent',
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
            content: `You move the ${targetObject.name} around, but find nothing of interest.`
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
            content: `You move the ${targetObject.name} around, but nothing happens.`
        }];
    }

    // 5. Build effects - IMPORTANT: State updates BEFORE messages
    const effects: Effect[] = [
        // Set focus on the object being moved
        {
            type: 'SET_FOCUS',
            focusId: targetObjectId,
            focusType: 'object',
            transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
        }
    ];

    // Add outcome effects so state is updated before message shows
    if (outcome.effects) {
        effects.push(...outcome.effects);
    }

    // Add message AFTER state updates (so createMessage sees updated state)
    if (outcome.message) {
        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: outcome.speaker || 'narrator',
            content: outcome.message,
            imageId: targetObjectId,  // Will resolve image based on updated currentStateId
            messageType: 'image'
        });
    }

    return effects;
}
