
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
    
    // Determine the effective handler by checking the stateMap override first, then the base handler.
    const handlerOverride = liveItem.gameLogic.stateMap?.[currentStateId]?.overrides?.onRead;
    const baseHandler = liveItem.gameLogic.handlers?.onRead;
    const effectiveHandler = handlerOverride || baseHandler;

    // --- BULLETPROOF SAFETY CHECKS ---
    // This block safely navigates the handler structure.
    if (effectiveHandler && effectiveHandler.success) {
        const successBlock = effectiveHandler.success;
        
        // Safely check for an effects array before processing. Default to an empty array if missing.
        const effectsToProcess = (Array.isArray(successBlock.effects)) ? successBlock.effects : [];
        let result = processEffects(state, effectsToProcess, game);
        
        // Check if there was an explicit SHOW_MESSAGE effect.
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        // Only add a message if one wasn't already added by an effect and a message exists.
        if (!hasMessageEffect && successBlock.message) {
            const sender = (successBlock as any).sender || 'narrator';
            const senderName = sender === 'agent' ? (game.narratorName || 'Agent') : narratorName;
            
            const message = createMessage(sender, senderName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        return result;
    }
    // --- END SAFETY CHECKS ---
    
    // If no specific handler or success block is found, use the item's description as the default content.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
