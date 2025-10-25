
'use server';

import type { CommandResult, Game, PlayerState } from "@/lib/game/types";
import { findItemInContext } from "@/lib/game/actions/helpers";
import { createMessage, processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";


export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = "Narrator";
    const agentName = game.narratorName || "Agent Sharma";
    const normalizedItemName = normalizeName(itemName);
    
    const itemToRead = findItemInContext(state, game, normalizedItemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't have an item called "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }
    
    let newState = JSON.parse(JSON.stringify(state)); // Deep copy for safety

    if (itemToRead.stateMap && Object.keys(itemToRead.stateMap).length > 0) {
        
        if (!newState.itemStates[itemToRead.id]) {
            newState.itemStates[itemToRead.id] = { readCount: 0 };
        }

        const liveItemState = newState.itemStates[itemToRead.id];
        const currentReadCount = liveItemState.readCount || 0;
        
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }
        
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = itemToRead.stateMap[currentStateKey];

        if (!stateMapEntry || typeof stateMapEntry.description !== 'string') {
            return { newState, messages: [createMessage('narrator', narratorName, "You try to read it, but the text is illegible.")] };
        }
        
        const description = stateMapEntry.description;
        newState.itemStates[itemToRead.id].readCount = currentReadCount + 1;
        
        const message = createMessage('narrator', narratorName, description);
        return { newState, messages: [message] };
    }

    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const effectsToProcess = Array.isArray(handler.success.effects) ? handler.success.effects : [];
        let result = processEffects(newState, effectsToProcess, game);
        
        if (handler.success.message) {
            const message = createMessage('narrator', narratorName, handler.success.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
