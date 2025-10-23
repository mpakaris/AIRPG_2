
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
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

    const liveItem = getLiveItem(itemToRead.id, state, game);
    if (!liveItem) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error finding item state.')] };
    }

    const currentStateId = liveItem.state.currentStateId || 'default';
    
    // Determine the effective handler by checking overrides first, then the base handler.
    const handlerOverride = liveItem.gameLogic.stateMap?.[currentStateId]?.overrides?.onRead;
    const baseHandler = liveItem.gameLogic.handlers?.onRead;
    const effectiveHandler = handlerOverride || baseHandler;

    // --- Definitive Safety Check ---
    // This block ensures that we never crash, even if the handler, success block, or effects array are missing.
    if (effectiveHandler && effectiveHandler.success) {
        const successBlock = effectiveHandler.success;
        const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
        
        let result = processEffects(state, effectsToProcess, game);
        
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        if (!hasMessageEffect && successBlock.message) {
            // Safely default sender to 'narrator' if not specified
            const sender = (successBlock as any).sender || 'narrator';
            const senderName = sender === 'agent' ? (game.narratorName || 'Agent') : narratorName;
            
            const message = createMessage(sender, senderName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        return result;
    }
    
    // If no specific handler or success block is found, use the item's description as the default content.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
