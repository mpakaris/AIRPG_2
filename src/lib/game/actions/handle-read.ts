
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
import { buildEffectsFromOutcome, resolveConditionalHandler, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";

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
    // IMPORTANT: Respect focus boundaries to prevent cross-contamination
    const itemMatch = findBestMatch(normalizedItemName, state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true,  // Some readable things might be objects
        requireFocus: true    // Only search within current focus (if active)
    });

    if (!itemMatch) {
        // Entity not found in focus - provide smart guidance
        const smartMessage = getSmartNotFoundMessage(normalizedItemName, state, game, {
            searchInventory: true,
            searchVisibleItems: true,
            searchObjects: true
        });

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: smartMessage.message
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

    // 4. Check for onRead handler (supports both arrays and single handlers using helper)
    const handler = resolveConditionalHandler(entityToRead.handlers?.onRead, state, game);

    if (handler) {
        // Evaluate the handler's outcome based on conditions
        const { outcome, isFail } = evaluateHandlerOutcome(handler, state, game);

        if (outcome) {
            return buildEffectsFromOutcome(outcome, entityId as any, entityType, game, isFail);
        }
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
        searchObjects: true,
        requireFocus: true  // Respect focus boundaries
    });

    if (!targetMatch) {
        // Entity not found in focus - provide smart guidance
        const smartMessage = getSmartNotFoundMessage(normalizeName(targetName), state, game, {
            searchInventory: false,
            searchVisibleItems: true,
            searchObjects: true
        });

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: smartMessage.message
        }];
    }

    // Find the tool (thing to read with - usually an item like phone)
    const toolMatch = findBestMatch(normalizeName(toolName), state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true,
        requireFocus: false  // Tools can be in inventory (always accessible)
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
            const isFail = !conditionsMet;

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
                effects.push(...buildEffectsFromOutcome(outcome, targetId as any, targetMatch.category === 'object' ? 'object' : 'item', game, isFail));
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
