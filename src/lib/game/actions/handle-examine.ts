/**
 * handle-examine - NEW ARCHITECTURE
 *
 * Handles examining objects and items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, VisibilityResolver, GameStateManager, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "./handle-read";

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

    // 1. Check for item in inventory
    const itemId = state.inventory.find(id =>
        matchesName(game.items[id], normalizedTarget)
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

        // SMART REDIRECT: For books and documents, examining means reading
        if (item.archetype === 'Book' || item.archetype === 'Document' || item.archetype === 'Media') {
            if (item.capabilities?.isReadable) {
                return await handleRead(state, targetName, game);
            }
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

        const effects: Effect[] = [
            // Set focus on this item
            {
                type: 'SET_FOCUS',
                focusId: itemId,
                focusType: 'item',
                transitionMessage: FocusResolver.getTransitionNarration(itemId, 'item', state, game) || undefined
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: messageText,
                messageType: 'image',
                imageId: itemId  // Image will be resolved by process-effects.ts via createMessage
            }
        ];

        if (!isAlreadyExamined) {
            effects.push({
                type: 'SET_FLAG',
                flag,
                value: true
            });
        }

        return effects;
    }

    // 2. Check for visible items (not yet taken)
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
    const visibleItemId = visibleEntities.items.find(id =>
        !state.inventory.includes(id as any) && matchesName(game.items[id as any], normalizedTarget)
    );

    if (visibleItemId) {
        const item = game.items[visibleItemId as any];

        // SMART REDIRECT: For books and documents, examining means reading
        if (item?.archetype === 'Book' || item?.archetype === 'Document' || item?.archetype === 'Media') {
            if (item.capabilities?.isReadable) {
                return await handleRead(state, targetName, game);
            }
        }

        // Regular examine for other visible items
        if (item) {
            const flag = examinedObjectFlag(item.id);
            const isAlreadyExamined = GameStateManager.hasFlag(state, flag);
            let messageText = HandlerResolver.getEffectiveDescription(item, state) || item.description;

            const handler = HandlerResolver.getEffectiveHandler(item, 'examine', state);
            if (handler?.success?.message) {
                messageText = handler.success.message;
            } else if (isAlreadyExamined && item.alternateDescription) {
                messageText = item.alternateDescription;
            }

            const effects: Effect[] = [
                // Set focus on this item
                {
                    type: 'SET_FOCUS',
                    focusId: visibleItemId,
                    focusType: 'item',
                    transitionMessage: FocusResolver.getTransitionNarration(visibleItemId, 'item', state, game) || undefined
                },
                {
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: messageText,
                    messageType: 'image',
                    imageId: visibleItemId
                }
            ];

            if (!isAlreadyExamined) {
                effects.push({
                    type: 'SET_FLAG',
                    flag,
                    value: true
                });
            }

            return effects;
        }
    }

    // 3. Check for object in location
    const targetObjectId = visibleEntities.objects.find(id =>
        matchesName(game.gameObjects[id as any], normalizedTarget)
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

        const effects: Effect[] = [
            // Set focus on this object
            {
                type: 'SET_FOCUS',
                focusId: targetObjectId,
                focusType: 'object',
                transitionMessage: FocusResolver.getTransitionNarration(targetObjectId, 'object', state, game) || undefined
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: messageContent,
                messageType: 'image',
                imageId: targetObjectId  // Image will be resolved by process-effects.ts via createMessage
            }
        ];

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
