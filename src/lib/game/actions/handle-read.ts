
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, ItemState, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
import { createMessage, processEffects } from "./process-effects";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const itemToRead = findItemInContext(state, game, itemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    // If the item has a standard onRead handler and isn't a "stateful" book, use that.
    if (itemToRead.handlers.onRead && !itemToRead.stateMap) {
        const handler = itemToRead.handlers.onRead;
        // Safety check for the handler structure
        if (handler.success) {
            const effectsToProcess = Array.isArray(handler.success.effects) ? handler.success.effects : [];
            let result = processEffects(state, effectsToProcess, game);
            const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
            if (!hasMessageEffect && handler.success.message) {
                result.messages.unshift(createMessage('narrator', narratorName, handler.success.message, 'text'));
            }
            return result;
        }
    }

    // Logic for stateful books with excerpts in stateMap
    if (itemToRead.stateMap) {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy for mutation
        let liveItem = getLiveItem(itemToRead.id, newState, game);
        if (!liveItem) {
             return { newState: state, messages: [createMessage('system', 'System', 'Error finding item state.')] };
        }

        // Increment read count
        const newReadCount = (liveItem.state.readCount || 0) + 1;
        
        // Determine which state to use. We cycle through the states.
        const numStates = Object.keys(itemToRead.stateMap).length;
        const stateIndex = (newReadCount - 1) % numStates;
        const stateKey = Object.keys(itemToRead.stateMap)[stateIndex] || 'default';
        
        // Update the item's state in the new player state
        if (!newState.itemStates[itemToRead.id]) {
            newState.itemStates[itemToRead.id] = {} as ItemState;
        }
        newState.itemStates[itemToRead.id].readCount = newReadCount;
        newState.itemStates[itemToRead.id].currentStateId = stateKey;

        // Get the message from the stateMap
        const messageContent = itemToRead.stateMap[stateKey]?.description || itemToRead.description;
        
        return { newState, messages: [createMessage('narrator', narratorName, messageContent)] };
    }
    
    // Fallback for items that are readable but have no specific handler or stateMap
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
