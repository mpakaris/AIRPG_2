/**
 * handle-examine - NEW ARCHITECTURE
 *
 * Handles examining objects and items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, ItemId, GameObjectId } from "@/lib/game/types";
import { HandlerResolver, GameStateManager, FocusResolver, Validator, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "./handle-read";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { MessageExpander } from "@/lib/game/utils/message-expansion";
import { logEntityDebug } from "@/lib/game/utils/debug-helpers";
import { getSmartNotFoundMessage } from "@/lib/game/utils/smart-messages";
import { generateCantAccessMessage } from "@/ai";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleExamine(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    let normalizedTarget = normalizeName(targetName);

    // FALLBACK: If no target provided but player has focus, examine the focused object
    if (!normalizedTarget && state.focus?.focusId) {
        const focusedEntity = game.gameObjects[state.focus.focusId as any] || game.items[state.focus.focusId as any];
        if (focusedEntity) {
            normalizedTarget = normalizeName(focusedEntity.name);
        }
    }

    if (!normalizedTarget) {
        const message = await MessageExpander.static(game.systemMessages.needsTarget.examine);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Check if this is "examine X with/on Y" pattern
    // Only match if connector is followed by another word (not just "the", "a", "an")
    // This prevents matching entity names like "Painting on the wall"
    const withMatch = normalizedTarget.match(/^(.+?)\s+(with|on|using|in)\s+(?:the|a|an\s+)?(\w+[\w\s]*)$/);
    if (withMatch && withMatch[1].trim() && withMatch[3].trim()) {
        // Additional check: make sure we have TWO distinct entities, not one name with "on/with" in it
        const itemPart = withMatch[1].trim();
        const targetPart = withMatch[3].trim();

        // Skip if the target part is too short or common (likely part of entity name)
        if (targetPart.length > 3 && !['wall', 'table', 'floor', 'ground'].includes(targetPart)) {
            return await handleExamineItemOnTarget(state, itemPart, targetPart, game);
        }
    }

    // Otherwise, standard examination
    // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
    // Allow examining anything visible in the location, not just within current focus
    const bestMatch = findBestMatch(normalizedTarget, state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true,
        requireFocus: false  // Allow examining objects outside current focus
    });

    // NEW ZONE ARCHITECTURE: Check zone access for objects and items
    if (bestMatch && (bestMatch.category === 'object' || bestMatch.category === 'item')) {
        const { ZoneManager } = await import('@/lib/game/engine');
        const targetType = bestMatch.category === 'object' ? 'object' : 'item';
        const accessCheck = ZoneManager.canAccess(
            bestMatch.id as GameObjectId | ItemId,
            targetType,
            state,
            game
        );

        if (!accessCheck.allowed) {
            // Generate AI-powered narrative failure message
            let errorMessage: string;

            if (accessCheck.reason === 'out_of_zone') {
                try {
                    const location = game.locations[state.currentLocationId];
                    const aiResult = await generateCantAccessMessage({
                        targetName: accessCheck.targetName || targetName,
                        action: 'examine',
                        locationName: location?.name || 'Unknown',
                        gameSetting: game.setting || 'Modern-day detective game'
                    });
                    errorMessage = aiResult.output.message;
                } catch (error) {
                    console.error("AI generation failed for cant-access message:", error);
                    errorMessage = `You can't examine that from here.`;
                }
            } else if (accessCheck.reason === 'container_closed') {
                errorMessage = `You'll need to open the container first before you can examine what's inside.`;
            } else {
                errorMessage = 'You cannot examine that from here';
            }

            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: errorMessage
            }];
        }
    }

    // Process the best match found
    if (bestMatch?.category === 'inventory') {
        const itemId = bestMatch.id as ItemId;
        const item = game.items[itemId];
        if (!item) {
            const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: message
            }];
        }

        // SMART REDIRECT: For books and documents, only redirect if no onExamine handler exists
        if (item.archetype === 'Book' || item.archetype === 'Document' || item.archetype === 'Media') {
            const hasExamineHandler = HandlerResolver.getEffectiveHandler(item, 'examine', state, game);
            if (item.capabilities?.isReadable && !hasExamineHandler) {
                return await handleRead(state, targetName, game);
            }
        }

        const flag = examinedObjectFlag(item.id);
        const isAlreadyExamined = GameStateManager.hasFlag(state, flag);

        // Get description using HandlerResolver for stateMap support
        let messageText = HandlerResolver.getEffectiveDescription(item, state) || item.description;

        // Check for onExamine handler
        const handler = HandlerResolver.getEffectiveHandler(item, 'examine', state, game);
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

        const effects: Effect[] = [];

        // Build message with media support
        if (handler) {
            // CRITICAL: Evaluate handler conditions to determine success vs fail outcome
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;
            const isFail = !conditionsMet;

            if (outcome) {
                // Use outcome helper to extract message, media AND effects
                effects.push(...buildEffectsFromOutcome(
                    { message: outcome.message || messageText, ...outcome },
                    itemId,
                    'item',
                    game,
                    isFail
                ));
            } else {
                // No outcome available - fallback
                effects.push({
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: messageText,
                    messageType: 'image',
                    imageId: itemId
                });
            }
        } else {
            // Fallback: standard message without outcome media
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: messageText,
                messageType: 'image',
                imageId: itemId
            });
        }

        if (!isAlreadyExamined) {
            effects.push({
                type: 'SET_FLAG',
                flag,
                value: true
            });
        }

        // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
        const focusEffect = FocusManager.determineNextFocus({
            action: 'examine',
            target: itemId,
            targetType: 'item',
            actionSucceeded: true,
            currentFocus: state.currentFocusId,
            state,
            game
        });

        if (focusEffect) {
            effects.push(focusEffect);
        }

        return effects;
    } else if (bestMatch?.category === 'visible-item') {
        const visibleItemId = bestMatch.id as ItemId;
        const item = game.items[visibleItemId];

        // SMART REDIRECT: For books and documents, only redirect if no onExamine handler exists
        if (item?.archetype === 'Book' || item?.archetype === 'Document' || item?.archetype === 'Media') {
            const hasExamineHandler = HandlerResolver.getEffectiveHandler(item, 'examine', state, game);
            if (item.capabilities?.isReadable && !hasExamineHandler) {
                return await handleRead(state, targetName, game);
            }
        }

        // Regular examine for other visible items
        if (item) {
            const flag = examinedObjectFlag(item.id);
            const isAlreadyExamined = GameStateManager.hasFlag(state, flag);
            let messageText = HandlerResolver.getEffectiveDescription(item, state) || item.description;

            const handler = HandlerResolver.getEffectiveHandler(item, 'examine', state, game);
            if (handler?.success?.message) {
                messageText = handler.success.message;
            } else if (isAlreadyExamined && item.alternateDescription) {
                messageText = item.alternateDescription;
            }

            const effects: Effect[] = [];

            // Build message with media support
            if (handler) {
                // CRITICAL: Evaluate handler conditions to determine success vs fail outcome
                const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
                const outcome = conditionsMet ? handler.success : handler.fail;
                const isFail = !conditionsMet;

                if (outcome) {
                    // Use outcome helper to extract message, media AND effects
                    effects.push(...buildEffectsFromOutcome(
                        { message: outcome.message || messageText, ...outcome },
                        visibleItemId,
                        'item',
                        game,
                        isFail
                    ));
                } else {
                    // No outcome available - fallback
                    effects.push({
                        type: 'SHOW_MESSAGE',
                        speaker: 'narrator',
                        content: messageText,
                        messageType: 'image',
                        imageId: visibleItemId
                    });
                }
            } else {
                // Fallback: standard message without outcome media
                effects.push({
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: messageText,
                    messageType: 'image',
                    imageId: visibleItemId
                });
            }

            if (!isAlreadyExamined) {
                effects.push({
                    type: 'SET_FLAG',
                    flag,
                    value: true
                });
            }

            // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
            const focusEffect = FocusManager.determineNextFocus({
                action: 'examine',
                target: visibleItemId,
                targetType: 'item',
                actionSucceeded: true,
                currentFocus: state.currentFocusId,
                state,
                game
            });

            if (focusEffect) {
                effects.push(focusEffect);
            }

            return effects;
        }
    } else if (bestMatch?.category === 'object') {
        const targetObjectId = bestMatch.id as GameObjectId;
        const targetObject = game.gameObjects[targetObjectId];
        if (!targetObject) {
            const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: message
            }];
        }

        // Debug logging for bookshelf/door
        logEntityDebug('EXAMINE START', targetObjectId, state, game);

        const flag = examinedObjectFlag(targetObject.id);
        const hasBeenExamined = GameStateManager.hasFlag(state, flag);

        // Get effective description (with stateMap support)
        let messageContent = HandlerResolver.getEffectiveDescription(targetObject, state);

        // Check for onExamine handler
        const handler = HandlerResolver.getEffectiveHandler(targetObject, 'examine', state, game);
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

        const effects: Effect[] = [];

        // Build message with media support
        if (handler) {
            // CRITICAL: Evaluate handler conditions to determine success vs fail outcome
            const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
            const outcome = conditionsMet ? handler.success : handler.fail;
            const isFail = !conditionsMet;

            if (outcome) {
                // Use outcome helper to extract message, media AND effects
                effects.push(...buildEffectsFromOutcome(
                    { message: outcome.message || messageContent, ...outcome },
                    targetObjectId,
                    'object',
                    game,
                    isFail
                ));
            } else {
                // No outcome available - fallback
                effects.push({
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: messageContent,
                    messageType: 'image',
                    imageId: targetObjectId
                });
            }
        } else {
            // Fallback: standard message without outcome media
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: messageContent,
                messageType: 'image',
                imageId: targetObjectId
            });
        }

        if (!hasBeenExamined) {
            effects.push({
                type: 'SET_FLAG',
                flag,
                value: true
            });
        }

        // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
        const focusEffect = FocusManager.determineNextFocus({
            action: 'examine',
            target: targetObjectId,
            targetType: 'object',
            actionSucceeded: true,
            currentFocus: state.currentFocusId,
            state,
            game
        });

        if (focusEffect) {
            effects.push(focusEffect);
        }

        return effects;
    }

    // GATED CONTENT CHECK: Before returning "not found", check if the player is trying to access
    // content that exists but isn't revealed yet (gated content)
    const { checkForGatedContent } = await import('@/lib/game/utils/gated-content-detector');
    const gatedCheck = checkForGatedContent(normalizedTarget, state, game);

    if (gatedCheck.isGated) {
        // Player is trying to examine something that exists but is blocked
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: gatedCheck.contextualMessage
        }];
    }

    // Not gated - truly not visible or doesn't exist
    const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: message
    }];
}

/**
 * Handle "examine X with/on Y" pattern (e.g., "check sd card on phone")
 */
