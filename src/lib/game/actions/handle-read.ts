
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, Item, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";


export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const agentName = game.narratorName || "Agent Sharma";
    const normalizedItemName = normalizeName(itemName);
    const itemToRead = findItemInContext(state, game, normalizedItemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    // --- CASE 1: The item has a stateMap for cycling through descriptions (e.g., books) ---
    if (itemToRead.stateMap && itemToRead.state) {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy for safety
        
        let liveItemState = newState.itemStates[itemToRead.id];
        if (!liveItemState) {
            liveItemState = { 
                readCount: 0,
                currentStateId: 'default'
            };
            newState.itemStates[itemToRead.id] = liveItemState;
        }

        const currentReadCount = liveItemState.readCount || 0;
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        // Deflection logic: if read count exceeds available excerpts, give the canned response.
        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }
        
        // Determine which state to use
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = itemToRead.stateMap[currentStateKey];

        // Safety check for malformed data
        if (!stateMapEntry || typeof stateMapEntry.description !== 'string') {
            console.error(`Error: stateMap for ${itemToRead.id} is missing key or description for state '${currentStateKey}'`);
            return { newState, messages: [createMessage('narrator', narratorName, "You try to read it, but the text is illegible.")] };
        }
        
        const description = stateMapEntry.description;
        
        // Update the state with the new read count for the next time
        newState.itemStates[itemToRead.id].readCount = currentReadCount + 1;

        return { newState, messages: [createMessage('narrator', narratorName, description)] };
    }

    // --- CASE 2: The item has a standard onRead handler with effects (like notes or documents) ---
    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const successBlock = handler.success;
        // Safely get effects, defaulting to an empty array if they don't exist.
        const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
        
        let result = processEffects(state, effectsToProcess, game);
        
        // Safely check if a SHOW_MESSAGE effect was part of the processed effects.
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');

        // Only add a message if one wasn't already added by an effect and a message exists.
        if (!hasMessageEffect && successBlock.message) {
            const message = createMessage('narrator', narratorName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }

    // --- Fallback: Just show the item's default description if no specific read logic is found ---
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
