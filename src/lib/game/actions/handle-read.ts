

'use server';

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext } from "./helpers";
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
    
    let newState = JSON.parse(JSON.stringify(state)); // Deep copy for safety

    // --- Path A: Item uses a stateMap (like a book with excerpts) ---
    if (itemToRead.stateMap && Object.keys(itemToRead.stateMap).length > 0) {
        
        // Ensure the item has a state entry in playerState, initializing if it doesn't exist
        if (!newState.itemStates[itemToRead.id]) {
            newState.itemStates[itemToRead.id] = { 
                readCount: 0,
                currentStateId: 'default'
            };
        }

        const liveItemState = newState.itemStates[itemToRead.id];
        const currentReadCount = liveItemState.readCount || 0;
        
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        // Check if we've read all available excerpts and should show the deflection message
        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }
        
        // Get the current description from the stateMap
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
        
        // Return a simple message. This path explicitly avoids effects processing.
        const message = createMessage('agent', agentName, description);
        return { newState, messages: [message] };
    }

    // --- Path B: Item uses a standard onRead handler (like a note) ---
    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const successBlock = handler.success;
        // Safely get effects, defaulting to an empty array if they don't exist.
        const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
        
        let result = processEffects(newState, effectsToProcess, game);
        
        // Only add a message if one is defined in the success block.
        if (successBlock.message) {
            const message = createMessage('narrator', narratorName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }

    // --- Fallback: Just show the item's default description if no specific read logic is found ---
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}