async function handleExamineItemOnTarget(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedItemName = normalizeName(itemName);
    const normalizedTargetName = normalizeName(targetName);

    // Find the item
    const itemMatch = findBestMatch(normalizedItemName, state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: false,
        requireFocus: true
    });

    if (!itemMatch) {
        const smartMessage = getSmartNotFoundMessage(normalizedItemName, state, game, {
            searchInventory: true,
            searchVisibleItems: true,
            searchObjects: false
        });
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: smartMessage.found ? `You notice the ${normalizedItemName}, but it's not within reach right now.` : smartMessage.message
        }];
    }

    const itemId = itemMatch.id as ItemId;
    const item = game.items[itemId];

    // Find the target object
    const targetMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: false,
        requireFocus: true,
        searchObjects: true
    });

    if (!targetMatch || targetMatch.category !== 'object') {
        const smartMessage = getSmartNotFoundMessage(normalizedTargetName, state, game, {
            searchInventory: false,
            searchVisibleItems: false,
            searchObjects: true
        });
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: smartMessage.found ? `You notice the ${normalizedTargetName}, but it's not within reach right now.` : smartMessage.message
        }];
    }

    const targetObjectId = targetMatch.id as GameObjectId;
    const targetObject = game.gameObjects[targetObjectId];

    if (!targetObject) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `Can't use ${item.name} with ${targetName}.`
        }];
    }

    // Check for handlers in this order: onExamine, onUse, onRead
    // This allows examine/check to work like use/read for media items
    const examineHandlers = targetObject.handlers?.onExamine;
    const useHandlers = targetObject.handlers?.onUse;
    const readHandlers = targetObject.handlers?.onRead;

    // Try onExamine first (if it's an array of ItemHandlers)
    if (Array.isArray(examineHandlers)) {
        const specificHandler = examineHandlers.find((h: any) => h.itemId === itemId);
        if (specificHandler) {
            const conditionsMet = Validator.evaluateConditions(specificHandler.conditions, state, game);
            const outcome = conditionsMet ? specificHandler.success : specificHandler.fail;
            const isFail = !conditionsMet;

            if (outcome) {
                const effects: Effect[] = [];

                effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

                // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
                const focusEffect = FocusManager.determineNextFocus({
                    action: 'examine',
                    target: targetObjectId,
                    targetType: 'object',
                    actionSucceeded: !isFail,
                    currentFocus: state.currentFocusId,
                    state,
                    game
                });

                if (focusEffect) {
                    effects.push(focusEffect);
                }

                return effects;
            }
        }
    }

    // Fallback to onUse handlers (for "check sd card on phone" → plays video)
    if (Array.isArray(useHandlers)) {
        const specificHandler = useHandlers.find((h: any) => h.itemId === itemId);
        if (specificHandler) {
            const conditionsMet = Validator.evaluateConditions(specificHandler.conditions, state, game);
            const outcome = conditionsMet ? specificHandler.success : specificHandler.fail;
            const isFail = !conditionsMet;

            if (outcome) {
                const effects: Effect[] = [];

                effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

                // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
                const focusEffect = FocusManager.determineNextFocus({
                    action: 'examine',
                    target: targetObjectId,
                    targetType: 'object',
                    actionSucceeded: !isFail,
                    currentFocus: state.currentFocusId,
                    state,
                    game
                });

                if (focusEffect) {
                    effects.push(focusEffect);
                }

                return effects;
            }
        }
    }

    // Fallback to onRead handlers
    if (Array.isArray(readHandlers)) {
        const specificHandler = readHandlers.find((h: any) => h.itemId === itemId);
        if (specificHandler) {
            const conditionsMet = Validator.evaluateConditions(specificHandler.conditions, state, game);
            const outcome = conditionsMet ? specificHandler.success : specificHandler.fail;
            const isFail = !conditionsMet;

            if (outcome) {
                const effects: Effect[] = [];

                effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

                // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
                const focusEffect = FocusManager.determineNextFocus({
                    action: 'examine',
                    target: targetObjectId,
                    targetType: 'object',
                    actionSucceeded: !isFail,
                    currentFocus: state.currentFocusId,
                    state,
                    game
                });

                if (focusEffect) {
                    effects.push(focusEffect);
                }

                return effects;
            }
        }
    }

    // No handler found - default behavior: just describe both items
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You examine ${item.name} in the context of ${targetObject.name}. Nothing special stands out.`
    }];
}
