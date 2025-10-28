/**
 * handle-examine - NEW ARCHITECTURE
 *
 * Handles examining objects and items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, VisibilityResolver, GameStateManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleExamine(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTarget = normalizeName(targetName);

    if (!normalizedTarget) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'You need to specify what to examine.'
        }];
    }

    // 1. Check for item in inventory
    const itemId = state.inventory.find(id =>
        normalizeName(game.items[id]?.name).includes(normalizedTarget)
    );

    if (itemId) {
        const item = game.items[itemId];
        if (!item) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: `You don't see a "${targetName}" here.`
            }];
        }

        const flag = examinedObjectFlag(item.id);
        const isAlreadyExamined = GameStateManager.hasFlag(state, flag);

        // Get description using HandlerResolver for stateMap support
        let messageText = HandlerResolver.getEffectiveDescription(item, state) || item.description;

        // Check for onExamine handler
        const handler = HandlerResolver.getEffectiveHandler(item, 'examine', state);
        if (handler) {
            // Legacy support: check for alternateMessage
            const legacyHandler = item.handlers?.onExamine as any;
            if (isAlreadyExamined && legacyHandler?.alternateMessage) {
                messageText = legacyHandler.alternateMessage;
            } else if (handler.success?.message) {
                messageText = handler.success.message;
            }
        } else if (isAlreadyExamined && item.alternateDescription) {
            messageText = item.alternateDescription;
        }

        const effects: Effect[] = [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: messageText,
            messageType: 'image',
            imageId: itemId  // Image will be resolved by process-effects.ts via createMessage
        }];

        if (!isAlreadyExamined) {
            effects.push({
                type: 'SET_FLAG',
                flag,
                value: true
            });
        }

        return effects;
    }

    // 2. Check for object in location
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
    const targetObjectId = visibleEntities.objects.find(id =>
        normalizeName(game.gameObjects[id as any]?.name).includes(normalizedTarget)
    );

    if (targetObjectId) {
        const targetObject = game.gameObjects[targetObjectId as any];
        if (!targetObject) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: `You don't see a "${targetName}" here.`
            }];
        }

        const flag = examinedObjectFlag(targetObject.id);
        const hasBeenExamined = GameStateManager.hasFlag(state, flag);

        // Get effective description (with stateMap support)
        let messageContent = HandlerResolver.getEffectiveDescription(targetObject, state);

        // Check for onExamine handler
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'examine', state);
        if (handler) {
            // Legacy support: check for alternateMessage
            const legacyHandler = targetObject.handlers?.onExamine as any;
            if (hasBeenExamined && legacyHandler?.alternateMessage) {
                messageContent = legacyHandler.alternateMessage;
            } else if (handler.success?.message) {
                messageContent = handler.success.message;
            }
        }

        // Fallback to base description
        if (!messageContent) {
            messageContent = targetObject.description;
        }

        const effects: Effect[] = [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: messageContent,
            messageType: 'image',
            imageId: targetObjectId  // Image will be resolved by process-effects.ts via createMessage
        }];

        if (!hasBeenExamined) {
            effects.push({
                type: 'SET_FLAG',
                flag,
                value: true
            });
        }

        return effects;
    }

    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `You don't see a "${targetName}" here.`
    }];
}
