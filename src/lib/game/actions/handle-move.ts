
/**
 * handle-move - NEW ARCHITECTURE
 *
 * Handles the "move" action using the new effect-based system.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, HandlerResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleMove(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const location = game.locations[state.currentLocationId];
    const normalizedTargetName = normalizeName(targetName);

    // 1. Find target object
    const targetObjectId = location.objects.find(id =>
        game.gameObjects[id] && normalizeName(game.gameObjects[id].name).includes(normalizedTargetName)
    );

    if (!targetObjectId) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${targetName}" to move.`
        }];
    }

    const targetObject = game.gameObjects[targetObjectId];
    if (!targetObject) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${targetName}" to move.`
        }];
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

    // 5. Build effects
    const effects: Effect[] = [];

    // Add message if present
    if (outcome.message) {
        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: outcome.speaker || 'narrator',
            content: outcome.message,
            imageKey: outcome.media?.imageKey,
            soundKey: outcome.media?.soundKey,
            videoUrl: outcome.media?.videoUrl
        });
    }

    // Add outcome effects
    if (outcome.effects) {
        effects.push(...outcome.effects);
    }

    return effects;
}
