
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, ItemState, PlayerState } from "../types";
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

    const onReadHandler = itemToRead.handlers?.onRead;
    
    // --- Logic for stateful books with excerpts in stateMap ---
    if (itemToRead.stateMap && itemToRead.archetype === 'Book') {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy for mutation
        
        if (!newState.itemStates[itemToRead.id]) {
            newState.itemStates[itemToRead.id] = { readCount: 0, currentStateId: 'default' };
        }
        
        const liveItemState = newState.itemStates[itemToRead.id];
        const newReadCount = (liveItemState.readCount || 0) + 1;
        
        const stateKeys = Object.keys(itemToRead.stateMap);
        const numStates = stateKeys.length;
        const stateIndex = (newReadCount - 1) % numStates;
        const stateKey = stateKeys[stateIndex] || 'default';
        
        newState.itemStates[itemToRead.id].readCount = newReadCount;
        newState.itemStates[itemToRead.id].currentStateId = stateKey;

        const messageContent = itemToRead.stateMap[stateKey]?.description || itemToRead.description;
        
        return { newState, messages: [createMessage('narrator', narratorName, messageContent)] };
    }

    // --- Fallback logic for all other readable items ---
    if (onReadHandler && onReadHandler.success) {
        // This is the robust way: delegate to processEffects
        return processEffects(state, onReadHandler.success.effects || [], game);
    }
    
    // Default fallback for readable items with no specific handler.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
