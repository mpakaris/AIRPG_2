
'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "@/lib/game/actions/handle-read";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleOpen(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTargetName = normalizeName(targetName);

    // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
    const bestMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: true,  // Check items (for readable items)
        searchObjects: true
    });

    // 1. Handle objects (doors, containers, etc.)
    if (bestMatch?.category === 'object') {
        const targetObjectId = bestMatch.id as GameObjectId;
        const targetObject = game.gameObjects[targetObjectId];
        if (!targetObject) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: game.systemMessages.cantOpen(targetName)
            }];
        }

        // Get effective handler first (to check for specific fail messages)
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'open', state);

        // If handler exists, evaluate conditions
        if (handler) {
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;

            // If conditions not met and we have a specific fail message, use it immediately
            // BUT: Still set focus so player can try password/unlock actions
            if (!conditionsMet && outcome?.message) {
                const effects: Effect[] = [];

                // Only set focus if NOT personal equipment
                if (targetObject.personal !== true) {
                    effects.push({
                        type: 'SET_FOCUS',
                        focusId: targetObjectId,
                        focusType: 'object',
                        transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
                    });
                }

                // Use helper to extract media from outcome
                effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object'));

                return effects;
            }

            // If conditions met, execute success
            if (conditionsMet && outcome) {
                const effects: Effect[] = [];

                // Only set focus if NOT personal equipment
                if (targetObject.personal !== true) {
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
        }

        // Generic fallback if no specific handler - set isOpen to true
        const effects: Effect[] = [];

        // Only set focus if NOT personal equipment
        if (targetObject.personal !== true) {
            effects.push({
                type: 'SET_FOCUS',
                focusId: targetObjectId,
                focusType: 'object',
                transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
            });
        }

        effects.push(
            {
                type: 'SET_ENTITY_STATE',
                entityId: targetObjectId,
                patch: { isOpen: true }
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `You open the ${targetObject.name}.`
            }
        );

        return effects;
    }

    // 2. Handle items (redirect readable items to handleRead)
    if (bestMatch?.category === 'visible-item' || bestMatch?.category === 'inventory') {
        const item = game.items[bestMatch.id as ItemId];
        if (item?.capabilities && item.capabilities.isReadable) {
            return handleRead(state, targetName, game);
        } else {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `You can't "open" the ${item?.name || targetName} in that way.`
            }];
        }
    }

    // 3. Not found
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `You don't see a "${targetName}" to open.`
    }];
}
