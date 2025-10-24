

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "./handle-read";

export async function handleOpen(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
    const narratorName = "Narrator";
    const normalizedTargetName = normalizeName(targetName);

    // --- CORRECTED LOGIC ---
    // Get the dynamic list of visible objects from the player's state.
    const visibleObjectIds = state.locationStates[state.currentLocationId]?.objects || [];

    // First, try to find a GameObject with that name
    const targetObjectId = visibleObjectIds.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, state, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${normalizedTargetName}" to open.`)] };
        }
        
        if (liveObject.state.isLocked) {
            let lockMessage = liveObject.gameLogic.fallbackMessages?.locked || "It's locked.";
            if (liveObject.gameLogic.input?.hint) {
                lockMessage += `\n\n${liveObject.gameLogic.input.hint}`;
            }
            return { newState: state, messages: [createMessage('narrator', narratorName, lockMessage)] };
        }

        if (liveObject.state.isOpen) {
            const alreadyOpenMessage = liveObject.gameLogic.handlers.onExamine?.alternateMessage || "It's already open.";
            return { newState: state, messages: [createMessage('narrator', narratorName, alreadyOpenMessage)] };
        }
        
        if (!liveObject.gameLogic.capabilities.openable) {
            const notOpenableMessage = liveObject.gameLogic.fallbackMessages?.notOpenable || `You can't open the ${liveObject.gameLogic.name}.`;
            return { newState: state, messages: [createMessage('narrator', narratorName, notOpenableMessage)] };
        }

        const onOpen = liveObject.gameLogic.handlers.onOpen;

        // --- BULLETPROOF SAFETY CHECKS ---
        if (onOpen && onOpen.success) {
            const successBlock = onOpen.success;
            const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
            
            let result = processEffects(state, effectsToProcess, game);
            
            if (successBlock.message) {
                result.messages.unshift(createMessage('narrator', narratorName, successBlock.message));
            }
            
            return result;
        }

        // Fallback for objects that are openable but have no specific onOpen handler
        const genericOpenMessage = `You open the ${liveObject.gameLogic.name}.`;
        const newState = { ...state, objectStates: { ...state.objectStates, [liveObject.gameLogic.id]: { ...liveObject.state, isOpen: true } } };
        return { newState, messages: [createMessage('narrator', narratorName, genericOpenMessage)] };
    }

    // If no GameObject was found, try to find an Item (like a book)
    const itemToOpen = findItemInContext(state, game, normalizedTargetName);
    if (itemToOpen) {
        // Safely check if the item is readable before calling handleRead
        if (itemToOpen.capabilities && itemToOpen.capabilities.isReadable) {
            return handleRead(state, targetName, game);
        } else {
            return { newState: state, messages: [createMessage('narrator', narratorName, `You can't "open" the ${itemToOpen.name} in that way.`)] };
        }
    }

    // If neither an object nor an item was found
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${normalizedTargetName}" to open.`)] };
}

