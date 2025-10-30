
'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
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
                content: game.systemMessages.cantOpen(targetName)
            }];
        }

        // 2. Get effective handler first (to check for specific fail messages)
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'open', state);

        // 3. If handler exists, evaluate conditions
        if (handler) {
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;

            // If conditions not met and we have a specific fail message, use it immediately
            // BUT: Still set focus so player can try password/unlock actions
            if (!conditionsMet && outcome?.message) {
                return [
                    {
                        type: 'SET_FOCUS',
                        focusId: targetObjectId,
                        focusType: 'object',
                        transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
                    },
                    {
                        type: 'SHOW_MESSAGE',
                        speaker: 'narrator',
                        content: outcome.message
                    }
                ];
            }

            // If conditions met, execute success
            if (conditionsMet && outcome) {
                const effects: Effect[] = [
                    // Set focus on this object FIRST
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
                        imageId: targetObjectId,
                        messageType: 'image'
                    });
                }

                return effects;
            }
        }

        // Generic fallback if no specific handler
        const effects = [{ type: 'SET_OBJECT_STATE' as const, objectId: liveObject.gameLogic.id, state: { isOpen: true } }];
        const result = await processEffects(state, effects, game);
        const genericOpenMessage = `You open the ${liveObject.gameLogic.name}.`;
        result.messages.unshift(createMessage('narrator', narratorName, genericOpenMessage));
        return result;
    }

    const itemToOpen = findItemInContext(state, game, normalizedTargetName);
    if (itemToOpen) {
        if (itemToOpen.item.capabilities && itemToOpen.item.capabilities.isReadable) {
            return handleRead(state, targetName, game);
        } else {
            return { newState: state, messages: [createMessage('narrator', narratorName, `You can't "open" the ${itemToOpen.item.name} in that way.`)] };
        }
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${normalizedTargetName}" to open.`)] };
}
