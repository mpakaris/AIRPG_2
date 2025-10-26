
'use server';

import type { Game, PlayerState, CommandResult, Item } from "@/lib/game/types";
import { findItemInContext } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";


export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = "Narrator";
    const agentName = game.narratorName || "Agent Sharma";
    const normalizedItemName = normalizeName(itemName);
    
    if (!normalizedItemName) {
        return { newState: state, messages: [createMessage('system', 'System', `You need to specify what to read.`)] };
    }

    const itemInContext = findItemInContext(state, game, normalizedItemName);

    if (!itemInContext) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read here.`)] };
    }
    
    const itemToRead = itemInContext.item;

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }
    
    if (itemToRead.stateMap && Object.keys(itemToRead.stateMap).length > 0) {
        const itemState = state.itemStates[itemToRead.id] || { readCount: 0 };
        const currentReadCount = itemState.readCount || 0;
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState: state, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }
        
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = itemToRead.stateMap[currentStateKey];

        if (!stateMapEntry || typeof stateMapEntry.description !== 'string') {
            return { newState: state, messages: [createMessage('narrator', narratorName, "You try to read it, but the text is illegible.")] };
        }
        
        const description = stateMapEntry.description;
        const message = createMessage('narrator', narratorName, description);

        const { newState } = await processEffects(state, [{ type: 'INCREMENT_ITEM_READ_COUNT', itemId: itemToRead.id }], game);
        
        return { newState, messages: [message] };
    }

    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const effectsToProcess = Array.isArray(handler.success.effects) ? handler.success.effects : [];
        let result = await processEffects(state, effectsToProcess, game);
        
        if (handler.success.message) {
            const message = createMessage('narrator', narratorName, handler.success.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
