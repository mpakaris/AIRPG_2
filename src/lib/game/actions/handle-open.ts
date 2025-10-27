/**
 * handle-open - NEW ARCHITECTURE
 *
 * Handles the "open" action using the new effect-based system.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "@/lib/game/actions/handle-read";

export async function handleOpen(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTargetName = normalizeName(targetName);
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

    // 1. Find target object in visible objects
    const targetObjectId = visibleEntities.objects.find(id =>
        normalizeName(game.gameObjects[id as any]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const targetObject = game.gameObjects[targetObjectId as any];
        if (!targetObject) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: `You don't see a "${targetName}" to open.`
            }];
        }

        // 2. Validate action
        const validation = Validator.validate('open', targetObjectId, state, game);
        if (!validation.valid) {
            // Return validation reason or fallback message
            const message = validation.reason || HandlerResolver.getFallbackMessage(targetObject, 'notOpenable');
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: message
            }];
        }

        // 3. Get effective handler (with stateMap composition)
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'open', state);

        if (!handler) {
            // Generic open behavior - just set isOpen to true
            return [
                {
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: `You open the ${targetObject.name}.`
                },
                {
                    type: 'SET_ENTITY_STATE',
                    entityId: targetObjectId,
                    patch: { isOpen: true }
                }
            ];
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
                content: `You open the ${targetObject.name}.`
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
                imageId: targetObjectId,  // Pass entityId so image can be resolved
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

    // 2. Check if it's an item (redirect to read if readable)
    const itemId = state.inventory.find(id =>
        normalizeName(game.items[id]?.name).includes(normalizedTargetName)
    );

    if (itemId) {
        const item = game.items[itemId];
        if (item?.capabilities?.isReadable) {
            return await handleRead(state, targetName, game);
        } else {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `You can't "open" the ${item.name} in that way.`
            }];
        }
    }

    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `You don't see a "${targetName}" to open.`
    }];
}