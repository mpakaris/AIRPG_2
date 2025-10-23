
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

    // --- Logic for stateful books with excerpts in stateMap ---
    if (itemToRead.stateMap && itemToRead.archetype === 'Book') {
        let newState = JSON.parse(JSON.stringify(state)); // Deep copy for mutation
        let liveItem = getLiveItem(itemToRead.id, newState, game);
        if (!liveItem) {
             return { newState: state, messages: [createMessage('system', 'System', 'Error finding item state.')] };
        }

        const newReadCount = (liveItem.state.readCount || 0) + 1;
        
        const stateKeys = Object.keys(itemToRead.stateMap);
        const numStates = stateKeys.length;
        const stateIndex = (newReadCount - 1) % numStates;
        const stateKey = stateKeys[stateIndex] || 'default';
        
        if (!newState.itemStates[itemToRead.id]) {
            newState.itemStates[itemToRead.id] = {} as ItemState;
        }
        newState.itemStates[itemToRead.id].readCount = newReadCount;
        newState.itemStates[itemToRead.id].currentStateId = stateKey;

        const messageContent = itemToRead.stateMap[stateKey]?.description || itemToRead.description;
        
        return { newState, messages: [createMessage('narrator', narratorName, messageContent)] };
    }
    
    // --- Logic for all other readable items (delegating to onRead handler) ---
    const onReadHandler = itemToRead.handlers?.onRead;
    
    if (onReadHandler && onReadHandler.success) {
        const effects = onReadHandler.success.effects || [];
        let result = processEffects(state, effects, game);

        const hasMessageEffect = effects.some(e => e.type === 'SHOW_MESSAGE');
        if (!hasMessageEffect && onReadHandler.success.message) {
             result.messages.unshift(createMessage('narrator', narratorName, onReadHandler.success.message, 'text'));
        }
        return result;
    }
    
    // Fallback for items that are readable but have no specific handler.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
