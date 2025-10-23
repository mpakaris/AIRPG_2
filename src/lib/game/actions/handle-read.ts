
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

    // --- NEW ROBUST LOGIC ---
    // Check if there's a valid handler with a success block to execute.
    if (effectiveHandler && effectiveHandler.success) { 
        const successBlock = effectiveHandler.success;
        const effectsToProcess = successBlock.effects || [];
        
        let result = processEffects(state, effectsToProcess, game);
        
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        // If the handler is supposed to show a message but doesn't use an effect, create one.
        if (!hasMessageEffect && successBlock.message) {
            // Safely determine the sender, defaulting to 'narrator'.
            const sender = (successBlock as any).sender === 'agent' ? 'agent' : 'narrator';
            const senderName = sender === 'agent' ? (game.narratorName || 'Agent') : narratorName;
            
            const message = createMessage(
                sender,
                senderName,
                successBlock.message,
                'text'
            );
            result.messages.unshift(message);
        }
        
        return result;
    }
    
    // If no specific handler is found, use the item's description as the default content.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
