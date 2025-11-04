
/**
 * handle-read - NEW ARCHITECTURE
 *
 * Handles reading items (documents, books, etc.).
 * Supports stateMap for progressive content.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { HandlerResolver, GameStateManager, VisibilityResolver, Validator, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<Effect[]> {
    if (!itemName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.needsTarget.read
        }];
    }

    // Check if this is "read X with/on Y" pattern (e.g., "read sd card on phone")
    // DO THIS BEFORE NORMALIZING (need spaces for pattern matching)
    const withMatch = itemName.match(/^(.+?)\s+(with|on|using|in)\s+(?:the|a|an\s+)?(.+)$/i);
    if (withMatch && withMatch[1].trim() && withMatch[3].trim()) {
        const itemPart = withMatch[1].trim();
        const targetPart = withMatch[3].trim();

        // Skip if the target part is too short (likely part of entity name)
        if (targetPart.length > 2) {
            return await handleReadItemWithTarget(state, itemPart, targetPart, game);
        }
    }

    // Now normalize for standard read handling
    const normalizedItemName = normalizeName(itemName);

    if (!normalizedItemName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.needsTarget.read
        }];
    }

    // Use findBestMatch for consistent, location-aware matching
    const itemMatch = findBestMatch(normalizedItemName, state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true  // Some readable things might be objects
    });

    if (!itemMatch) {
        // Debug: check if books are visible
        const visibleEntities = require('@/lib/game/engine').VisibilityResolver.getVisibleEntities(state, game);
        console.log('[handleRead] Item not found. Search term:', normalizedItemName);
        console.log('[handleRead] Visible items:', visibleEntities.items);
        console.log('[handleRead] Bookshelf state:', require('@/lib/game/engine').GameStateManager.getEntityState(state, 'obj_bookshelf'));
        console.log('[handleRead] Book deal state:', require('@/lib/game/engine').GameStateManager.getEntityState(state, 'item_book_deal'));

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.notVisible(itemName)
        }];
    }

    const entityId = itemMatch.id;
    const entityType = itemMatch.category === 'object' ? 'object' : 'item';
    const entityToRead = entityType === 'object'
        ? game.gameObjects[entityId as GameObjectId]
        : game.items[entityId as ItemId];

    // 2. Check if readable
    const isReadable = entityType === 'item'
        ? (entityToRead as any).capabilities?.isReadable
        : (entityToRead as any).capabilities?.readable;

    if (!isReadable) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: game.systemMessages.notReadable(entityToRead.name)
        }];
    }

    // 3. Check for stateMap (progressive content)
    if (entityToRead.stateMap && Object.keys(entityToRead.stateMap).length > 0 && entityId) {
        const entityState = GameStateManager.getEntityState(state, entityId);
        const currentReadCount = entityState.readCount || 0;
        const stateMapKeys = Object.keys(entityToRead.stateMap);

        console.log('[handleRead] Progressive reading:', {
            entityId,
            currentReadCount,
            stateMapKeys,
            entityState
        });

        // Check if all content has been read
        if (currentReadCount >= stateMapKeys.length) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: entityId ? game.systemMessages.alreadyReadAll(entityToRead.name) : "Nothing more to read."
            }];
        }

        // Get current state entry
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = entityToRead.stateMap[currentStateKey];

        if (!stateMapEntry || typeof stateMapEntry.description !== 'string') {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: game.systemMessages.textIllegible
            }];
        }

        // Return effects to show content and increment read count
        return [
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: stateMapEntry.description,
                messageType: 'text'
            },
            {
                type: 'INCREMENT_ITEM_READ_COUNT',
                itemId: entityId as any
            }
        ];
    }

    // 4. Check for onRead handler
    const handler = entityToRead.handlers?.onRead;
    if (handler && !Array.isArray(handler) && (handler as any).success) {
        const effects: Effect[] = [];
        const successOutcome = (handler as any).success;

        if (successOutcome.message) {
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: successOutcome.message,
                messageType: 'text'
            });
        }

        if (successOutcome.effects) {
            effects.push(...successOutcome.effects);
        }

        return effects;
    }

    // 5. Fallback: just show description
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: entityToRead.description,
        messageType: 'image',
        imageId: entityId as any
    }];
}

/**
 * Handle "read X with/on Y" pattern (e.g., "read sd card on phone")
 * This allows reading objects that require tools/devices
 */
async function handleReadItemWithTarget(state: PlayerState, targetName: string, toolName: string, game: Game): Promise<Effect[]> {
    // Find the target (thing to read - usually an object like SD card)
    const targetMatch = findBestMatch(normalizeName(targetName), state, game, {
        searchInventory: false,
        searchVisibleItems: true,
        searchObjects: true
    });

    if (!targetMatch) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.notVisible(targetName)
        }];
    }

    // Find the tool (thing to read with - usually an item like phone)
    const toolMatch = findBestMatch(normalizeName(toolName), state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true
    });

    if (!toolMatch) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.notVisible(toolName)
        }];
    }

    const toolId = toolMatch.id;
    const targetId = targetMatch.id;
    const target = targetMatch.category === 'object'
        ? game.gameObjects[targetId as any]
        : game.items[targetId as any];

    if (!target) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `Can't read ${targetName}.`
        }];
    }

    // Check for onRead handlers that accept this tool
    const readHandlers = target.handlers?.onRead;
    if (Array.isArray(readHandlers)) {
        const specificHandler = readHandlers.find((h: any) => h.itemId === toolId);
        if (specificHandler) {
            const conditionsMet = Validator.evaluateConditions(specificHandler.conditions, state, game);
            const outcome = conditionsMet ? specificHandler.success : specificHandler.fail;

            if (outcome) {
                const effects: Effect[] = [];
                // Set focus on target if it's not personal equipment (objects only)
                const isPersonalEquipment = targetMatch.category === 'object' && (target as any).personal === true;
                if (targetMatch.category === 'object' && !isPersonalEquipment) {
                    effects.push({
                        type: 'SET_FOCUS',
                        focusId: targetId as GameObjectId,
                        focusType: 'object',
                        transitionMessage: FocusResolver.getTransitionNarration(targetId as GameObjectId, 'object', state, game) || undefined
                    });
                }
                effects.push(...buildEffectsFromOutcome(outcome, targetId as any, targetMatch.category === 'object' ? 'object' : 'item'));
                return effects;
            }
        }
    }

    // No handler found
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You can't read ${target.name} with ${toolName}.`
    }];
}
