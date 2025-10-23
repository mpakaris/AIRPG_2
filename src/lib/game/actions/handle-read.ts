
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, Item, ItemId, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const normalizedItemName = normalizeName(itemName);
    const itemToRead = findItemInContext(state, game, normalizedItemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    // --- Case 1: The item has a stateMap for cycling through descriptions ---
    if (itemToRead.stateMap && itemToRead.state) {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy
        
        let liveItemState = newState.itemStates[itemToRead.id];
        if (!liveItemState) {
            // Initialize if it doesn't exist
            liveItemState = { readCount: 0, currentStateId: 'read0' };
            newState.itemStates[itemToRead.id] = liveItemState;
        }

        const currentReadCount = liveItemState.readCount || 0;
        const nextReadCount = currentReadCount + 1;
        
        // Determine which state to use, cycling through the available states
        const stateMapKeys = Object.keys(itemToRead.stateMap);
        const currentStateKey = `read${currentReadCount % stateMapKeys.length}` as keyof typeof itemToRead.stateMap;
        
        const description = itemToRead.stateMap[currentStateKey]?.description || "You read the book, but learn nothing new.";

        // Update the state
        newState.itemStates[itemToRead.id].readCount = nextReadCount;

        return { newState, messages: [createMessage('narrator', narratorName, description)] };
    }

    // --- Case 2: The item has a standard onRead handler with effects ---
    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const effectsToProcess = Array.isArray(handler.success.effects) ? handler.success.effects : [];
        let result = processEffects(state, effectsToProcess, game);
        
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');

        if (!hasMessageEffect && handler.success.message) {
            const message = createMessage('narrator', narratorName, handler.success.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }

    // --- Fallback: Just show the item's default description ---
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}

    