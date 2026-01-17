
'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver, FocusResolver, GameStateManager, FocusManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "@/lib/game/actions/handle-read";
import { buildEffectsFromOutcome, resolveConditionalHandler, evaluateHandlerOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { logEntityDebug } from "@/lib/game/utils/debug-helpers";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handleOpen(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const normalizedTargetName = normalizeName(targetName);

    // PRIORITY 1: Direct ID lookup (from AI) - skip fuzzy matching
    let bestMatch: { id: string; category: 'item' | 'object' | 'inventory' | 'visible-item' } | null = null;

    if (normalizedTargetName.startsWith('item_') && game.items[normalizedTargetName as ItemId]) {
        // Check if item is in inventory or visible
        if (state.inventory.includes(normalizedTargetName as ItemId)) {
            bestMatch = { id: normalizedTargetName, category: 'inventory' };
        } else {
            bestMatch = { id: normalizedTargetName, category: 'visible-item' };
        }
    } else if (normalizedTargetName.startsWith('obj_') && game.gameObjects[normalizedTargetName as GameObjectId]) {
        bestMatch = { id: normalizedTargetName, category: 'object' };
    }

    // PRIORITY 2: Fuzzy name matching (fallback for natural language)
    if (!bestMatch) {
        bestMatch = findBestMatch(normalizedTargetName, state, game, {
            searchInventory: false,
            searchVisibleItems: true,  // Check items (for readable items)
            searchObjects: true,
            requireFocus: true
        });
    }

    // 1. Handle objects (doors, containers, etc.)
    if (bestMatch?.category === 'object') {
        const targetObjectId = bestMatch.id as GameObjectId;
        const targetObject = game.gameObjects[targetObjectId];
        if (!targetObject) {
            const message = await MessageExpander.cantOpen(game.systemMessages.cantOpen, targetName);
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: message
            }];
        }

        // Check if object is openable
        if (targetObject.capabilities && !targetObject.capabilities.openable) {
            // Use custom fail message from onOpen handler if available
            const handler = resolveConditionalHandler(targetObject.handlers?.onOpen, state, game);
            if (handler?.fail?.message) {
                return [{
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: handler.fail.message
                }];
            }
            // Generic fallback for non-openable objects
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: targetObject.handlers?.defaultFailMessage || `You can't open the ${targetObject.name}.`
            }];
        }

        // Debug logging for bookshelf/door
        logEntityDebug('OPEN START', targetObjectId, state, game);

        // Use helper to resolve conditional handler (supports both arrays and single handlers)
        const handler = resolveConditionalHandler(targetObject.handlers?.onOpen, state, game);

        if (handler) {
            // Evaluate the handler's outcome based on conditions
            const { outcome, isFail } = evaluateHandlerOutcome(handler, state, game);

            if (outcome) {
                const effects: Effect[] = [];

                // Use helper to build effects with automatic media extraction
                effects.push(...buildEffectsFromOutcome(outcome, targetObjectId, 'object', game, isFail));

                // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
                const focusEffect = FocusManager.determineNextFocus({
                    action: 'open',
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

        // Generic fallback if no specific handler
        const effects: Effect[] = [];

        // Check if object is locked (use runtime state from GameStateManager)
        const runtimeState = GameStateManager.getEntityState(state, targetObjectId);
        const isLocked = runtimeState.isLocked === true;

        if (isLocked) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `The ${targetObject.name} is locked. You'll need to unlock it first.`
            }];
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

        // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
        const focusEffect = FocusManager.determineNextFocus({
            action: 'open',
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
