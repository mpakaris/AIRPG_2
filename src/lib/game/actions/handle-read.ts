
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, Item, PlayerState } from "../types";
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

    // --- Case 1: The item has a stateMap for cycling through descriptions ---
    if (itemToRead.stateMap && itemToRead.state) {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy
        
        let liveItemState = newState.itemStates[itemToRead.id];
        if (!liveItemState) {
            // Initialize if it doesn't exist
            liveItemState = { readCount: 0 };
            newState.itemStates[itemToRead.id] = liveItemState;
        }

        const currentReadCount = liveItemState.readCount || 0;
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        // Check if we have read all available excerpts
        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }
        
        // Determine which state to use
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = itemToRead.stateMap[currentStateKey];

        if (!stateMapEntry || !stateMapEntry.description) {
            console.error(`Error: stateMap for ${itemToRead.id} is missing key or description for state '${currentStateKey}'`);
            return { newState, messages: [createMessage('narrator', narratorName, "You read the book, but learn nothing new.")] };
        }
        
        const description = stateMapEntry.description;
        
        // Update the state with the new read count
        newState.itemStates[itemToRead.id].readCount = currentReadCount + 1;

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
