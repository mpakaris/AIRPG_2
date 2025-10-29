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

    // Helper function for robust name matching
    const matchesName = (entity: any, searchName: string): boolean => {
        if (!entity) return false;

        // Try matching against the entity name
        if (normalizeName(entity.name).includes(searchName)) return true;

        // Try matching against alternate names
        if (entity.alternateNames) {
            const matchesAlt = entity.alternateNames.some((altName: string) =>
                normalizeName(altName).includes(searchName)
            );
            if (matchesAlt) return true;
        }

        // FALLBACK: Try matching against the entity ID (for AI mistakes)
        const entityIdNormalized = normalizeName(entity.id);
        if (entityIdNormalized === searchName || entityIdNormalized.includes(searchName) || searchName.includes(entityIdNormalized)) {
            return true;
        }

        // Also try without the prefix and underscores
        const idWithoutPrefix = entity.id.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '').toLowerCase();
        const searchWithoutPrefix = searchName.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '');
        if (idWithoutPrefix === searchWithoutPrefix || idWithoutPrefix.includes(searchWithoutPrefix) || searchWithoutPrefix.includes(idWithoutPrefix)) {
            return true;
        }

        return false;
    };

    // 1. Find target object in visible objects
    const targetObjectId = visibleEntities.objects.find(id =>
        matchesName(game.gameObjects[id as any], normalizedTargetName)
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

        // 2. Get effective handler first (to check for specific fail messages)
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'open', state);

        // 3. If handler exists, evaluate conditions
        if (handler) {
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;

            // If conditions not met and we have a specific fail message, use it immediately
            if (!conditionsMet && outcome?.message) {
                return [{
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: outcome.message
                }];
            }

            // If conditions met, execute success
            if (conditionsMet && outcome) {
                const effects: Effect[] = [];

                // Add outcome effects FIRST so state is updated before message shows
                if (outcome.effects) {
                    effects.push(...outcome.effects);
                }

                // Add message AFTER state updates (so createMessage sees updated state)
                if (outcome.message) {
                    effects.push({
                        type: 'SHOW_MESSAGE',
                        speaker: outcome.speaker || 'narrator',
                        content: outcome.message,
                        imageId: targetObjectId,
                        messageType: 'image'
                    });
                }

                return effects;
            }
        }

        // 4. Validate action (only if no specific handler fail message was used)
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

        // 5. No handler or no specific outcome - generic open behavior
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

    // 2. Check if it's a visible item (redirect to read if readable)
    const visibleItemId = visibleEntities.items.find(id =>
        matchesName(game.items[id as any], normalizedTargetName)
    );

    if (visibleItemId) {
        const item = game.items[visibleItemId as any];
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